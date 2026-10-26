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
  TeacherCreateInput,
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

export function composeAddress({
  street,
  villageName,
  districtName,
  regencyName,
  provinceName,
}: {
  street?: string;
  villageName?: string;
  districtName?: string;
  regencyName?: string;
  provinceName?: string;
}): string {
  return [street, villageName, districtName, regencyName, provinceName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');
}

export function normalizePhoneCountryCode(value: string): string {
  const digits = value.replace(/[^\d]/g, '');
  return digits ? `+${digits}` : '+62';
}

export function normalizePhoneNationalNumber(value: string): string {
  return value.replace(/[^\d]/g, '').replace(/^0+/, '');
}

export function composePhoneNumber(countryCode: string, nationalNumber: string): string {
  const normalizedCountryCode = normalizePhoneCountryCode(countryCode);
  const normalizedNationalNumber = normalizePhoneNationalNumber(nationalNumber);
  return normalizedNationalNumber ? `${normalizedCountryCode}${normalizedNationalNumber}` : '';
}

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
    phoneCountryCode: asString(data.phoneCountryCode) || '+62',
    phoneNationalNumber: asString(data.phoneNationalNumber),
    photoUrl: asString(data.photoUrl),
    headline: asString(data.headline),
    bio: asString(data.bio),
    languages: normalizeLanguages(data.languages),
    experienceYears: asNumber(data.experienceYears),
    lastEducation: asString(data.lastEducation),
    birthDate: asString(data.birthDate),
    birthPlace: asString(data.birthPlace),
    ktpStreet: asString(data.ktpStreet),
    ktpProvinceId: asString(data.ktpProvinceId),
    ktpProvinceName: asString(data.ktpProvinceName),
    ktpRegencyId: asString(data.ktpRegencyId),
    ktpRegencyName: asString(data.ktpRegencyName),
    ktpDistrictId: asString(data.ktpDistrictId),
    ktpDistrictName: asString(data.ktpDistrictName),
    ktpVillageId: asString(data.ktpVillageId),
    ktpVillageName: asString(data.ktpVillageName),
    ktpAddress: asString(data.ktpAddress),
    domicileSameAsKtp: asBoolean(data.domicileSameAsKtp),
    domicileStreet: asString(data.domicileStreet),
    domicileProvinceId: asString(data.domicileProvinceId),
    domicileProvinceName: asString(data.domicileProvinceName),
    domicileRegencyId: asString(data.domicileRegencyId),
    domicileRegencyName: asString(data.domicileRegencyName),
    domicileDistrictId: asString(data.domicileDistrictId),
    domicileDistrictName: asString(data.domicileDistrictName),
    domicileVillageId: asString(data.domicileVillageId),
    domicileVillageName: asString(data.domicileVillageName),
    domicileAddress: asString(data.domicileAddress),
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
  input: TeacherCreateInput,
  createdBy: string,
): Promise<Teacher> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const normalizedUsername = (input.username || normalizedEmail.split('@')[0]).trim().toLowerCase();
  const phoneCountryCode = normalizePhoneCountryCode(input.phoneCountryCode || '+62');
  const phoneNationalNumber = normalizePhoneNationalNumber(input.phoneNationalNumber);
  const phoneNumber = input.phoneNumber || composePhoneNumber(phoneCountryCode, phoneNationalNumber);

  const ktpAddress = composeAddress({
    street: input.ktpStreet,
    villageName: input.ktpVillageName,
    districtName: input.ktpDistrictName,
    regencyName: input.ktpRegencyName,
    provinceName: input.ktpProvinceName,
  });

  const domicileStreet = input.domicileSameAsKtp ? input.ktpStreet : (input.domicileStreet || '');
  const domicileProvinceId = input.domicileSameAsKtp ? input.ktpProvinceId : (input.domicileProvinceId || '');
  const domicileProvinceName = input.domicileSameAsKtp ? input.ktpProvinceName : (input.domicileProvinceName || '');
  const domicileRegencyId = input.domicileSameAsKtp ? input.ktpRegencyId : (input.domicileRegencyId || '');
  const domicileRegencyName = input.domicileSameAsKtp ? input.ktpRegencyName : (input.domicileRegencyName || '');
  const domicileDistrictId = input.domicileSameAsKtp ? input.ktpDistrictId : (input.domicileDistrictId || '');
  const domicileDistrictName = input.domicileSameAsKtp ? input.ktpDistrictName : (input.domicileDistrictName || '');
  const domicileVillageId = input.domicileSameAsKtp ? input.ktpVillageId : (input.domicileVillageId || '');
  const domicileVillageName = input.domicileSameAsKtp ? input.ktpVillageName : (input.domicileVillageName || '');
  const domicileAddress = composeAddress({
    street: domicileStreet,
    villageName: domicileVillageName,
    districtName: domicileDistrictName,
    regencyName: domicileRegencyName,
    provinceName: domicileProvinceName,
  });

  const address: TeacherAddressInput = {
    street: domicileStreet || input.ktpStreet,
    provinceId: domicileProvinceId || input.ktpProvinceId,
    provinceName: domicileProvinceName || input.ktpProvinceName,
    regencyId: domicileRegencyId || input.ktpRegencyId,
    regencyName: domicileRegencyName || input.ktpRegencyName,
    districtId: domicileDistrictId || input.ktpDistrictId,
    districtName: domicileDistrictName || input.ktpDistrictName,
    villageId: domicileVillageId || input.ktpVillageId,
    villageName: domicileVillageName || input.ktpVillageName,
    fullAddress: domicileAddress || ktpAddress,
  };

  const timestamp = new Date();

  const docPayload: Record<string, unknown> = {
    id: uid,
    uid,
    username: normalizedUsername,
    role: 'teacher',
    fullName: input.fullName.trim(),
    nickname: input.nickname.trim() || normalizedUsername,
    email: normalizedEmail,
    phoneNumber,
    phoneCountryCode,
    phoneNationalNumber,
    birthDate: input.birthDate.trim(),
    birthPlace: input.birthPlace.trim(),
    lastEducation: input.lastEducation.trim(),
    headline: input.headline?.trim() || '',
    bio: input.bio?.trim() || '',
    experienceYears: Number(input.experienceYears) || 0,
    languages: [],
    photoUrl: '',
    address,
    // Root level fields for client compatibility
    ktpStreet: input.ktpStreet.trim(),
    ktpProvinceId: input.ktpProvinceId,
    ktpProvinceName: input.ktpProvinceName,
    ktpRegencyId: input.ktpRegencyId,
    ktpRegencyName: input.ktpRegencyName,
    ktpDistrictId: input.ktpDistrictId,
    ktpDistrictName: input.ktpDistrictName,
    ktpVillageId: input.ktpVillageId,
    ktpVillageName: input.ktpVillageName,
    ktpAddress,
    domicileSameAsKtp: input.domicileSameAsKtp,
    domicileStreet: domicileStreet.trim(),
    domicileProvinceId,
    domicileProvinceName,
    domicileRegencyId,
    domicileRegencyName,
    domicileDistrictId,
    domicileDistrictName,
    domicileVillageId,
    domicileVillageName,
    domicileAddress,
    isProfileComplete: true,
    profileCompleted: true,
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy,
  };

  await setDoc(doc(db, 'users', uid), docPayload, { merge: false });

  return normalizeTeacher({ ...docPayload, createdAt: timestamp, updatedAt: timestamp }, uid);
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
