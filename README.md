![LKP SlangTech Admin Dashboard](./public/image.png)

# LKP SlangTech - Admin Dashboard

Dashboard operasional dan manajemen internal untuk **LKP SlangTech** (`manage.slangtech.asia`). Sistem ini digunakan oleh admin dan pengelola untuk memverifikasi pendaftaran kursus, mengatur jadwal belajar, mengelola data kelas dan event, serta mengontrol integrasi WhatsApp Gateway.

---

## Fitur Utama

- Verifikasi Pendaftaran & Pembayaran:
  - Meninjau berkas bukti transfer pendaftaran kelas dan event siswa.
  - Aksi persetujuan (Approve) atau penolakan (Reject) bukti pembayaran secara langsung.
  - Otomasi pengiriman email konfirmasi dan pesan WhatsApp ke nomor siswa saat pembayaran disetujui.
- Pengaturan Jadwal Belajar:
  - Menetapkan jadwal kelas, memilih pengajar, dan mencantumkan tautan tatap muka (Google Meet / Zoom).
  - Meninjau dan menyetujui permohonan perubahan jadwal (*reschedule*) yang diajukan siswa.
- Pengelolaan Katalog Kelas & Event:
  - Menambah, mengubah, dan menonaktifkan program kelas privat maupun grup.
  - Mengatur jadwal event, kuota peserta, dan informasi narasumber/trainer.
- Pusat Pengaturan WhatsApp Gateway:
  - Konfigurasi terpusat bot WhatsApp (nama bot, API key, dan nomor admin).
  - Fitur uji coba kirim pesan WhatsApp (*Live Test*) dan pencatatan riwayat pesan.
- Manajemen Akun Pengguna:
  - Pengelolaan hak akses Administrator, data profil Pengajar/Guru, dan rekap data Siswa.

---

## Tech Stack

- Framework: [Next.js](https://nextjs.org/) 16 (App Router, Server Actions, Turbopack)
- UI Library: [React](https://react.dev/) 19 & [Tailwind CSS](https://tailwindcss.com/)
- Komponen & Ikon: Radix UI Primitives, Lucide Icons, Shadcn UI
- Tabel & Grafik: TanStack Table & Recharts
- Database: Google Cloud Firestore (REST API & Firestore SDK)
- Media Storage: Cloudflare R2 (S3 Client v3)
- Layanan Email: Hostinger SMTP Client
- WhatsApp Gateway: Baselab WA Gateway API

---

## Arsitektur Aplikasi End-to-End

Berikut alur verifikasi operasional dari sisi Admin Dashboard, mulai dari admin login hingga pengiriman konfirmasi kelulusan pembayaran ke siswa:

```mermaid
flowchart TD
    Step1["1. Admin Login<br/><i>(Firebase Auth & Verifikasi Sesi Admin)</i>"]
    Step2["2. Tinjau Data Pendaftaran Masuk<br/><i>(Cek Bukti Bayar R2 & Data Form Firestore)</i>"]
    Step3["3. Verifikasi Pembayaran<br/><i>(Aksi Approve / Reject oleh Admin)</i>"]

    subgraph Step4["4. Pembaruan Status di Database"]
        direction TB
        S4_Status["Ubah Status Pendaftaran ke Confirmed<br/><i>(Firebase Firestore)</i>"]
        S4_Schedule["Buka Akses Penjadwalan Belajar<br/><i>(Penetapan Pengajar & Jadwal)</i>"]

        S4_Status --> S4_Schedule
    end

    subgraph Step5["5. Notifikasi Otomatis ke Siswa"]
        direction TB
        S5_WA["Pesan WhatsApp Konfirmasi Pembayaran Lunas<br/><i>(Baselab WA Gateway)</i>"]
        S5_Email["Email Resmi Bukti Lunas & Jadwal Belajar<br/><i>(Hostinger SMTP)</i>"]
    end

    Step1 --> Step2
    Step2 --> Step3
    Step3 --> S4_Status
    S4_Status --> Step5
```

---

### Rincian Alur dan Komponen Dashboard

Penjelasan bagaimana bagian-bagian dalam dashboard bekerja secara berurutan:

#### 1. Panel Kendali Utama (`dashboard/app/dashboard`)
Halaman antarmuka yang digunakan staf admin untuk memonitor operasional harian:
- Ringkasan Dashboard: Grafik rekap pendaftaran, jumlah siswa aktif, dan total transaksi masuk.
- Menu Pendaftaran Kelas & Event (`/enrollments`, `/event-enrollments`): Daftar antrean pendaftaran baru yang menunggu pengecekan bukti transfer.
- Menu Program Belajar (`/classes`, `/events`): Formulir untuk menambah kelas baru, mengganti silabus, mengatur harga promo, dan merilis jadwal event.
- Menu Pengguna (`/students`, `/teachers`, `/admins`): Database profil siswa, penugasan instruktur, serta manajemen akun tim admin.
- Menu WhatsApp Gateway (`/whatsapp`): Panel uji coba pengiriman pesan dan konfigurasi nomor bot.

#### 2. Layanan Verifikasi Pendaftaran (`features/enrollments`)
Bagian inti yang memproses persetujuan atau penolakan transaksi:
1. Menampilkan rincian pendaftaran siswa beserta foto bukti transfer yang diambil dari Cloudflare R2.
2. Ketika admin menekan tombol "Setujui", sistem memperbarui status transaksi di Firestore dari "Menunggu Konfirmasi" menjadi "Terkonfirmasi" (*confirmed*).
3. Secara otomatis memicu pengiriman notifikasi WhatsApp ke nomor siswa yang terdaftar.
4. Mengirim surat elektronik konfirmasi pembayaran dan rincian kelas ke email siswa.

#### 3. Layanan Penjadwalan dan Pengajar (`features/teachers` & jadwal kelas)
Bagian yang mengatur jalannya proses belajar mengajar pasca-pembayaran disetujui:
- Admin menentukan instruktur yang bertugas, tanggal pertemuan, dan tautan kelas online (Google Meet atau Zoom).
- Menangani pengajuan jadwal ulang (*reschedule request*) jika siswa meminta pemindahan waktu sesi belajar.
- Memantau presensi dan kehadiran siswa per pertemuan.

#### 4. Pengaturan Komunikasi WhatsApp (`features/whatsapp` & `lib/whatsapp`)
Bagian pengatur koneksi perpesanan otomatis:
- Menyimpan kredensial API Baselab secara aman pada koleksi database `whatsappSettings/primary`.
- Memungkinkan admin menguji coba pengiriman pesan langsung dari dashboard tanpa harus membuka aplikasi luar.
- Menyediakan riwayat log pengiriman pesan untuk memastikan pesan konfirmasi sampai ke ponsel siswa.

---

### Integrasi API Eksternal

| Layanan | Endpoint / Protokol | Digunakan Pada | Fungsi |
| :--- | :--- | :--- | :--- |
| Google Firebase Authentication | `identitytoolkit.googleapis.com`<br/>`/v1/accounts:signInWithPassword` | `/login`, `/lib/auth/server.ts` | Autentikasi sesi login admin dan verifikasi hak akses sebelum membuka dashboard. |
| Google Cloud Firestore REST API | `firestore.googleapis.com`<br/>`/v1/projects/{PROJECT_ID}/...` | `features/enrollments`<br/>`features/classes`<br/>`features/events`<br/>`features/whatsapp` | Operasi persetujuan status pendaftaran, manajemen data kelas, pengajar, siswa, dan konfigurasi bot. |
| Cloudflare R2 Storage | `{ACCOUNT_ID}.r2.cloudflarestorage.com`<br/>`/{BUCKET_NAME}/*` | `/api/upload`, `features/media` | Memuat gambar bukti transfer siswa serta mengunggah gambar banner kelas dan event baru. |
| Baselab WhatsApp Gateway | `api-wa.baselab.web.id`<br/>`/api/send-message` | `features/enrollments`<br/>`/api/whatsapp/test` | Pengiriman pesan WhatsApp konfirmasi pembayaran lunas ke nomor siswa dan fitur live test admin. |
| Hostinger SMTP Mail Server | `smtp.hostinger.com`<br/>`Port 465 (SSL) / 587 (TLS)` | `features/enrollments/payment-confirmation-email.ts` | Pengiriman email konfirmasi lunas dan panduan kelas langsung ke alamat email siswa. |
| API Daerah Indonesia | `api-daerah-indonesia.vercel.app`<br/>`/api/...` | `/api/regions` | Menyediakan data master provinsi, kabupaten/kota, dan kecamatan saat melengkapi profil instruktur baru. |

---

## Struktur Direktori

```text
dashboard/
├── app/                          # Rute halaman Next.js App Router & API internal
│   ├── api/                      # Route Handlers serverless
│   │   ├── auth/                 # Penanganan sesi cookie admin
│   │   ├── regions/              # Proxy data master wilayah Indonesia
│   │   ├── upload/               # Upload media promosi ke Cloudflare R2
│   │   └── whatsapp/             # Endpoint pengujian & sinkronisasi bot WhatsApp
│   ├── dashboard/                # Halaman panel kendali admin
│   │   ├── admins/               # Pengaturan akun tim pengelola
│   │   ├── classes/              # Manajemen katalog kelas dan kurikulum
│   │   ├── enrollments/          # Verifikasi pendaftaran & pembayaran kelas
│   │   ├── event-enrollments/    # Verifikasi pendaftaran peserta event
│   │   ├── events/               # Manajemen kegiatan workshop & webinar
│   │   ├── students/             # Direktori data siswa terdaftar
│   │   ├── teachers/             # Manajemen akun dan profil pengajar
│   │   └── whatsapp/             # Pengaturan gateway & log pesan WhatsApp
│   └── login/                    # Halaman masuk untuk staf administrator
├── components/                   # Komponen visual umum (Sidebar, Header, Modal, Tabel)
├── features/                     # Modul logika bisnis per domain
│   ├── admins/                   # Validasi dan mutasi data admin
│   ├── classes/                  # Aksi pembuatan & pembaruan kelas
│   ├── enrollments/              # Aksi verifikasi pembayaran, notifikasi, dan jadwal
│   ├── events/                   # Aksi pembuatan event dan monitoring kuota
│   ├── teachers/                 # Penugasan jadwal dan data profil instruktur
│   └── whatsapp/                 # Layanan koneksi dan pengujian gateway WhatsApp
├── lib/                          # Pustaka utilitas dan klien pihak ketiga
│   ├── auth/                     # Pengecekan sesi admin di sisi server
│   ├── email/                    # Klien pengiriman email SMTP
│   ├── firebase/                 # Inisialisasi Firebase & koneksi Firestore
│   └── whatsapp/                 # Klien integrasi Baselab WhatsApp Gateway
└── public/                       # Berkas statis dan logo LKP SlangTech
```

---

## Panduan Menjalankan

### 1. Instalasi Dependensi
```bash
npm install
```

### 2. Mode Pengembangan (Development)
```bash
npm run dev
```
Dashboard berjalan di [http://localhost:3001](http://localhost:3001).

### 3. Pengecekan Type & Test
```bash
npm run typecheck
```
```bash
npm run test
```

### 4. Kompilasi Produksi (Production Build)
```bash
npm run build
```
```bash
npm start
```
