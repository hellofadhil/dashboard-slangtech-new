import 'server-only';

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore/lite';
import app from '@/lib/firebase/config';
import type {
  Teacher,
  TeacherAddressInput,
  TeacherInput,
  TeacherStatus,
} from '@/features/teachers/types';
import { emptyTeacherAddressInput, emptyTeacherInput } from '@/features/teachers/types';
import {
  asBoolean,
  asDateValue,
  asNumber,
  asRecord,
  asString,
  removeUndefined,
} from '@/features/shared/firestore-data';

const db = getFirestore(app);

function normalizeTeacherStatus(value: unknown): TeacherStatus {
  return value === 'inactive' ? 'inactive' : 'active';
}

function normalizeTeacherAddress(value: unknown, rootData: Record<string, unknown> = {}): TeacherAddressInput {
  const data = asRecord(value);
  const fullAddress = asString(data.fullAddress)
    || asString(rootData.domicileAddress)
    || asString(rootData.ktpAddress);

  return {
    street: asString(data.street) || asString(rootData.domicileStreet) || asString(rootData.ktpStreet),
    provinceId: asString(data.provinceId) || asString(rootData.domicileProvinceId) || asString(rootData.ktpProvinceId),
    provinceName: asString(data.provinceName) || asString(rootData.domicileProvinceName) || asString(rootData.ktpProvinceName),
    regencyId: asString(data.regencyId) || asString(rootData.domicileRegencyId) || asString(rootData.ktpRegencyId),
    regencyName: asString(data.regencyName) || asString(rootData.domicileRegencyName) || asString(rootData.ktpRegencyName),
    districtId: asString(data.districtId) || asString(rootData.domicileDistrictId) || asString(rootData.ktpDistrictId),
    districtName: asString(data.districtName) || asString(rootData.domicileDistrictName) || asString(rootData.ktpDistrictName),
    villageId: asString(data.villageId) || asString(rootData.domicileVillageId) || asString(rootData.ktpVillageId),
    villageName: asString(data.villageName) || asString(rootData.domicileVillageName) || asString(rootData.ktpVillageName),
    fullAddress,
  };
}

function getAddressSearchFallback(address: TeacherAddressInput): string {
  return [
    address.street,
    address.villageName,
    address.districtName,
    address.regencyName,
    address.provinceName,
  ].filter(Boolean).join(', ');
}

function normalizeLanguages(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => asString(item).trim()).filter(Boolean)
    : [];
}

function normalizeTeacher(rawData: unknown, id: string): Teacher {
  const data = asRecord(rawData);
  const email = asString(data.email, id).trim().toLowerCase();
  const address = normalizeTeacherAddress(data.address, data);
  const username = asString(data.username) || asString(data.nickname) || email.split('@')[0];

  return {
    id: asString(data.id, id),
    uid: asString(data.uid, id),
    username,
    role: 'teacher',
    fullName: asString(data.fullName),
    nickname: asString(data.nickname, username),
    email,
    phoneNumber: asString(data.phoneNumber),
    photoUrl: asString(data.photoUrl),
    headline: asString(data.headline),
    bio: asString(data.bio),
    languages: normalizeLanguages(data.languages),
    experienceYears: asNumber(data.experienceYears),
    lastEducation: asString(data.lastEducation),
    birthDate: asString(data.birthDate),
    birthPlace: asString(data.birthPlace),
    address: {
      ...address,
      fullAddress: address.fullAddress || getAddressSearchFallback(address),
    },
    status: normalizeTeacherStatus(data.status),
    isProfileComplete: asBoolean(data.isProfileComplete || data.profileCompleted),
    createdAt: asDateValue(data.createdAt),
    updatedAt: asDateValue(data.updatedAt),
    createdBy: asString(data.createdBy) || undefined,
  };
}

function teacherInputToFirestore(input: TeacherInput): Record<string, unknown> {
  return removeUndefined(input) as Record<string, unknown>;
}

export function createEmptyTeacherInput(email: string): TeacherInput {
  return {
    ...emptyTeacherInput,
    email: email.trim().toLowerCase(),
    address: { ...emptyTeacherAddressInput },
  };
}

export async function getTeachers(): Promise<Teacher[]> {
  const snapshot = await getDocs(collection(db, 'users'));

  return snapshot.docs
    .filter((teacherDoc) => {
      const data = asRecord(teacherDoc.data());
      return asString(data.role).trim().toLowerCase() === 'teacher';
    })
    .map((teacherDoc) => normalizeTeacher(teacherDoc.data(), teacherDoc.id))
    .sort((a, b) => (
      (a.fullName || a.email).localeCompare(b.fullName || b.email) ||
      a.email.localeCompare(b.email)
    ));
}

export async function getTeacherById(id: string): Promise<Teacher | null> {
  const snapshot = await getDoc(doc(db, 'users', id));

  if (!snapshot.exists()) {
    return null;
  }

  const data = asRecord(snapshot.data());
  return asString(data.role).trim().toLowerCase() === 'teacher'
    ? normalizeTeacher(snapshot.data(), snapshot.id)
    : null;
}

export async function createTeacher(
  uid: string,
  email: string,
  createdBy: string,
  username?: string,
): Promise<Teacher> {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedUsername = (username || normalizedEmail.split('@')[0]).trim().toLowerCase();
  const input = createEmptyTeacherInput(normalizedEmail);
  input.nickname = normalizedUsername;
  const timestamp = new Date();
  const nextTeacher: Teacher = {
    id: uid,
    uid,
    username: normalizedUsername,
    role: 'teacher',
    ...input,
    isProfileComplete: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy,
  };

  await setDoc(doc(db, 'users', uid), {
    id: uid,
    uid,
    username: normalizedUsername,
    role: 'teacher',
    ...teacherInputToFirestore(input),
    isProfileComplete: false,
    profileCompleted: false,
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy,
  }, { merge: false });

  return nextTeacher;
}

export async function updateTeacher(id: string, input: TeacherInput): Promise<Teacher> {
  const updatedAt = new Date();
  const isProfileComplete = Boolean(input.fullName && input.phoneNumber && input.lastEducation);

  await updateDoc(doc(db, 'users', id), {
    ...teacherInputToFirestore(input),
    id,
    role: 'teacher',
    isProfileComplete,
    updatedAt: serverTimestamp(),
  });

  return {
    id,
    uid: id,
    role: 'teacher',
    ...input,
    isProfileComplete,
    createdAt: undefined,
    updatedAt,
  };
}

export async function deleteTeacher(id: string): Promise<void> {
  await deleteDoc(doc(db, 'users', id));
}
