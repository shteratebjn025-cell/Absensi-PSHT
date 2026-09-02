import { createServer as createHttpsServer } from 'https'
import { createServer as createHttpServer } from 'http'
import { readFileSync } from 'fs'
import { parse } from 'url'
import next from 'next'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const httpsPort = 3443
const httpPort = 3000

const app = next({ dev, hostname: '0.0.0.0', port: httpsPort })
const handle = app.getRequestHandler()

const httpsOptions = {
  key: readFileSync(join(__dirname, 'certificates/key.pem')),
  cert: readFileSync(join(__dirname, 'certificates/cert.pem')),
}

app.prepare().then(() => {
  // Server HTTPS utama
  createHttpsServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  }).listen(httpsPort, hostname, (err) => {
    if (err) throw err
    console.log('\n✅ HTTPS Server siap:')
    console.log('   Laptop : https://localhost:3443')
    console.log('   HP/Tab : https://192.168.1.13:3443')
    console.log('   Scanner: https://192.168.1.13:3443/scanner\n')
  })

  // Server HTTP — hanya untuk download CA certificate dan redirect
  createHttpServer((req, res) => {
    const url = parse(req.url, true)

    // Izinkan download CA certificate via HTTP
    if (url.pathname === '/rootCA.crt') {
      try {
        const ca = readFileSync(join(__dirname, 'public/rootCA.crt'))
        res.writeHead(200, {
          'Content-Type': 'application/x-x509-ca-cert',
          'Content-Disposition': 'attachment; filename="PSHT-CA.crt"',
          'Content-Length': ca.length,
        })
        res.end(ca)
      } catch {
        res.writeHead(404)
        res.end('Not found')
      }
      return
    }

    // Semua request lain redirect ke HTTPS
    res.writeHead(302, {
      Location: `https://192.168.1.13:3443${req.url}`,
    })
    res.end()
  }).listen(httpPort, hostname, (err) => {
    if (err) throw err
    console.log('📥 HTTP redirect aktif di port 3000')
    console.log('   Download CA: http://192.168.1.13:3000/rootCA.crt\n')
  })
})
