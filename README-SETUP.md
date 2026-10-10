# NEVHub — GitHub Pages + Google Sheets

## Isi paket
- `index.html`: portal mahasiswa
- `admin.html`: dashboard admin terpisah
- `styles.css`: tema merah, hitam, putih
- `nev-logo.png`: logo asli NEV
- `app.js`, `admin.js`: frontend yang memanggil Apps Script
- `Code.gs`: backend Google Apps Script
- `README-SETUP.md`: panduan deployment

## A. Siapkan Google Sheets + Apps Script
1. Login ke akun Google organisasi.
2. Buka https://script.google.com dan buat project baru bernama `NEVHub Backend`.
3. Ganti isi `Code.gs` dengan file `Code.gs` dari paket ini.
4. Jalankan fungsi `setup()` dari editor. Berikan izin akses Sheets dan Drive. Lihat **Execution log** untuk URL spreadsheet yang dibuat.
5. Jalankan fungsi `createAdmin("email-admin-anda@gmail.com","PASSWORD_MINIMAL_10_KARAKTER","Admin NEV")` dengan email/password milik Anda. Jalankan lagi untuk setiap admin; setiap admin punya akun sendiri.
6. Di **Project Settings**, set timezone ke `Asia/Jakarta`.
7. Deploy → New deployment → type **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone** (diperlukan agar GitHub Pages dapat memanggil endpoint; lindungi data lewat token dan jangan bagikan URL secara sembarang).
   - Deploy, izinkan akses, salin URL yang berakhir `/exec`.

## B. Hubungkan frontend
1. Buka `app.js`, ganti `PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_EXEC_URL_HERE` dengan URL `/exec`.
2. Buka `admin.js`, ganti placeholder yang sama dengan URL `/exec`.
3. Upload semua file frontend (`index.html`, `admin.html`, `styles.css`, `app.js`, `admin.js`, `nev-logo.png`) ke root repository GitHub.
4. Pastikan nama halaman utama `index.html`, lalu buka repository → Settings → Pages → Deploy from a branch → `main` → `/ (root)` → Save.
5. Tunggu GitHub Pages aktif. Buka URL Pages Anda. Google Apps Script URL harus tetap `/exec`.

## C. Uji
1. Buka portal user dan buat akun mahasiswa.
2. Login dengan NIM dan password.
3. Buka `admin.html`, login dengan akun admin yang dibuat pada langkah A.
4. Buat kegiatan dan atur persyaratan.
5. Daftar melalui portal user, lalu setujui melalui admin.
6. Periksa Google Sheets untuk melihat baris Users, Events, Applications. Dokumen disimpan ke folder Drive `NEVHub Private Uploads`.
7. Email persetujuan dikirim melalui GmailApp setelah admin menyetujui. Pada eksekusi pertama, Google dapat meminta otorisasi tambahan.

## D. Catatan penting
- Google Sheets adalah database prototype. Hindari data sangat sensitif; batasi akses spreadsheet dan folder Drive hanya kepada pengelola.
- Frontend memakai JSONP untuk komunikasi lintas domain. Hindari mengirim data sensitif di URL. Token sesi diberikan oleh backend; tetap gunakan HTTPS.
- Upload bukti masih prototipe: data file dikirim melalui endpoint JSONP, sehingga berkas besar dapat gagal karena batas URL. Untuk operasional, ubah upload menjadi alur POST yang aman atau gunakan form upload Apps Script/Drive; jangan gunakan bukti pembayaran sungguhan sebelum jalur upload diuji.
- Presensi saat ini baru memiliki endpoint dasar (`attendanceCheckIn`); UI presensi/QR, pembuatan token kegiatan, dan pemindaian belum selesai. Jangan anggap modul presensi siap operasional.
- Password di-hash SHA-256 untuk demo, tetapi untuk produksi sebaiknya gunakan layanan autentikasi yang dirancang khusus; jangan gunakan konfigurasi ini untuk data penting tanpa audit keamanan.
- Apps Script memiliki kuota eksekusi dan Gmail. Gunakan akun organisasi dan tinjau kuota Google.
- Bila mengubah `Code.gs`, Deploy → Manage deployments → Edit → Version: New version → Deploy. URL `/exec` umumnya tetap sama.
