# SlangTech Dashboard Design System (DESIGN.md)

## 1. Brand Identity & Personality
- **Name**: LKP SlangTech - Admin Management Portal
- **Domain**: Lembaga Kursus dan Pelatihan (LKP) Bahasa & Teknologi
- **Tone**: Profesional, bersih, efisien, modern, berwibawa namun bersahabat (*confident educational SaaS*).
- **Core Purpose**: Memberikan visibilitas operasional penuh untuk admin: pendaftaran, verifikasi pembayaran manual, penjadwalan kelas/sesi, dan manajemen event.

---

## 2. UI Dials
- **Energy (Scale 1-5)**: `3` — Seimbang antara fungsionalitas data operasional yang tenang dan sorotan aksi cepat (*action-oriented*).
- **Rhythm (Scale 1-5)**: `3` — Grid konsisten, pengelompokan modular berbasis kartu bento, ruang bernapas yang cukup antar seksi.
- **Motion (Scale 1-5)**: `2` — Transisi halus dan mikro (*subtle micro-interactions* pada hover, fokus, dan dropdown; tidak ada animasi berlebihan yang menghambat kerja admin).

---

## 3. Color Palette

### Brand Colors
- **Primary / SlangTech Emerald**: `#087A35` (HSL: 144, 88%, 25%)
- **Primary Hover / Deep Forest**: `#064E26`
- **Subtle Mint / Accent Background**: `#E9F7EF` (Light mode) / `#0A2E17` (Dark mode)
- **Primary Light Foreground**: `#FFFFFF`

### Neutral Scale
- **Canvas / Background**: `#F8FAFC` (Light) / `#0B1120` (Dark)
- **Card & Popover Surface**: `#FFFFFF` (Light) / `#111827` (Dark)
- **Card Subdued / Sidebar**: `#FFFFFF` (Light) / `#0F172A` (Dark)
- **Borders & Dividers**: `#E2E8F0` (Light) / `#1E293B` (Dark)
- **Text Headings / High Contrast**: `#0F172A` (Light) / `#F8FAFC` (Dark)
- **Text Body**: `#334155` (Light) / `#CBD5E1` (Dark)
- **Text Muted / Subdued**: `#64748B` (Light) / `#94A3B8` (Dark)

### Semantic & Feedback Colors
- **Urgent / Warning (Perhatian & Verifikasi Transfer)**:
  - Background: `#FFFBEB` (Light) / `#2D1E04` (Dark)
  - Border: `#FDE68A` (Light) / `#78350F` (Dark)
  - Text: `#B45309` (Light) / `#FBBF24` (Dark)
- **Success (Lunas, Aktif, Selesai)**:
  - Background: `#F0FDF4` (Light) / `#052E16` (Dark)
  - Border: `#BBF7D0` (Light) / `#166534` (Dark)
  - Text: `#15803D` (Light) / `#4ADE80` (Dark)
- **Destructive / Error (Ditolak, Batal, Kedaluwarsa)**:
  - Background: `#FEF2F2` (Light) / `#450A0A` (Dark)
  - Border: `#FECACA` (Light) / `#991B1B` (Dark)
  - Text: `#DC2626` (Light) / `#F87171` (Dark)
- **Info (Jadwal & Agenda)**:
  - Background: `#EFF6FF` (Light) / `#082F49` (Dark)
  - Border: `#BFDBFE` (Light) / `#0369A1` (Dark)
  - Text: `#1D4ED8` (Light) / `#60A5FA` (Dark)

---

## 4. Typography Scale
- **Display / Page Title**: `text-2xl font-bold tracking-tight text-foreground sm:text-3xl`
- **Section Title**: `text-lg font-semibold tracking-tight text-foreground`
- **Card Title / Metric Label**: `text-sm font-medium text-muted-foreground`
- **Stat Big Number**: `text-2xl font-bold tracking-tight text-foreground sm:text-3xl`
- **Body Regular**: `text-sm font-normal text-muted-foreground`
- **Small / Metadata / Tag**: `text-xs font-medium`

---

## 5. Elevation & Borders
- **Cards**: `border border-border/80 bg-card shadow-xs transition-shadow duration-200 hover:shadow-sm rounded-xl`
- **Action Highlight Cards**: `border-l-4 rounded-xl` dengan aksen warna semantik.
- **Pills & Badges**: `rounded-full px-2.5 py-0.5 text-xs font-semibold`
- **Focus Rings**: `ring-2 ring-primary/40 outline-none`

---

## 6. Antislop Design Rules Followed
1. **No generic 4-stat copy-paste**: Urgensi operasional dipisahkan ke dalam "Pusat Tindakan & Perhatian" yang actionable.
2. **Real Data First**: Tidak ada placeholder angka palsu atau chart dummy yang tidak berdasar. Semua memanfaatkan data real dari `getDashboardSummary()`.
3. **High Affordance**: Setiap metrik penting memiliki tautan langsung ke halaman terkait (misal: review transfer -> halaman pendaftaran).
4. **Structured Navigation**: Sidebar terbagi menjadi grup teratur (Utama, Operasional, Program, Sistem) dengan identitas brand yang tegas.
