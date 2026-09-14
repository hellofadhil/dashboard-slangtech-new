import 'server-only';

import {
  collection,
  getDocs,
  getFirestore,
} from 'firebase/firestore/lite';
import app from '@/lib/firebase/config';
import { normalizeUserProfileInputData } from '@/features/students/profile-data';
import type { Student } from '@/features/students/types';
import {
  asBoolean,
  asDateValue,
  asRecord,
  asString,
} from '@/features/shared/firestore-data';

const db = getFirestore(app);

function normalizeStudent(rawData: unknown, id: string): Student {
  const data = asRecord(rawData);
  const email = asString(data.email, id);
  const profile = normalizeUserProfileInputData(data, {
    emailFallback: email,
    fullNameFallback: email,
  });

  return {
    id: asString(data.id, id),
    ...profile,
    isProfileComplete: asBoolean(data.isProfileComplete),
    createdAt: asDateValue(data.createdAt),
    updatedAt: asDateValue(data.updatedAt),
  };
}

export async function getStudents(): Promise<Student[]> {
  const snapshot = await getDocs(collection(db, 'users'));

  return snapshot.docs
    .filter((userDoc) => {
      const data = asRecord(userDoc.data());
      const role = asString(data.role).trim().toLowerCase();
      return role === 'student' || role === '';
    })
    .map((userDoc) => normalizeStudent(userDoc.data(), userDoc.id))
    .sort((a, b) => a.fullName.localeCompare(b.fullName) || a.email.localeCompare(b.email));
}
