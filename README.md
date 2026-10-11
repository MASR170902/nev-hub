# NEVHub — Activity Management Portal (Fullstack)

NEVHub adalah aplikasi fullstack internal untuk mengelola kegiatan organisasi dari perencanaan, pendaftaran, presensi, hingga sertifikat dan pelaporan.

Aplikasi ini menggunakan arsitektur **Fullstack** yang simpel, ringan, dan **siap pakai tanpa perlu instalasi database server eksternal (zero configuration)**.

---

## 🛠️ Arsitektur & Teknologi

| Bagian | Teknologi | Keterangan |
| --- | --- | --- |
| **Frontend** | Next.js 16 + React 19 + TypeScript | UI modern, responsif, cepat (Port `3000`) |
| **Backend** | NestJS 12 + Express + TypeScript | REST API modular & terstruktur (Port `3001`) |
| **Database** | SQLite + Prisma ORM | File database lokal (`dev.db`), mandiri tanpa PostgreSQL/Docker |
| **Autentikasi** | JWT (JSON Web Token) + Bcrypt | Role-Based Access Control (RBAC) |
| **Styling** | Custom CSS terpadu | Nuansa identitas hitam, putih, dan merah NEVHub |

---

## 🚀 Cara Menjalankan (Sangat Mudah & Simpel)

Hanya membutuhkan **Node.js (versi 20+)** dan **npm**. Tidak perlu install PostgreSQL, Homebrew, atau Docker!

### 1. Masuk ke folder proyek
Pastikan file konfigurasi `.env` sudah ada (file `.env` default sudah disiapkan otomatis):
```sh
cp .env.example .env   # (jika belum ada file .env)
```

### 2. Setup Database & Akun Awal
Cukup jalankan satu perintah:
```sh
npm run setup
```
Perintah ini akan secara otomatis:
- Menyiapkan database SQLite (`dev.db`)
- Melakukan generate Prisma Client
- Melakukan seeding akun awal (Super Admin & Peserta Demo) serta contoh agenda kegiatan

### 3. Jalankan Aplikasi
```sh
npm run dev
```
Perintah ini akan menjalankan server **Backend (NestJS)** dan **Frontend (Next.js)** secara bersamaan:
- **Frontend Web**: Buka di browser [http://localhost:3000](http://localhost:3000)
- **Backend API**: Berjalan di [http://localhost:3001/api](http://localhost:3001/api)
- **Health Check API**: [http://localhost:3001/api/health](http://localhost:3001/api/health)

---

## 🔑 Akun Login Demo

Setelah menjalankan `npm run setup`, Anda dapat langsung login dengan akun berikut:

### 1. Akun Super Admin (Akses Penuh Pengelolaan)
- **Email**: `admin@nevhub.local`
- **Password**: `[REDACTED]`
- **Hak Akses**: Kelola agenda, review pendaftaran, presensi, sertifikat, manajemen user, keuangan, dan audit log.

### 2. Akun Peserta / Mahasiswa (Portal Peserta)
- **Email**: `peserta@nevhub.local`
- **Password**: `[REDACTED]`
- **Hak Akses**: Lihat katalog agenda, daftar kegiatan, cek status pendaftaran, dan cetak surat/sertifikat.

---

## 📋 Fitur Utama Sistem

1. **Autentikasi & Akun**:
   - Login JWT dengan masa berlaku sesi yang aman.
   - Pergantian password dan reset password akun.
   - Manajemen pengguna dan penugasan peran (Role).
2. **Katalog Agenda & Acara**:
   - Pembuatan dan pengelolaan kegiatan (Draft, Diterbitkan, Selesai, Dibatalkan).
   - Rundown terstruktur, kuota pendaftaran, dan tanggal kegiatan.
3. **Pendaftaran Kegiatan**:
   - Pendaftaran mandiri oleh peserta.
   - Review dan persetujuan oleh Admin Event.
   - Surat persetujuan peserta yang dapat dicetak langsung.
4. **Presensi & Check-in**:
   - Pencatatan kehadiran peserta oleh petugas presensi.
5. **Penerbitan Sertifikat**:
   - Penerbitan nomor seri sertifikat untuk peserta kegiatan yang telah selesai.
6. **Keuangan Organisasi**:
   - Pencatatan arus transaksi pemasukan dan pengeluaran kegiatan.
7. **Audit Log & Keamanan**:
   - Pencatatan riwayat setiap tindakan administratif penting di sistem.

---

## 📦 Perintah NPM Tersedia

- `npm run setup` — Inisialisasi database SQLite dan isi data awal (seed).
- `npm run dev` — Menjalankan Frontend dan Backend dalam mode pengembangan.
- `npm run build` — Melakukan kompilasi build produksi untuk backend dan frontend.
- `npm run start` — Menjalankan aplikasi dalam mode produksi.
- `npm run db:push` — Sinkronisasi skema Prisma ke database SQLite.
- `npm run db:seed` — Mengisi ulang akun awal dan data demo.
