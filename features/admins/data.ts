import 'server-only';

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  setDoc,
} from 'firebase/firestore/lite';
import app from '@/lib/firebase/config';
import type { AdminUser } from '@/features/admins/types';
import {
  asRecord,
  asString,
  nowIso,
  removeUndefined,
} from '@/features/shared/firestore-data';

const db = getFirestore(app);

function normalizeAdminUser(rawData: unknown, id: string): AdminUser {
  const data = asRecord(rawData);

  return {
    id,
    uid: asString(data.uid) || undefined,
    email: asString(data.email, id),
    createdAt: asString(data.createdAt, nowIso()),
    createdBy: asString(data.createdBy),
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const snapshot = await getDocs(collection(db, 'adminUsers'));
  return snapshot.docs
    .map((adminDoc) => normalizeAdminUser(adminDoc.data(), adminDoc.id))
    .sort((a, b) => a.email.localeCompare(b.email));
}

export async function getAdminUsersCount(): Promise<number> {
  const admins = await getAdminUsers();
  return admins.length;
}

export async function isAdminEmailAllowed(email: string): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email);
  const snapshot = await getDoc(doc(db, 'adminUsers', normalizedEmail));
  return snapshot.exists();
}

export async function createAdminUser(email: string, createdBy: string, uid?: string): Promise<AdminUser> {
  const normalizedEmail = normalizeEmail(email);
  const timestamp = nowIso();
  const nextAdmin: AdminUser = {
    id: normalizedEmail,
    uid,
    email: normalizedEmail,
    createdAt: timestamp,
    createdBy,
  };

  await setDoc(doc(db, 'adminUsers', normalizedEmail), removeUndefined(nextAdmin) as Record<string, unknown>, { merge: false });
  return nextAdmin;
}

export async function deleteAdminUser(email: string): Promise<void> {
  await deleteDoc(doc(db, 'adminUsers', normalizeEmail(email)));
}
