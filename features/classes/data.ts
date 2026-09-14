import 'server-only';

import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore/lite';
import app from '@/lib/firebase/config';
import type {
  Class,
  ClassInput,
  ClassType,
} from '@/features/classes/types';
import {
  asBoolean,
  asDateValue,
  asNumber,
  asRecord,
  asString,
  removeUndefined,
  normalizeLocalizedText,
} from '@/features/shared/firestore-data';

const db = getFirestore(app);

function normalizeClassType(value: unknown): ClassType {
  return value === 'group' ? 'group' : 'private';
}

function normalizeClass(rawData: unknown, id: string): Class {
  const data = asRecord(rawData);
  const rawImages = Array.isArray(data.images) ? data.images : [];

  return {
    id: asString(data.id, id),
    slug: asString(data.slug),
    name: normalizeLocalizedText(data.name),
    type: normalizeClassType(data.type),
    level: asString(data.level),
    price: asNumber(data.price),
    discountPrice: data.discountPrice === null || data.discountPrice === undefined
      ? null
      : asNumber(data.discountPrice),
    longDescription: normalizeLocalizedText(data.longDescription),
    totalSessions: asNumber(data.totalSessions),
    sessionDurationMinutes: asNumber(data.sessionDurationMinutes),
    coverImage: asString(data.coverImage),
    images: rawImages.map((imageRaw) => {
      const image = asRecord(imageRaw);
      return {
        url: asString(image.url, typeof imageRaw === 'string' ? imageRaw : ''),
        alt: asString(image.alt, asString(data.name ? asRecord(data.name).en : undefined)),
      };
    }).filter((image) => image.url),
    isActive: asBoolean(data.isActive, true),
    isFeatured: asBoolean(data.isFeatured),
    createdAt: asDateValue(data.createdAt),
    updatedAt: asDateValue(data.updatedAt),
  };
}

function getClassTimestamp(value: unknown): number {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  return 0;
}

function sortClasses(classes: Class[]): Class[] {
  return [...classes].sort((a, b) => (
    getClassTimestamp(b.createdAt) - getClassTimestamp(a.createdAt) ||
    a.name.id.localeCompare(b.name.id)
  ));
}

function classInputToFirestore(input: ClassInput): Record<string, unknown> {
  return removeUndefined(input) as Record<string, unknown>;
}

export async function getClasses(): Promise<Class[]> {
  try {
    const snapshot = await getDocs(query(
      collection(db, 'classes'),
      orderBy('createdAt', 'desc'),
    ));

    return snapshot.docs.map((classDoc) => normalizeClass(classDoc.data(), classDoc.id));
  } catch {
    const snapshot = await getDocs(collection(db, 'classes'));
    return sortClasses(snapshot.docs.map((classDoc) => normalizeClass(classDoc.data(), classDoc.id)));
  }
}

export async function getClassById(id: string): Promise<Class | null> {
  const snapshot = await getDoc(doc(db, 'classes', id));
  return snapshot.exists() ? normalizeClass(snapshot.data(), snapshot.id) : null;
}

export async function isClassSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  const classes = await getClasses();
  return classes.some((classItem) => classItem.slug === slug && classItem.id !== excludeId);
}

export async function createClass(input: ClassInput): Promise<Class> {
  const ref = doc(collection(db, 'classes'));
  const timestamp = new Date();
  const nextClass: Class = {
    id: ref.id,
    ...input,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await setDoc(ref, {
    ...classInputToFirestore(input),
    id: ref.id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return nextClass;
}

export async function updateClass(id: string, updates: ClassInput): Promise<Class> {
  const existing = await getClassById(id);
  if (!existing) {
    throw new Error('Kelas tidak ditemukan');
  }

  const updatedAt = new Date();
  await updateDoc(doc(db, 'classes', id), {
    ...classInputToFirestore(updates),
    id,
    subject: deleteField(),
    shortDescription: deleteField(),
    benefits: deleteField(),
    targetAudience: deleteField(),
    curriculum: deleteField(),
    badge: deleteField(),
    displayOrder: deleteField(),
    updatedAt: serverTimestamp(),
  });

  return {
    ...existing,
    ...updates,
    id,
    createdAt: existing.createdAt,
    updatedAt,
  };
}

export async function deleteClass(id: string): Promise<void> {
  await deleteDoc(doc(db, 'classes', id));
}
