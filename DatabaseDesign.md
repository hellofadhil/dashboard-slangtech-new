# Database Design

Dokumen ini menjelaskan struktur database dashboard SlangTech berdasarkan implementasi saat ini. Database utama menggunakan Firebase Firestore, sedangkan aset gambar disimpan di Cloudflare R2 dan hanya URL/key-nya yang direferensikan oleh dokumen Firestore.

## Konvensi Umum

```ts
type TimestampLike = Date | string | FirebaseFirestore.Timestamp;

type LocalizedText = {
  id: string;
  en: string;
  zh: string;
};

type ImageAsset = {
  url: string;
  alt: string;
};
```

Catatan:

- `createdAt` dan `updatedAt` pada data admin-created biasanya ditulis memakai `serverTimestamp()`.
- Beberapa flow enrollment memakai ISO string karena data bisa berasal dari client/user-facing app.
- ID dokumen disimpan ulang di field `id` untuk memudahkan normalisasi UI.
- Field optional yang `undefined` dibersihkan menjadi `null` atau dihapus sebelum disimpan.

## Collection Map

```ts
type FirestoreCollections = {
  users: UserDocument;
  adminUsers: AdminUserDocument;
  classes: ClassDocument;
  events: EventDocument;
  enrollments: ClassEnrollmentDocument | LegacyEventEnrollmentDocument;
  eventEnrollments: EventEnrollmentDocument;
  whatsappSettings: WhatsAppSettingsDocument;
  whatsappMessages: WhatsAppMessageDocument;

  // Legacy/read fallback untuk dashboard summary.
  payments?: LegacyPaymentDocument;
  schedules?: LegacyScheduleDocument;
  rescheduleRequests?: LegacyRescheduleRequestDocument;
};
```

## `users/{uid}`

Collection ini dipakai bersama untuk student dan teacher. Student dikenali dari `role === 'student'` atau role kosong, sedangkan teacher dikenali dari `role === 'teacher'`.

```ts
type UserRole = 'student' | 'teacher' | '';

type UserProfileInput = {
  fullName: string;
  nickname: string;
  phoneCountryCode: string;
  phoneNationalNumber: string;
  phoneNumber: string;
  email: string;
  birthDate: string;
  birthPlace: string;
  ktpStreet: string;
  ktpProvinceId: string;
  ktpProvinceName: string;
  ktpRegencyId: string;
  ktpRegencyName: string;
  ktpDistrictId: string;
  ktpDistrictName: string;
  ktpVillageId: string;
  ktpVillageName: string;
  ktpAddress: string;
  domicileSameAsKtp: boolean;
  domicileStreet: string;
  domicileProvinceId: string;
  domicileProvinceName: string;
  domicileRegencyId: string;
  domicileRegencyName: string;
  domicileDistrictId: string;
  domicileDistrictName: string;
  domicileVillageId: string;
  domicileVillageName: string;
  domicileAddress: string;
  lastEducation: string;
};

type StudentDocument = UserProfileInput & {
  id: string;
  uid?: string;
  role?: 'student' | '';
  displayName?: string;
  isProfileComplete: boolean;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
};

type TeacherStatus = 'active' | 'inactive';

type TeacherAddress = {
  street: string;
  provinceId: string;
  provinceName: string;
  regencyId: string;
  regencyName: string;
  districtId: string;
  districtName: string;
  villageId: string;
  villageName: string;
  fullAddress: string;
};

type TeacherDocument = {
  id: string;
  uid: string;
  role: 'teacher';
  fullName: string;
  nickname: string;
  email: string;
  phoneNumber: string;
  photoUrl?: string;
  headline: string;
  bio: string;
  languages: string[];
  experienceYears: number;
  lastEducation: string;
  address: TeacherAddress;
  status: TeacherStatus;
  isProfileComplete: boolean;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
  createdBy?: string;
};

type UserDocument = StudentDocument | TeacherDocument;
```

## `adminUsers/{email}`

Admin whitelist memakai email normalized lowercase sebagai document ID.

```ts
type AdminUserDocument = {
  id: string;
  uid?: string;
  email: string;
  createdAt: string;
  createdBy: string;
};
```

## `classes/{classId}`

```ts
type ClassType = 'private' | 'group';

type ClassDocument = {
  id: string;
  slug: string;
  name: LocalizedText;
  type: ClassType;
  level: string;
  price: number;
  discountPrice: number | null;
  longDescription: LocalizedText;
  totalSessions: number;
  sessionDurationMinutes: number;
  coverImage: string;
  images: ImageAsset[];
  isActive: boolean;
  isFeatured: boolean;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
};
```

Validasi penting:

- `slug` lowercase, angka, dan hyphen.
- `discountPrice` boleh `null`, tetapi tidak boleh lebih besar dari `price`.
- `totalSessions` dan `sessionDurationMinutes` minimal `1`.

## `events/{eventId}`

```ts
type EventPriceType = 'free' | 'paid';

type EventTrainer = {
  id: string;
  name: string;
};

type EventContact = {
  name: string;
  whatsappNumber: string;
};

type EventSession = {
  id: string;
  sessionNumber: number;
  title: string;
  startsAt: string;
  timezone: string;
  notes: string;
};

type EventDocument = {
  id: string;
  slug: string;
  name: LocalizedText;
  longDescription: LocalizedText;
  priceType: EventPriceType;
  price: number;
  sessions: EventSession[];
  startsAt: string;
  timezone: string;
  trainers: EventTrainer[];
  contact: EventContact;
  coverImage: string;
  images: ImageAsset[];
  isActive: boolean;
  isFeatured: boolean;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
};
```

Validasi penting:

- `priceType === 'free'` wajib `price === 0`.
- `priceType === 'paid'` wajib `price > 0`.
- Minimal satu `sessions` dan satu `trainers`.
- `startsAt` didenormalisasi dari sesi pertama untuk query dan ringkasan dashboard.

## `enrollments/{enrollmentId}`

Collection ini adalah collection utama untuk class enrollment. Masih ada dukungan legacy event enrollment di collection yang sama, sehingga data class enrollment dikenali dari `classId/classSnapshot` dan tidak memiliki `eventId/eventSnapshot`.

```ts
type EnrollmentStatus =
  | 'waiting_payment_confirmation'
  | 'confirmed'
  | 'cancelled'
  | 'completed';

type PaymentStatus =
  | 'waiting_confirmation'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'expired';

type ManualPaymentDetails = {
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  proofUrl: string;
  proofFileName: string;
  proofContentType: string;
  proofSize: number;
  uploadedAt: string;
  uploadResponse: string;
};

type GatewayPaymentDetails = {
  provider: string;
  transactionId: string;
  paymentUrl: string;
  expiresAt?: string;
};

type EnrollmentPayment =
  | {
      method: 'manual';
      status: 'waiting_confirmation' | 'paid' | 'failed';
      amount: number;
      currency: 'IDR';
      manual: ManualPaymentDetails;
      gateway: null;
      adminNote?: string | null;
      reviewedBy?: string | null;
      reviewedAt?: string | null;
    }
  | {
      method: 'payment_gateway';
      status: 'pending' | 'paid' | 'failed' | 'expired';
      amount: number;
      currency: 'IDR';
      manual: null;
      gateway: GatewayPaymentDetails;
      adminNote?: string | null;
      reviewedBy?: string | null;
      reviewedAt?: string | null;
    };

type EnrollmentClassSnapshot = {
  id: string;
  slug: string;
  name: LocalizedText;
  displayName: string;
  type: ClassType;
  level: string;
  price: number;
  discountPrice: number | null;
  selectedPrice: number;
  totalSessions: number;
  sessionDurationMinutes: number;
};

type ScheduleLocationType = 'online' | 'offline';
type ScheduleSessionStatus = 'scheduled' | 'rescheduled' | 'completed' | 'cancelled';
type EnrollmentScheduleStatus =
  | 'pending_admin_assignment'
  | 'assigned'
  | 'reschedule_requested'
  | 'completed'
  | 'cancelled';

type EnrollmentScheduleSession = {
  id: string;
  sessionNumber: number;
  title: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  teacherName: string;
  locationType: ScheduleLocationType;
  locationLabel: string;
  meetingUrl: string;
  status: ScheduleSessionStatus;
  notes: string;
};

type RescheduleRequestStatus =
  | 'pending_admin_approval'
  | 'approved'
  | 'rejected'
  | 'cancelled';

type ReschedulePreferredSlot = {
  startsAt: string;
  endsAt?: string | null;
  timezone: string;
  note?: string | null;
};

type EnrollmentRescheduleRequest = {
  id: string;
  status: RescheduleRequestStatus;
  requestedBy: string;
  requestedAt: string;
  targetSessionId: string;
  reason: string;
  preferredSlots: ReschedulePreferredSlot[];
  adminNote?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  approvedSession?: EnrollmentScheduleSession | null;
};

type EnrollmentSchedule = {
  status: EnrollmentScheduleStatus;
  timezone: string;
  assignedAt?: string | null;
  assignedBy?: string | null;
  startDate?: string | null;
  sessions: EnrollmentScheduleSession[];
  rescheduleRequest?: EnrollmentRescheduleRequest | null;
};

type ClassEnrollmentDocument = {
  id: string;
  uid: string;
  classId: string;
  classSlug: string;
  status: EnrollmentStatus;
  reason: string;
  studentSnapshot: Partial<UserProfileInput> & {
    uid?: string;
    displayName?: string;
  };
  classSnapshot: EnrollmentClassSnapshot;
  payment: EnrollmentPayment;
  schedule: EnrollmentSchedule | null;
  createdAt: string;
  updatedAt: string;
};
```

State transition utama:

- Manual payment `waiting_confirmation` dapat di-approve menjadi `payment.status = 'paid'` dan `status = 'confirmed'`.
- Setelah paid dan confirmed, admin dapat assign `schedule`.
- Jika semua session `completed`, enrollment menjadi `completed`.
- Reschedule request disimpan nested di `schedule.rescheduleRequest`.

## `eventEnrollments/{enrollmentId}`

Collection utama untuk event enrollment. Dashboard masih membaca legacy event enrollment dari `enrollments` juga, lalu deduplicate berdasarkan ID.

```ts
type EventEnrollmentStatus =
  | 'registered'
  | 'waiting_payment_confirmation'
  | 'confirmed'
  | 'cancelled'
  | 'completed';

type EventEnrollmentEventSnapshot = {
  id: string;
  slug: string;
  name: LocalizedText;
  displayName: string;
  priceType: EventPriceType;
  price: number;
  selectedPrice: number;
  startsAt: string;
  timezone: string;
  trainers: EventTrainer[];
  sessions: EventSession[];
};

type FreeEventPayment = {
  method: 'free';
  status: 'not_required';
  amount: 0;
  currency: 'IDR';
  manual: null;
  gateway: null;
};

type EventEnrollmentPayment = FreeEventPayment | EnrollmentPayment;

type EventEnrollmentDocument = {
  id: string;
  uid: string;
  eventId: string;
  eventSlug: string;
  status: EventEnrollmentStatus;
  reason: string;
  studentSnapshot: Partial<UserProfileInput> & {
    uid?: string;
    displayName?: string;
  };
  eventSnapshot: EventEnrollmentEventSnapshot;
  payment: EventEnrollmentPayment;
  createdAt: string;
  updatedAt: string;
};

type LegacyEventEnrollmentDocument = EventEnrollmentDocument;
```

Catatan snapshot:

- Saat event berubah, sistem dapat sync `eventSlug` dan `eventSnapshot` pada `eventEnrollments` dan legacy `enrollments`.
- Harga event tidak ikut diubah saat sync snapshot saat ini; sync fokus ke identity, nama, waktu, trainer, dan sessions.

## whatsappSettings/{settingsDocId}

Dokumen utama konfigurasi gateway: whatsappSettings/primary.

`	s
type WhatsAppSettingsDocument = {
  id: 'primary';
  baseUrl: string;
  userBot: string;
  apiKey: string;
  adminPhone?: string;
  updatedAt: TimestampLike | string;
  updatedBy: string;
};
`

## whatsappMessages/{messageLogId}

`	s
type WhatsAppMessageDocument = {
  id: string;
  phone: string;
  message: string;
  userBot: string;
  status: 'sent' | 'failed';
  messageId?: string;
  error?: string;
  requestedBy: string;
  response?: unknown;
  createdAt: TimestampLike | string;
};
`

## Legacy Summary Collections

Dashboard summary masih mencoba membaca collection lama berikut sebagai fallback. Data baru sebaiknya tetap mengikuti struktur nested di `enrollments`.

```ts
type LegacyPaymentDocument = {
  id: string;
  enrollmentId?: string;
  method?: string;
  status?: string;
  amount?: number;
  totalAmount?: number;
  total?: number;
  proofUrl?: string;
  paidAt?: TimestampLike;
  createdAt?: TimestampLike;
  updatedAt?: TimestampLike;
};

type LegacyScheduleDocument = {
  id: string;
  enrollmentId?: string;
  startsAt?: TimestampLike;
  date?: TimestampLike;
  startDate?: TimestampLike;
  scheduledAt?: TimestampLike;
  status?: string;
};

type LegacyRescheduleRequestDocument = {
  id: string;
  enrollmentId?: string;
  status?: string;
  requestedAt?: TimestampLike;
  reviewedAt?: TimestampLike;
  createdAt?: TimestampLike;
  updatedAt?: TimestampLike;
};
```

## R2 Object Storage

Firestore menyimpan URL gambar pada field `coverImage`, `images[].url`, `teachers.photoUrl`, atau bukti pembayaran manual. File fisik disimpan di Cloudflare R2.

```ts
type UploadFolder = 'classes' | 'events';

type R2StoredObject = {
  key: `${UploadFolder}/${string}.webp`;
  url: string;
  contentType: 'image/webp';
  metadata: {
    originalSize: string;
    compressedSize: string;
    quality: string;
    maxDimension: string;
  };
};
```

Aturan upload:

- Input gambar: JPEG, PNG, WebP, atau GIF.
- Maksimal input: 10 MB.
- Output dikompresi menjadi WebP.
- Object key berbentuk `{folder}/{uuid}-{slugified-original-name}.webp`.

## Relasi Data

```ts
type DatabaseRelations = {
  'users/{uid} -> enrollments.uid': 'student owner';
  'classes/{classId} -> enrollments.classId': 'class enrollment source';
  'events/{eventId} -> eventEnrollments.eventId': 'event enrollment source';
  'events/{eventId} -> enrollments.eventId': 'legacy event enrollment source';
  'users/{uid} -> enrollments.schedule.assignedBy': 'admin/teacher assignment actor';
  'adminUsers/{email}.uid -> users/{uid}': 'optional admin auth identity';
};
```

Snapshot fields seperti `studentSnapshot`, `classSnapshot`, dan `eventSnapshot` sengaja didenormalisasi agar riwayat enrollment tetap stabil walaupun data master berubah.

## Index yang Disarankan

Firestore single-field index default cukup untuk banyak query saat ini. Index berikut disarankan agar query dashboard lebih stabil saat data membesar:

```ts
type SuggestedFirestoreIndex =
  | { collection: 'classes'; fields: ['createdAt desc'] }
  | { collection: 'events'; fields: ['createdAt desc'] }
  | { collection: 'enrollments'; fields: ['createdAt desc'] }
  | { collection: 'eventEnrollments'; fields: ['createdAt desc'] }
  | { collection: 'eventEnrollments'; fields: ['eventId asc'] }
  | { collection: 'enrollments'; fields: ['eventId asc'] };
```

## Security Rules Direction

Rekomendasi high-level untuk rules:

- Public/client app hanya boleh membuat atau membaca data yang memang dibutuhkan user.
- Admin dashboard hanya boleh diakses oleh user Firebase Auth yang email-nya ada di `adminUsers`.
- Teacher hanya boleh membaca/mengubah profil sendiri kecuali admin.
- Field sensitif pembayaran dan schedule sebaiknya hanya dapat diubah oleh trusted server/admin action.
- Upload/delete R2 tetap lewat server action/API route, bukan langsung dari client ke bucket.

