# PRD: Perbaikan Kompatibilitas Mobile
**Proyek:** Absensi PSHT Bojonegoro  
**Tanggal:** 2 September 2026  
**Prioritas:** HIGH  

---

## 1. Ringkasan Masalah

Ada 3 kelompok masalah utama yang membuat aplikasi tidak berfungsi di HP:

| # | Masalah | Dampak | Root Cause |
|---|---------|--------|------------|
| 1 | Aplikasi tidak bisa dibuka di HP | Kritis — sistem lumpuh total | HTTPS self-signed cert tidak dipercaya browser HP |
| 2 | Tombol mata (toggle password) tidak bisa ditekan | Tinggi — admin tidak bisa login | Hit area terlalu kecil, `onPointerDown` + `e.preventDefault()` memblokir tap di beberapa browser mobile |
| 3 | Izin kamera tidak muncul / ditolak di HP | Kritis — scanner tidak berfungsi | Browser mobile butuh HTTPS + beberapa constraint kamera tidak optimal untuk mobile |

---

## 2. Analisa Detail per Masalah

---

### 2.1 Aplikasi Tidak Bisa Dibuka di HP

**Root Cause:**  
Aplikasi berjalan dengan `dev:https` menggunakan sertifikat self-signed dari `mkcert` (`certificates/key.pem` dan `cert.pem`). Browser di HP (Safari iOS, Chrome Android) **menolak sertifikat self-signed** kecuali CA-nya sudah diinstall secara manual di HP.

**Script yang digunakan:**
```
"dev:https": "next dev --experimental-https --hostname 0.0.0.0 --port 3443"
```

**Kendala tambahan:**
- `ca-server.mjs` sudah ada untuk distribusi CA cert (`http://192.168.1.13:3001/ca`), tapi IP `192.168.1.13` bisa berubah saat berganti jaringan
- File `public/rootCA.crt` belum tentu ada (ca-server.mjs mengembalikan 404 jika tidak ada)
- iOS memerlukan langkah tambahan setelah install cert: pergi ke Settings → General → About → Certificate Trust Settings dan aktifkan manual
- Tidak ada panduan di UI aplikasi sendiri untuk proses ini

**Bukti di kode (`ca-server.mjs`):**
```js
const caPath = join(__dirname, 'public/rootCA.crt')
// File ini tidak ada di repo → selalu 404
```

---

### 2.2 Tombol Mata Password Tidak Bisa Ditekan di HP

**Root Cause:**  
Di `app/(auth)/login/page.tsx`, toggle password menggunakan `<span role="button">` dengan handler `onPointerDown` + `e.preventDefault()`. Masalahnya:

1. **Hit area terlalu kecil**: tombol hanya `p-1` (4px padding) + ikon `h-4 w-4` (16px). Standar minimum touch target adalah **44×44px** (Apple HIG & WCAG 2.5.5).

2. **`e.preventDefault()` pada `onPointerDown`** dimaksudkan agar tidak trigger `onClick` dua kali, tapi di beberapa browser mobile (terutama Samsung Internet & beberapa versi Safari), ini justru **memblokir event touch seluruhnya**.

3. **`<span role="button">`** kurang ideal vs `<button type="button">` — beberapa mobile browser tidak memberi feedback tap yang sama.

**Kode bermasalah saat ini:**
```tsx
<span
  role="button"
  tabIndex={0}
  onPointerDown={(e) => {
    e.preventDefault()  // ← ini masalahnya di mobile
    setShowPass((v) => !v)
  }}
  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-1 cursor-pointer"
  // p-1 = 4px padding → hit area ~24px, terlalu kecil
>
```

---

### 2.3 Izin Kamera Bermasalah di HP

**Root Cause berlapis:**

**a) HTTPS wajib untuk `getUserMedia`**  
Browser mobile **hanya mengizinkan akses kamera via HTTPS** (atau localhost). Jika masalah 2.1 (sertifikat) belum fix, izin kamera tidak akan pernah diminta — halaman bahkan tidak bisa dibuka.

**b) Tidak ada penanganan permission state sebelum membuka kamera**  
`FaceScanner.tsx` langsung render `<Webcam>` tanpa cek status izin terlebih dahulu. Di HP, jika pengguna sudah pernah menolak izin, tidak ada mekanisme untuk memandu mereka membuka kembali izin tersebut.

**c) Video constraints tidak mempertimbangkan kamera belakang untuk scanner**  
Semua komponen menggunakan `facingMode: 'user'` (kamera depan). Ini umumnya sudah benar untuk scan wajah, namun beberapa Android entry-level memiliki kamera depan beresolusi rendah. Tidak ada fallback.

**d) MediaPipe memuat model dari CDN eksternal**  
```ts
// lib/face.ts
'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
'https://storage.googleapis.com/mediapipe-models/...'
```
Jika jaringan HP lambat atau CDN diblokir, model gagal dimuat tanpa pesan error yang jelas ke pengguna.

**e) `delegate: 'GPU'` bisa gagal di HP low-end**  
```ts
delegate: 'GPU'  // beberapa HP lama tidak support WebGL/WebGPU untuk MediaPipe
```
Ketika GPU delegate gagal, tidak ada fallback ke CPU, sehingga seluruh scanner crash diam-diam.

**f) Layout scanner tidak responsif**  
`FaceScanner.tsx` menggunakan `aspect-video w-full` yang OK, tapi `w-48 h-56` untuk oval panduan wajah bisa terlalu besar di layar HP kecil dan menutupi elemen lain.

---

## 3. Requirements / Task Perbaikan

### Task 1 — Fix Akses HTTPS di HP (Prioritas: KRITIS)

**Goal:** HP bisa membuka aplikasi tanpa warning sertifikat.

**Acceptance Criteria:**
- [ ] File `public/rootCA.crt` ada dan bisa didownload via `ca-server.mjs`
- [ ] Halaman `/` atau `/scanner` menampilkan **banner panduan** jika browser mendeteksi sertifikat tidak trusted (bisa dicek via `window.isSecureContext`)
- [ ] `ca-server.mjs` membaca IP lokal secara dinamis (tidak hardcode `192.168.1.13`)
- [ ] README/SETUP.md diupdate dengan langkah instalasi CA untuk Android & iOS step-by-step
- [ ] Atau: tambahkan halaman `/setup` di port HTTP (3001) yang menjelaskan cara install CA

**Implementasi:**
1. Generate `rootCA.crt` dengan `mkcert -CAROOT` lalu copy ke `public/`
2. Update `ca-server.mjs` untuk deteksi IP otomatis dengan `os.networkInterfaces()`
3. Tambah banner UI di halaman scanner jika `!window.isSecureContext`

---

### Task 2 — Fix Tombol Mata Password (Prioritas: TINGGI)

**Goal:** Toggle show/hide password bekerja dengan satu tap di semua HP.

**Acceptance Criteria:**
- [ ] Tombol mata bisa ditekan di iOS Safari, Chrome Android, Samsung Internet
- [ ] Hit area minimal 44×44px
- [ ] Tidak ada jeda atau double-trigger saat ditekan

**Implementasi:**
Ganti `<span role="button">` dengan `<button type="button">` dan perluas hit area:

```tsx
// SEBELUM (bermasalah)
<span
  role="button"
  onPointerDown={(e) => { e.preventDefault(); setShowPass(v => !v) }}
  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
>

// SESUDAH (fix)
<button
  type="button"
  onClick={() => setShowPass(v => !v)}
  className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 focus:outline-none"
  aria-label={showPass ? 'Sembunyikan password' : 'Tampilkan password'}
>
```

**Kenapa `onClick` dan bukan `onPointerDown`?**  
`onClick` di mobile browser sudah di-handle dengan benar untuk touch events. Tidak perlu `preventDefault` karena `type="button"` sudah memastikan tidak ada submit form.

---

### Task 3 — Fix Izin Kamera di HP (Prioritas: KRITIS)

**Goal:** Scanner kamera bekerja di HP dengan penanganan izin yang baik.

**Acceptance Criteria:**
- [ ] Sebelum membuka kamera, app cek status izin dengan `navigator.permissions.query`
- [ ] Jika izin ditolak, tampilkan instruksi cara membuka kembali (berbeda untuk iOS vs Android)
- [ ] Jika kamera tidak ada / error, tampilkan pesan yang actionable (bukan hanya "kamera tidak dapat diakses")
- [ ] MediaPipe fallback ke CPU delegate jika GPU gagal
- [ ] Loading state saat model MediaPipe sedang didownload ditampilkan ke user

**Implementasi:**

**3a. Cek permission sebelum render Webcam:**
```tsx
// Tambah di FaceScanner.tsx
const [camPermission, setCamPermission] = useState<'unknown'|'granted'|'denied'|'prompt'>('unknown')

useEffect(() => {
  navigator.permissions?.query({ name: 'camera' as PermissionName })
    .then(status => {
      setCamPermission(status.state)
      status.onchange = () => setCamPermission(status.state)
    })
    .catch(() => setCamPermission('unknown')) // iOS tidak support permissions API
}, [])
```

**3b. UI berdasarkan permission state:**
```tsx
if (camPermission === 'denied') {
  return <CameraPermissionGuide /> // komponen baru yang tampilkan panduan
}
```

**3c. Fix GPU delegate dengan fallback:**
```ts
// lib/face.ts — createLandmarker()
try {
  return await FaceLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: '...', delegate: 'GPU' },
    ...
  })
} catch {
  // fallback ke CPU jika GPU tidak support
  return await FaceLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: '...', delegate: 'CPU' },
    ...
  })
}
```

**3d. Bundle model MediaPipe secara lokal** (opsional, untuk jaringan lambat):
- Download `.task` file ke `public/models/`
- Ubah `modelAssetPath` ke path lokal

---

### Task 4 — Responsivitas Layout Mobile (Prioritas: SEDANG)

**Goal:** Semua halaman terlihat dan berfungsi baik di layar HP (320px–414px).

**Acceptance Criteria:**
- [ ] Halaman login tidak overflow horizontal di layar kecil
- [ ] Viewport meta tag ada (`width=device-width, initial-scale=1`)
- [ ] Oval panduan wajah di scanner tidak terlalu besar di HP kecil
- [ ] Dashboard sidebar bisa di-collapse di mobile

**Implementasi:**
1. Tambah viewport meta di `app/layout.tsx`:
```tsx
export const metadata: Metadata = {
  title: 'Absensi PSHT Bojonegoro',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  // atau lewat generateViewport()
}
```

2. Fix ukuran oval scanner jadi responsif:
```tsx
// SEBELUM
<div className="w-48 h-56 rounded-full border-2 border-dashed" />
// SESUDAH
<div className="w-36 h-44 sm:w-48 sm:h-56 rounded-full border-2 border-dashed" />
```

---

## 4. Urutan Pengerjaan yang Disarankan

```
Task 2 (30 menit) → Task 1 (1 jam) → Task 3a+3b (1 jam) → Task 3c+3d (1 jam) → Task 4 (30 menit)
```

**Alasan urutan:**
- Task 2 paling mudah dan tidak bergantung apapun — quick win
- Task 1 harus selesai sebelum Task 3 bisa ditest di HP sungguhan
- Task 3 adalah yang paling kompleks, kerjakan setelah infrastruktur HTTPS ok
- Task 4 adalah polish, bisa dikerjakan paralel atau belakangan

---

## 5. Checklist Testing di HP

Setelah semua task selesai, test manual dengan skenario berikut:

**Device:** Android Chrome + iOS Safari (minimal)

| Test | Expected | Pass? |
|------|----------|-------|
| Buka `https://[IP]:3443` tanpa install CA | Warning certificate, ada panduan install | |
| Buka setelah install CA | Halaman terbuka normal | |
| Tap ikon mata di form password | Password langsung show/hide | |
| Buka `/scanner` pertama kali | Browser minta izin kamera | |
| Tolak izin kamera, refresh | Muncul panduan cara aktifkan kembali | |
| Berikan izin kamera | Kamera aktif, wajah terdeteksi | |
| Scan wajah terdaftar | Absensi tercatat, nama muncul | |
| Scan di jaringan lambat | Ada loading indicator saat model download | |

---

## 6. Catatan Tambahan

- **`viewport` meta tag** tidak ada di `app/layout.tsx` saat ini — ini menyebabkan zoom-out otomatis di beberapa HP
- **`max-scale=1`** perlu dipertimbangkan hati-hati karena bisa mengganggu aksesibilitas (user yang butuh zoom)
- **iOS Safari** tidak mendukung `navigator.permissions.query` untuk kamera — harus handle dengan try/catch di `getUserMedia` secara langsung
- **Samsung Internet** kadang memblokir `onPointerDown + preventDefault` — selalu gunakan `onClick` untuk elemen interaktif sederhana
- Sertifikat dari `mkcert` berlaku **lokal saja** — jika aplikasi deploy ke production server, gunakan Let's Encrypt atau sertifikat resmi
