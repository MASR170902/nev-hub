# NEVHub — Panduan Setup & Uji Coba

Frontend: GitHub Pages (`index.html`, `admin.html`, `styles.css`, `app.js`, `admin.js`, `nev-logo.png`).
Backend: Google Apps Script (`Code.gs`) + Google Sheets + Google Drive.
`GAS_URL` di `app.js` dan `admin.js` sudah berisi URL `/exec` Anda; ganti hanya jika membuat deployment baru.

## A. Update backend (data lama aman)
1. Cadangkan spreadsheet NEVHub Database (File → Make a copy).
2. Ganti seluruh isi `Code.gs` di Apps Script dengan file baru, lalu **Save**.
3. Jalankan `setup()` sekali (menambah kolom + memformat kolom NIM/tanggal sebagai teks).
4. Jalankan `authorizeAll()` sekali dan setujui semua izin (Drive, Gmail, Sheets).
5. Deploy → Manage deployments → ✏️ Edit → Version: **New version** → Deploy. URL `/exec` tetap sama.
6. Belum punya admin? Jalankan `createAdmin("email@anda","PasswordMin10Karakter","Admin NEV")`.
   Lupa password admin? Jalankan `resetAdminPassword("email@anda","PasswordBaruMin10")`.
7. Project Settings → Timezone: `Asia/Jakarta`.

## B. Update frontend
Upload ulang `index.html`, `admin.html`, `styles.css`, `app.js`, `admin.js` ke GitHub, lalu hard refresh (`Ctrl+Shift+R`).

## C. Skenario uji (gunakan data dummy)
1. **Admin**: login di `admin.html` → Buat kegiatan (centang alasan + bukti foto; deadline ≥ hari ini; upload poster).
2. **Portal user**: buat akun (NIM contoh `22100001`) → logout → login ulang. Kegiatan + poster tampil, "Sisa kuota" benar.
3. Daftar kegiatan dengan foto besar (mis. 3 MB): file dikompres otomatis lalu diunggah bertahap (ada persentase).
4. Tombol kegiatan berubah menjadi **Sudah terdaftar**; "Pendaftaran Saya" menampilkan status *Menunggu*.
5. **Admin** → Riwayat pendaftaran → **Detail** → lihat bukti foto → **Setujui**. Email terkirim ke akun Google mahasiswa.
6. **User**: status *Disetujui*, buka & cetak surat (hanya surat yang tercetak), tautan WhatsApp muncul.
7. Admin hapus kegiatan → hilang dari daftar admin & portal. Admin ubah password mahasiswa → login dengan password baru.
8. Cek Sheets: NIM tidak berubah jadi angka, tanggal tidak mundur sehari.

## D. Perbaikan di versi ini
- Upload bukti user kini **bertahap (chunk)** — sebelumnya dikirim dalam satu URL sehingga hampir pasti gagal.
- NIM, tanggal, ID disimpan sebagai **teks** (mencegah NIM kehilangan angka 0 / login gagal, dan tanggal bergeser).
- Query Sheets tidak lagi dibaca berulang per baris → dashboard dan "Pendaftaran Saya" jauh lebih cepat.
- Kegiatan yang dihapus (Archived) tidak lagi tampil di admin; kuota terisi, deadline lewat, dan "sudah terdaftar" ditampilkan.
- Password baru memakai hash ber-salt (hash lama otomatis di-upgrade saat login); batas 5 kali gagal login per 15 menit.
- Token kedaluwarsa dibersihkan otomatis; sesi habis → logout otomatis; tombol Keluar mencabut token.
- Admin dapat melihat detail & bukti unggahan; CSV aman dari formula injection; link WhatsApp wajib `https://`.

## E. Batasan yang masih ada
- Presensi (`attendanceCheckIn`) belum punya UI — jangan dipakai operasional.
- JSONP mengirim data lewat URL: cukup untuk prototipe, belum untuk data/bukti pembayaran asli.
- Sheets sebagai database: batasi akses spreadsheet & folder Drive hanya untuk pengelola.
