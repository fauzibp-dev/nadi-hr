# Tutorial pemasangan Nadi HR — GitHub + Supabase + Vercel

Panduan ini untuk instalasi pertama dari file ZIP. Jalankan dulu di staging sebelum dipakai absensi karyawan sungguhan.

## 1. Ekstrak dan siapkan komputer

Butuh:

- Node.js 22 atau lebih baru
- Git
- Supabase CLI
- akun GitHub
- akun Supabase
- akun Vercel

Masuk ke folder project lalu:

```bash
cp .env.example .env.local
npm install
npm run verify:static
npm run typecheck
npm run lint
npm run build
```

`npm install` pertama akan membuat `package-lock.json`. Simpan dan commit file lock tersebut agar build berikutnya reproducible.

Untuk melihat UI tanpa database, biarkan:

```env
NEXT_PUBLIC_DEMO_MODE=true
```

Lalu:

```bash
npm run dev
```

Buka `http://localhost:3000`.

- `/employee` = portal karyawan
- `/admin` = HR / manager
- `/platform` = pemilik SaaS

## 2. Buat project Supabase

Buat project baru di Supabase Dashboard. Catat:

- Project URL
- Publishable key
- Service role / secret key
- Project reference
- Database password

Jangan pernah memasukkan service-role key ke source code atau variable yang diawali `NEXT_PUBLIC_`.

## 3. Isi `.env.local`

Contoh:

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEMO_MODE=false

FACE_VERIFICATION_MODE=evidence
FACE_VERIFICATION_WEBHOOK_URL=
FACE_VERIFICATION_WEBHOOK_SECRET=

NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
DEVICE_PEPPER=BUAT_SECRET_RANDOM_PANJANG
CRON_SECRET=BUAT_SECRET_RANDOM_LAIN
OUTBOUND_WEBHOOK_SECRET=
```

`DEVICE_PEPPER` dan `CRON_SECRET` harus berbeda dan sulit ditebak.

## 4. Hubungkan Supabase CLI

```bash
supabase login
supabase link --project-ref PROJECT_REF_ANDA
```

Lihat perubahan yang akan dijalankan:

```bash
supabase db push --dry-run
```

Jika benar:

```bash
supabase db push
```

Semua migration di `supabase/migrations/` sudah memakai format timestamp resmi dan harus dijalankan berurutan.

### Seed opsional untuk staging

```bash
supabase db push --include-seed
```

Seed membuat company contoh, office Solo, shift regular, leave type, plan, dan trial subscription. Jangan gunakan seed pada database production yang sudah berisi data customer.

## 5. Buat Super Admin pertama

Di Supabase Dashboard:

1. Authentication → Users.
2. Buat akun menggunakan email Anda.
3. Buka `scripts/bootstrap-superadmin.sql`.
4. Ganti `YOUR_EMAIL@example.com` dengan email tadi.
5. Jalankan script lewat SQL Editor.
6. Logout/login ulang.
7. Buka `/platform`.

Setelah itu tenant baru dapat dibuat dari Platform Console/API.

## 6. Buat customer pertama

Masuk `/platform/companies`, buat workspace perusahaan.

Setelah company ada, konfigurasi:

- branch
- office
- latitude / longitude
- radius
- maksimal GPS accuracy
- shift
- employee
- eligible office employee
- attendance policy

Untuk pilot Solo, titik awal policy yang masuk akal untuk diuji:

```text
Radius             50 meter
Max GPS accuracy   30 meter
Grace period       10 menit
Early check-in     30 menit
```

Jangan anggap angka itu universal. Tes di lokasi customer, terutama jika gedung tertutup atau bertingkat.

## 7. Device trust

Browser membuat token perangkat acak. Server hanya menyimpan hash menggunakan `DEVICE_PEPPER`.

Perangkat baru default **untrusted**. HR dapat menandainya trusted. Jika policy company `require_known_device=true`, absensi dari perangkat yang belum trusted ditolak.

Ini adalah browser device binding, bukan hardware attestation. Jangan menjanjikan bahwa mekanisme ini mustahil disalin.

## 8. Face / liveness

### Mode pilot

```env
FACE_VERIFICATION_MODE=evidence
```

Sistem mengambil kamera langsung + challenge dan menyimpan evidence privat. Mode ini **tidak mengklaim** wajah/liveness sudah terverifikasi secara biometrik.

### Mode production dengan verifier

```env
FACE_VERIFICATION_MODE=webhook
FACE_VERIFICATION_WEBHOOK_URL=https://provider-anda.example/verify
FACE_VERIFICATION_WEBHOOK_SECRET=secret-provider
```

Server mengirim signed URL evidence yang berlaku singkat. Verifier harus merespons:

```json
{
  "status": "verified",
  "score": 0.94
}
```

Setelah provider benar-benar diuji, baru aktifkan policy `require_face_provider=true`.

## 9. Google Maps

Google Maps hanya layer visual. Validasi radius tetap dilakukan PostgreSQL/PostGIS di server.

Isi:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
```

Batasi API key berdasarkan domain production di Google Cloud. Tanpa key, aplikasi memakai fallback map visual dan geofence tetap berfungsi.

## 10. Upload ke GitHub

Buat repository kosong di GitHub, lalu:

```bash
git init
git add -A
git commit -m "feat: initial HR attendance SaaS"
git branch -M main
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main
```

Pastikan file berikut **tidak** masuk GitHub:

```text
.env
.env.local
```

Simpan `.env.example` karena hanya berisi nama variable dan placeholder.

## 11. Import GitHub ke Vercel

1. Vercel → Add New → Project.
2. Pilih repository GitHub tadi.
3. Framework akan terdeteksi sebagai Next.js.
4. Tambahkan Environment Variables.
5. `NEXT_PUBLIC_DEMO_MODE=false` untuk production.
6. Deploy.

Variable production minimum:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_DEMO_MODE
FACE_VERIFICATION_MODE
DEVICE_PEPPER
CRON_SECRET
```

Tambahkan variable optional sesuai integrasi.

Setelah mendapat domain Vercel, ubah:

```env
NEXT_PUBLIC_APP_URL=https://domain-production-anda
```

Lalu redeploy.

## 12. Supabase Auth URL

Supabase Dashboard → Authentication → URL Configuration.

Set Site URL ke domain production dan tambahkan redirect:

```text
https://domain-production-anda/auth/callback
http://localhost:3000/auth/callback
```

## 13. Cron maintenance

`vercel.json` mendaftarkan:

```text
/api/cron/maintenance
```

Cron menjalankan finalisasi absent, usage aggregation, dan lifecycle trial. Endpoint hanya menerima request dengan `CRON_SECRET`.

Tes lokal:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/maintenance
```

## 14. Checklist sebelum customer memakai

Jalankan:

```bash
npm run verify:static
npm run typecheck
npm run lint
npm run build
```

Lalu tes manual:

- Company A tidak dapat melihat Company B.
- employee tidak dapat membuka `/admin`.
- HR tidak dapat membuka `/platform`.
- titik di luar radius ditolak.
- GPS dengan accuracy buruk ditolak.
- challenge yang sudah digunakan tidak bisa dipakai ulang.
- user biasa tidak bisa memanggil RPC attendance final secara langsung.
- perangkat baru ditolak jika known-device policy aktif.
- device trusted diterima dan revoked device ditolak.
- check-in terlalu awal ditolak.
- night shift tetap dianggap satu work date.
- jadwal `off` tidak dapat check-in.
- approval multi-step maju satu step per keputusan.
- leave/sick/izin yang approved mengubah daily status.
- cron membuat `absent` untuk jadwal kemarin yang tidak memiliki attendance/absence.
- evidence bucket tidak publik.
- mobile Chrome dan Safari diuji pada perangkat nyata.

## 15. Workflow update setelah live

Buat branch:

```bash
git checkout -b feature/nama-fitur
```

Push branch ke GitHub. Vercel membuat Preview Deployment. Setelah lolos test, merge ke `main` untuk production.

Untuk perubahan database, selalu buat migration timestamp baru. Jangan mengubah schema production langsung dari Table Editor jika workflow migration sudah dipakai.

Dokumentasi lebih detail ada di `docs/DEPLOYMENT.md`, `docs/SECURITY.md`, dan `docs/TESTING.md`.
