/**
 * Server HTTP kecil untuk distribusi CA certificate ke HP.
 * Jalankan: node ca-server.mjs
 * Lalu di HP buka: http://<IP_LOKAL>:3001
 *
 * Server ini JUGA menampilkan QR code di terminal agar mudah scan dari HP.
 */
import { createServer } from 'http'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { networkInterfaces } from 'os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const caPath = join(__dirname, 'public/rootCA.crt')
const PORT = 3001

/**
 * Deteksi semua IP lokal non-loopback secara otomatis.
 * Mengembalikan array string IP.
 */
function getLocalIPs() {
  const nets = networkInterfaces()
  const results = []
  for (const iface of Object.values(nets)) {
    for (const net of iface) {
      if (net.family === 'IPv4' && !net.internal) {
        results.push(net.address)
      }
    }
  }
  return results.length > 0 ? results : ['127.0.0.1']
}

const localIPs = getLocalIPs()
const primaryIP = localIPs[0]

// ─── HTML halaman panduan ──────────────────────────────────────────────────────
function buildHTML(ips) {
  const appLinks = ips.map(ip =>
    `<a href="https://${ip}:3443" class="app-link">https://${ip}:3443</a>`
  ).join('<br>')

  const caLinks = ips.map(ip =>
    `<a href="http://${ip}:${PORT}/ca" class="btn-ca">⬇️ Download CA dari ${ip}</a>`
  ).join('\n')

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Panduan Install Sertifikat — PSHT Absensi</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0 }
    body { font-family: -apple-system, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; padding: 1.5rem }
    .card { background: #1e293b; border-radius: 1rem; padding: 1.5rem; max-width: 560px; margin: 0 auto }
    h1 { color: #f8fafc; font-size: 1.25rem; margin-bottom: .25rem }
    .sub { color: #94a3b8; font-size: .85rem; margin-bottom: 1.5rem }
    .section { margin-bottom: 1.5rem }
    .section h2 { color: #fbbf24; font-size: .8rem; text-transform: uppercase; letter-spacing: .08em; margin-bottom: .75rem }
    .btn-ca { display: block; background: #b91c1c; color: white; padding: .85rem 1.25rem; border-radius: .6rem; text-decoration: none; font-weight: 600; margin-bottom: .5rem; text-align: center }
    .btn-ca:hover { background: #991b1b }
    .app-link { color: #60a5fa; word-break: break-all; display: block; font-size: .9rem; margin-bottom: .25rem }
    .steps { list-style: none; counter-reset: steps }
    .steps li { counter-increment: steps; padding: .6rem 0 .6rem 2.5rem; position: relative; border-bottom: 1px solid #334155; font-size: .9rem; color: #cbd5e1 }
    .steps li:last-child { border-bottom: none }
    .steps li::before { content: counter(steps); position: absolute; left: 0; top: .6rem; background: #334155; color: #94a3b8; width: 1.5rem; height: 1.5rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: .75rem; font-weight: 700 }
    .tag { display: inline-block; background: #0f172a; color: #94a3b8; font-size: .75rem; padding: .2rem .5rem; border-radius: .3rem; font-family: monospace; margin: .15rem .1rem }
    .alert { background: #422006; border: 1px solid #92400e; border-radius: .5rem; padding: .75rem 1rem; font-size: .85rem; color: #fde68a; margin-bottom: 1rem }
    .badge-android { background: #14532d; color: #86efac; padding: .2rem .5rem; border-radius: .3rem; font-size: .75rem; font-weight: 600 }
    .badge-ios { background: #1e3a5f; color: #93c5fd; padding: .2rem .5rem; border-radius: .3rem; font-size: .75rem; font-weight: 600 }
    hr { border: none; border-top: 1px solid #334155; margin: 1.5rem 0 }
  </style>
</head>
<body>
  <div class="card">
    <h1>🔐 Setup PSHT Absensi di HP</h1>
    <p class="sub">Install sertifikat keamanan agar HP bisa membuka aplikasi</p>

    <div class="section">
      <h2>Langkah 1 — Download & Install CA Certificate</h2>
      ${caLinks}
    </div>

    <div class="section">
      <h2>Panduan Instalasi</h2>

      <p style="margin-bottom:.75rem"><span class="badge-android">Android (Chrome)</span></p>
      <ol class="steps">
        <li>Tap tombol download di atas</li>
        <li>Buka file <span class="tag">PSHT-CA.crt</span> yang terdownload</li>
        <li>Beri nama <span class="tag">PSHT Absensi</span>, pilih <strong>VPN and apps</strong></li>
        <li>Tap <strong>OK</strong> — selesai</li>
      </ol>

      <hr>

      <p style="margin-bottom:.75rem; margin-top:.75rem"><span class="badge-ios">iPhone / iPad (Safari)</span></p>
      <ol class="steps">
        <li>Tap tombol download di atas</li>
        <li>Muncul popup "Allow?" → tap <strong>Allow</strong></li>
        <li>Buka <strong>Settings → Profile Downloaded</strong> → Install</li>
        <li>Buka <strong>Settings → General → About → Certificate Trust Settings</strong></li>
        <li>Aktifkan toggle di bawah <span class="tag">mkcert</span> → tap <strong>Continue</strong></li>
      </ol>
    </div>

    <hr>

    <div class="section">
      <h2>Langkah 2 — Buka Aplikasi</h2>
      <div class="alert">⚠️ Pastikan HP dan komputer terhubung ke WiFi yang sama</div>
      <p style="font-size:.85rem; color:#94a3b8; margin-bottom:.5rem">Setelah install certificate, buka salah satu link berikut di browser HP:</p>
      ${appLinks}
    </div>
  </div>
</body>
</html>`
}

// ─── Server ───────────────────────────────────────────────────────────────────
createServer((req, res) => {
  if (req.url === '/ca') {
    if (!existsSync(caPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('CA file tidak ditemukan. Jalankan: mkcert -install\nLalu copy rootCA.pem ke public/rootCA.crt')
      return
    }
    const ca = readFileSync(caPath)
    res.writeHead(200, {
      'Content-Type': 'application/x-x509-ca-cert',
      'Content-Disposition': 'attachment; filename="PSHT-CA.crt"',
      'Content-Length': ca.length,
    })
    res.end(ca)
    return
  }

  // Halaman utama panduan
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(buildHTML(localIPs))

}).listen(PORT, '0.0.0.0', () => {
  console.log('\n╔══════════════════════════════════════════════════╗')
  console.log('║   PSHT Absensi — CA Certificate Server          ║')
  console.log('╠══════════════════════════════════════════════════╣')
  console.log(`║  Panduan HP:  http://${primaryIP}:${PORT}`.padEnd(51) + '║')
  localIPs.forEach(ip => {
    console.log(`║  Download CA: http://${ip}:${PORT}/ca`.padEnd(51) + '║')
  })
  console.log('╠══════════════════════════════════════════════════╣')
  console.log(`║  App URL:     https://${primaryIP}:3443`.padEnd(51) + '║')
  console.log('╚══════════════════════════════════════════════════╝')
  console.log('\n👉 Buka link "Panduan HP" di browser HP untuk instruksi lengkap\n')
})
