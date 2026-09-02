# Setup Aplikasi Absensi PSHT Bojonegoro

## Langkah 1: Setup Supabase

1. Buat project baru di [supabase.com](https://supabase.com)
2. Masuk ke **SQL Editor** → New Query
3. Copy-paste seluruh isi file `supabase-schema.sql` dan jalankan
4. Setelah selesai, pergi ke **Settings → API**
5. Copy **Project URL** dan **anon public key**

## Langkah 2: Konfigurasi Environment

Edit file `.env.local` di root project:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Langkah 3: Buat Akun Admin

1. Di Supabase dashboard → **Authentication → Users**
2. Klik **Add User** → isi email + password admin
3. Atau via SQL: gunakan `supabase.auth.signUp()` sekali saja

## Langkah 4: Jalankan Aplikasi (Lokal via HTTPS)

Aplikasi **wajib** berjalan via HTTPS agar kamera bekerja di HP.

### Terminal 1 — Jalankan app
```bash
npm install
npm run dev:https
```
Aplikasi berjalan di `https://0.0.0.0:3443`

### Terminal 2 — Jalankan CA server (untuk setup HP)
```bash
npm run ca-server
```

---

## Setup HP (Wajib agar browser HP percaya sertifikat)

Sertifikat self-signed perlu diinstall sekali di setiap HP.

### 1. Pastikan HP dan komputer di WiFi yang sama

### 2. Buka panduan di browser HP
```
http://[IP_KOMPUTER]:3001
```
IP komputer terlihat di output `npm run ca-server`. Contoh: `http://172.20.10.3:3001`

### 3. Install sertifikat

**Android (Chrome):**
1. Tap **Download CA** di halaman panduan
2. Buka file `.crt` yang terdownload
3. Beri nama `PSHT Absensi`, pilih **VPN and apps** → OK

**iPhone / iPad (Safari):**
1. Tap **Download CA** di halaman panduan
2. Muncul popup → tap **Allow**
3. Buka **Settings → Profile Downloaded** → **Install**
4. Buka **Settings → General → About → Certificate Trust Settings**
5. Aktifkan toggle `mkcert...` → tap **Continue**

### 4. Buka aplikasi di HP
```
https://[IP_KOMPUTER]:3443
```

> ⚠️ **Catatan**: Sertifikat dibuat untuk IP tertentu. Jika berganti jaringan WiFi,
> IP komputer bisa berubah dan perlu generate ulang:
> ```bash
> mkcert -key-file certificates/key.pem -cert-file certificates/cert.pem \
>   localhost 127.0.0.1 [IP_BARU] ::1
> ```
> Lalu restart `npm run dev:https`.

---

## Halaman-Halaman

| URL | Fungsi |
|-----|--------|
| `/login` | Login admin |
| `/dashboard` | Statistik harian |
| `/anggota` | Kelola data anggota + import massal |
| `/absensi` | Scanner + log harian |
| `/laporan` | Cari & export XLSX |
| `/pengaturan` | Pengaturan jam & password |
| `/scanner` | Scanner publik (tanpa login) |
| `/tv` | Dashboard TV mode (fullscreen) |

## Alur Import Anggota

1. Pergi ke `/anggota`
2. Klik **Import Massal** → download template Excel
3. Isi template dengan kolom: `nomor_anggota`, `nama`, `tingkatan`, `cabang`
4. Upload file → preview → klik Import
5. Setelah import, klik icon **scan wajah** (📷) di setiap anggota untuk daftarkan wajah
6. Pilih: ambil dari kamera langsung, atau upload foto

## Troubleshooting HP

| Masalah | Solusi |
|---------|--------|
| Browser bilang "not secure" / tidak bisa buka | Install sertifikat CA (lihat panduan di atas) |
| Tombol izin kamera tidak muncul | Pastikan buka via `https://` bukan `http://` |
| Kamera ditolak / layar hitam | Di browser HP, tap ikon kunci di address bar → ubah izin kamera ke Allow |
| Scanner lambat pertama kali | Normal — model AI sedang download (~10MB). Tunggu loading selesai |
| Wajah tidak terdeteksi | Pastikan pencahayaan cukup dan wajah menghadap kamera |

## Deploy ke Cloudflare Pages

1. Push project ke GitHub
2. Di Cloudflare Pages → Connect to Git → pilih repo
3. Build command: `npm run build`
4. Output directory: `.next`
5. Tambahkan environment variables yang sama dengan `.env.local`
6. Di production (HTTPS resmi), sertifikat mkcert tidak diperlukan
