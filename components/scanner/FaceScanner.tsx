'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import Webcam from 'react-webcam'
import { Camera, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { extractEmbedding, setFaceLoadCallback } from '@/lib/face'
import { createClient } from '@/lib/supabase/client'
import { cn, formatWaktu } from '@/lib/utils'
import { CameraPermissionGuide } from './CameraPermissionGuide'
import type { AbsensiLog, Anggota } from '@/types'

type ScanState = 'idle' | 'scanning' | 'success' | 'duplicate' | 'not_found' | 'error'
type CamState = 'loading' | 'granted' | 'denied' | 'insecure' | 'error'

interface LastScan {
  anggota: Anggota
  log: AbsensiLog
  similarity: number
}

interface FaceScannerProps {
  lokasiKiosk?: string
  adminId?: string
  onScanSuccess?: (scan: LastScan) => void
  /** Mode TV: tidak tampilkan overlay info panjang */
  compact?: boolean
}

export function FaceScanner({
  lokasiKiosk = 'Kiosk Utama',
  adminId = 'admin',
  onScanSuccess,
  compact = false,
}: FaceScannerProps) {
  const webcamRef = useRef<Webcam>(null)
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [lastScan, setLastScan] = useState<LastScan | null>(null)
  const [message, setMessage] = useState('')
  const [isAutoMode, setIsAutoMode] = useState(true)
  const [camState, setCamState] = useState<CamState>('loading')
  const [camError, setCamError] = useState('')
  const [modelLoadMsg, setModelLoadMsg] = useState('')
  const [batasTerlambat, setBatasTerlambat] = useState('07:30') // cache dari Supabase
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isScanningRef = useRef(false) // guard — cegah scan tumpuk
  const batasRef = useRef('07:30')    // ref agar doScan tidak perlu re-create setiap batas berubah
  const supabase = createClient()

  // ── Ambil batas_terlambat dari Supabase app_settings ─────────────────────
  // Ini agar konsisten di semua device (bukan localStorage per-device)
  useEffect(() => {
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'batas_terlambat')
      .single()
      .then(({ data, error }) => {
        if (!error && data?.value) {
          setBatasTerlambat(data.value)
          batasRef.current = data.value
        } else {
          const local = localStorage.getItem('batas_terlambat')
          if (local) { setBatasTerlambat(local); batasRef.current = local }
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Cek HTTPS (wajib untuk kamera di mobile) ──────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setCamState('insecure')
      return
    }
    // Cek permission awal (tidak semua browser support ini, terutama Safari iOS)
    if (typeof navigator !== 'undefined' && navigator.permissions) {
      navigator.permissions
        .query({ name: 'camera' as PermissionName })
        .then((status) => {
          if (status.state === 'denied') {
            setCamState('denied')
          } else {
            // 'granted' atau 'prompt' — biarkan Webcam component yang minta izin
            setCamState('granted')
          }
          // Update realtime jika user ubah izin dari luar
          status.onchange = () => {
            if (status.state === 'denied') setCamState('denied')
            else setCamState('granted')
          }
        })
        .catch(() => {
          // Safari iOS tidak support permissions API → langsung coba buka kamera
          setCamState('granted')
        })
    } else {
      setCamState('granted')
    }
  }, [])

  // ── Pasang callback loading model MediaPipe ────────────────────────────────
  useEffect(() => {
    setFaceLoadCallback((msg) => setModelLoadMsg(msg ?? ''))
    return () => setFaceLoadCallback(null)
  }, [])

  const handleCameraError = useCallback((err: string | DOMException) => {
    const msg = err instanceof DOMException ? err.message : String(err)
    console.warn('Kamera error:', msg)

    if (
      msg.includes('Permission') ||
      msg.includes('NotAllowedError') ||
      msg.includes('denied')
    ) {
      setCamState('denied')
    } else {
      setCamState('error')
      setCamError(msg || 'Kamera tidak dapat diakses. Pastikan tidak dipakai aplikasi lain.')
    }
    setMessage('Kamera tidak dapat diakses.')
    setScanState('error')
  }, [])

  const handleRetry = useCallback(() => {
    setCamState('loading')
    setCamError('')
    setScanState('idle')
    setMessage('')
    // Delay sebentar lalu set ulang ke granted agar Webcam re-mount
    setTimeout(() => setCamState('granted'), 300)
  }, [])

  const doScan = useCallback(async () => {
    // Guard ganda: state + ref untuk cegah scan tumpuk
    if (isScanningRef.current) return
    const video = webcamRef.current?.video
    if (!video || video.readyState !== 4) return

    isScanningRef.current = true
    setScanState('scanning')
    setMessage('Mendeteksi wajah...')

    try {
      const embedding = await extractEmbedding(video)

      if (!embedding) {
        setScanState('not_found')
        setMessage('Wajah tidak terdeteksi. Pastikan wajah terlihat jelas.')
        isScanningRef.current = false
        setTimeout(() => setScanState('idle'), 2000)
        return
      }

      setMessage('Mencocokkan wajah...')

      const { data, error } = await supabase.rpc('match_face', {
        query_embedding: embedding,
        match_threshold: 0.68,  // threshold lebih ketat untuk kurangi false positive
        match_count: 3,         // ambil top-3 untuk cek confidence gap
      })

      if (error) throw error

      if (!data || data.length === 0) {
        setScanState('not_found')
        setMessage('Wajah tidak dikenal. Hubungi admin.')
        isScanningRef.current = false
        setTimeout(() => setScanState('idle'), 3000)
        return
      }

      const matched = data[0]

      // Cek confidence gap: jika ada kandidat ke-2 dan selisihnya < 0.06,
      // artinya sistem tidak cukup yakin — tolak untuk hindari salah identifikasi
      if (data.length > 1) {
        const gap = matched.similarity - data[1].similarity
        if (gap < 0.06) {
          setScanState('not_found')
          setMessage('Wajah tidak dapat dikenali dengan pasti. Coba lagi.')
          isScanningRef.current = false
          setTimeout(() => setScanState('idle'), 3000)
          return
        }
      }

      // Tolak jika similarity terlalu rendah meski lolos threshold DB
      if (matched.similarity < 0.72) {
        setScanState('not_found')
        setMessage('Wajah tidak dikenal. Hubungi admin.')
        isScanningRef.current = false
        setTimeout(() => setScanState('idle'), 3000)
        return
      }
      const today = new Date().toISOString().split('T')[0]

      const { data: existing } = await supabase
        .from('attendance_logs')
        .select('id, waktu_scan, status')
        .eq('anggota_id', matched.id)
        .eq('tanggal', today)
        .maybeSingle() // null kalau belum absen, tidak lempar error 406

      if (existing) {
        setScanState('duplicate')
        setMessage(`${matched.nama} sudah absen hari ini pukul ${formatWaktu(existing.waktu_scan)}`)
        isScanningRef.current = false
        setTimeout(() => setScanState('idle'), 4000)
        return
      }

      const now = new Date()
      const jam = now.getHours() * 60 + now.getMinutes()
      const [batasJam, batasMenit] = batasRef.current.split(':').map(Number)
      const batasLambat = batasJam * 60 + batasMenit
      const status = jam > batasLambat ? 'Terlambat' : 'Hadir'

      const { data: logData, error: logError } = await supabase
        .from('attendance_logs')
        .insert({
          anggota_id: matched.id,
          scanned_by: adminId,
          lokasi_kiosk: lokasiKiosk,
          status,
          tanggal: today,
        })
        .select('*, anggota:anggota_id(*)')
        .single()

      if (logError) throw logError

      const scanResult: LastScan = {
        anggota: logData.anggota as Anggota,
        log: logData as AbsensiLog,
        similarity: matched.similarity,
      }

      setLastScan(scanResult)
      setScanState('success')
      setMessage(`${matched.nama} — ${status}`)
      onScanSuccess?.(scanResult)
      isScanningRef.current = false
      setTimeout(() => setScanState('idle'), 4000)
    } catch (err) {
      console.error('Scan error:', err)
      setScanState('error')
      setMessage('Terjadi kesalahan. Coba lagi.')
      isScanningRef.current = false
      setTimeout(() => setScanState('idle'), 3000)
    }
  }, [adminId, lokasiKiosk, onScanSuccess, supabase])

  // Auto scan setiap 3 detik. Pakai isScanningRef (bukan scanState) sebagai guard
  // agar interval tidak di-reset terus saat state berubah
  useEffect(() => {
    if (isAutoMode && camState === 'granted') {
      intervalRef.current = setInterval(() => {
        if (!isScanningRef.current) doScan()
      }, 3000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isAutoMode, camState, doScan])

  const stateConfig: Record<
    ScanState,
    { border: string; overlay: string; icon: React.ReactNode }
  > = {
    idle: {
      border: 'border-white/30',
      overlay: 'bg-black/20',
      icon: <Camera className="h-8 w-8 text-white" />,
    },
    scanning: {
      border: 'border-yellow-400',
      overlay: 'bg-black/30',
      icon: <Loader2 className="h-8 w-8 text-yellow-400 animate-spin" />,
    },
    success: {
      border: 'border-green-400',
      overlay: 'bg-green-900/20',
      icon: <CheckCircle className="h-8 w-8 text-green-400" />,
    },
    duplicate: {
      border: 'border-yellow-400',
      overlay: 'bg-yellow-900/20',
      icon: <AlertCircle className="h-8 w-8 text-yellow-400" />,
    },
    not_found: {
      border: 'border-red-400',
      overlay: 'bg-red-900/20',
      icon: <XCircle className="h-8 w-8 text-red-400" />,
    },
    error: {
      border: 'border-red-600',
      overlay: 'bg-red-900/30',
      icon: <XCircle className="h-8 w-8 text-red-600" />,
    },
  }

  const cfg = stateConfig[scanState]

  // ── Tampilkan panduan jika kamera tidak bisa diakses ──────────────────────
  if (camState === 'insecure' || camState === 'denied' || camState === 'error') {
    return (
      <div className="rounded-2xl bg-gray-900 border border-gray-700">
        <CameraPermissionGuide
          reason={camState === 'error' ? 'error' : camState}
          errorMessage={camError}
          onRetry={handleRetry}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Kontrol header */}
      {!compact && (
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Kamera Scanner</h2>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); setIsAutoMode((v) => !v) }}
            onTouchEnd={(e) => { e.preventDefault(); setIsAutoMode((v) => !v) }}
            className="flex items-center gap-2 text-sm cursor-pointer select-none py-2 pl-2"
            aria-label={`Auto Scan ${isAutoMode ? 'aktif' : 'nonaktif'}`}
          >
            <span className="text-gray-600">Auto Scan</span>
            <div
              role="switch"
              aria-checked={isAutoMode}
              className={cn(
                'w-10 h-6 rounded-full transition-colors relative pointer-events-none',
                isAutoMode ? 'bg-red-700' : 'bg-gray-300'
              )}
            >
              <div
                className={cn(
                  'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                  isAutoMode ? 'translate-x-5' : 'translate-x-1'
                )}
              />
            </div>
          </button>
        </div>
      )}

      {/* Loading model MediaPipe */}
      {modelLoadMsg && (
        <div className="flex items-center gap-2 px-3 py-2 bg-yellow-900/30 border border-yellow-700/50 rounded-xl">
          <Loader2 className="h-4 w-4 text-yellow-400 animate-spin shrink-0" />
          <span className="text-yellow-300 text-xs">{modelLoadMsg}</span>
        </div>
      )}

      {/* Viewport kamera */}
      <div
        className={cn(
          'relative rounded-2xl overflow-hidden border-4 transition-colors duration-300',
          'aspect-video w-full bg-gray-900',
          cfg.border
        )}
      >
        {camState === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-900 z-10">
            <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
            <span className="text-gray-400 text-sm">Memuat kamera...</span>
          </div>
        )}

        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 },
          }}
          className="w-full h-full object-cover"
          mirrored
          onUserMedia={() => setCamState('granted')}
          onUserMediaError={handleCameraError}
        />

        {/* Overlay state */}
        <div
          className={cn(
            'absolute inset-0 transition-colors duration-300 flex flex-col items-center justify-end pb-6',
            cfg.overlay
          )}
        >
          {/* Panduan wajah — responsif untuk mobile */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div
              className={cn(
                'w-32 h-40 sm:w-48 sm:h-56 rounded-full border-2 border-dashed opacity-60 transition-colors',
                scanState === 'idle' ? 'border-white' : 'border-transparent'
              )}
            />
          </div>

          {/* Status icon + pesan */}
          <div className="flex flex-col items-center gap-2">
            {cfg.icon}
            {message && (
              <span className="text-sm font-medium text-white bg-black/50 px-3 py-1 rounded-full text-center max-w-[80vw] sm:max-w-xs">
                {message}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tombol scan manual */}
      {!isAutoMode && (
        <button
          type="button"
          onClick={doScan}
          disabled={scanState === 'scanning'}
          className="w-full py-3 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white rounded-xl font-medium transition-colors disabled:opacity-50 touch-manipulation"
        >
          {scanState === 'scanning' ? 'Memproses...' : 'Scan Wajah'}
        </button>
      )}

      {/* Kartu hasil scan terakhir */}
      {!compact && lastScan && scanState === 'success' && (
        <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-xl">
          {lastScan.anggota.photo_url ? (
            <img
              src={lastScan.anggota.photo_url}
              alt={lastScan.anggota.nama}
              className="w-16 h-16 rounded-full object-cover border-2 border-green-400 shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-green-200 flex items-center justify-center text-green-700 text-2xl font-bold shrink-0">
              {lastScan.anggota.nama[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{lastScan.anggota.nama}</p>
            <p className="text-sm text-gray-500">
              No. {lastScan.anggota.nomor_anggota} · {lastScan.anggota.tingkatan}
            </p>
            <p className="text-sm text-gray-500">{lastScan.anggota.cabang}</p>
          </div>
          <div className="text-right shrink-0">
            <span
              className={cn(
                'inline-block px-2 py-1 rounded-lg text-xs font-bold',
                lastScan.log.status === 'Hadir'
                  ? 'bg-green-600 text-white'
                  : 'bg-yellow-500 text-white'
              )}
            >
              {lastScan.log.status}
            </span>
            <p className="text-xs text-gray-400 mt-1">
              {Math.round(lastScan.similarity * 100)}% cocok
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
