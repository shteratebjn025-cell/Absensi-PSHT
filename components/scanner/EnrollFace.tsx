'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import Webcam from 'react-webcam'
import { Upload, RotateCcw, Loader2, CheckCircle, ScanFace } from 'lucide-react'
import { extractEmbedding } from '@/lib/face'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Anggota } from '@/types'

interface EnrollFaceProps {
  anggota: Anggota
  onSuccess: (updated: Anggota) => void
  onCancel: () => void
}

type EnrollState = 'detecting' | 'detected' | 'saving' | 'success' | 'error'

export function EnrollFace({ anggota, onSuccess, onCancel }: EnrollFaceProps) {
  const webcamRef = useRef<Webcam>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isProcessingRef = useRef(false)

  const [mode, setMode] = useState<'auto' | 'upload'>('auto')
  const [enrollState, setEnrollState] = useState<EnrollState>('detecting')
  const [statusMsg, setStatusMsg] = useState('Arahkan wajah ke kamera...')
  const [preview, setPreview] = useState<string | null>(null)
  const [camReady, setCamReady] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)

  const supabase = createClient()

  // ── Simpan embedding ke DB ──────────────────────────────────────────────
  const saveEmbedding = useCallback(async (embedding: number[], previewUrl: string) => {
    setEnrollState('saving')
    setStatusMsg('Menyimpan data wajah...')
    setPreview(previewUrl)

    try {
      const { data, error } = await supabase
        .from('anggota')
        .update({ face_embedding: embedding })
        .eq('id', anggota.id)
        .select()
        .single()

      if (error) throw error

      setEnrollState('success')
      setStatusMsg('Wajah berhasil didaftarkan!')
      setTimeout(() => onSuccess(data as Anggota), 1500)
    } catch (err) {
      console.error(err)
      setEnrollState('error')
      setStatusMsg('Gagal menyimpan. Coba lagi.')
    }
  }, [anggota.id, onSuccess, supabase])

  // ── Loop deteksi otomatis ───────────────────────────────────────────────
  const runDetectionLoop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    let countdownVal = 3  // countdown sebelum capture setelah wajah terdeteksi
    let faceDetectedFrames = 0

    intervalRef.current = setInterval(async () => {
      if (isProcessingRef.current) return
      const video = webcamRef.current?.video
      if (!video || video.readyState < 2 || video.videoWidth === 0) return

      isProcessingRef.current = true

      try {
        const embedding = await extractEmbedding(video)

        if (embedding) {
          faceDetectedFrames++

          if (faceDetectedFrames === 1) {
            setEnrollState('detected')
            countdownVal = 3
          }

          if (faceDetectedFrames >= 2) {
            // Wajah terdeteksi 2 frame berturut — mulai countdown
            if (countdownVal > 0) {
              setCountdown(countdownVal)
              setStatusMsg(`Tahan diam... ${countdownVal}`)
              countdownVal--
            } else {
              // Countdown habis — capture sekarang
              if (intervalRef.current) clearInterval(intervalRef.current)
              setCountdown(null)
              setStatusMsg('Mengambil foto...')

              // Buat preview canvas
              const canvas = document.createElement('canvas')
              canvas.width = video.videoWidth
              canvas.height = video.videoHeight
              const ctx = canvas.getContext('2d')
              if (ctx) {
                ctx.scale(-1, 1)
                ctx.drawImage(video, -canvas.width, 0)
              }
              const previewUrl = canvas.toDataURL('image/jpeg', 0.9)

              await saveEmbedding(embedding, previewUrl)
            }
          }
        } else {
          // Wajah hilang — reset
          if (faceDetectedFrames > 0) {
            faceDetectedFrames = 0
            countdownVal = 3
            setCountdown(null)
            setEnrollState('detecting')
            setStatusMsg('Wajah tidak terdeteksi. Arahkan kembali...')
            setTimeout(() => {
              if (enrollState !== 'saving' && enrollState !== 'success') {
                setStatusMsg('Arahkan wajah ke kamera...')
              }
            }, 1500)
          }
        }
      } finally {
        isProcessingRef.current = false
      }
    }, 800) // cek setiap 800ms
  }, [saveEmbedding, enrollState])

  // Mulai loop saat kamera siap
  useEffect(() => {
    if (camReady && mode === 'auto' && enrollState === 'detecting') {
      runDetectionLoop()
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [camReady, mode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Bersihkan interval saat unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  // ── Reset dan coba lagi ─────────────────────────────────────────────────
  const handleRetry = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    isProcessingRef.current = false
    setEnrollState('detecting')
    setStatusMsg('Arahkan wajah ke kamera...')
    setPreview(null)
    setCountdown(null)
    // Restart loop
    setTimeout(() => runDetectionLoop(), 300)
  }

  // ── Upload foto ─────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setMode('upload')
    setEnrollState('detecting')
    setStatusMsg('Memproses foto...')

    const url = URL.createObjectURL(file)
    setPreview(url)

    const img = new Image()
    img.src = url
    img.onload = async () => {
      const embedding = await extractEmbedding(img)
      if (!embedding) {
        setEnrollState('error')
        setStatusMsg('Wajah tidak terdeteksi di foto ini. Coba foto lain.')
        return
      }
      await saveEmbedding(embedding, url)
    }
  }

  // ── Border color berdasarkan state ──────────────────────────────────────
  const borderColor = {
    detecting: 'border-white/30',
    detected: 'border-yellow-400',
    saving: 'border-blue-400',
    success: 'border-green-400',
    error: 'border-red-500',
  }[enrollState]

  const overlayColor = {
    detecting: 'bg-black/20',
    detected: 'bg-yellow-900/10',
    saving: 'bg-blue-900/20',
    success: 'bg-green-900/20',
    error: 'bg-red-900/20',
  }[enrollState]

  return (
    <div className="flex flex-col gap-4">
      {/* Info anggota */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold shrink-0">
          {anggota.nama[0]}
        </div>
        <div>
          <p className="font-medium text-gray-900">{anggota.nama}</p>
          <p className="text-sm text-gray-500">No. {anggota.nomor_anggota}</p>
        </div>
      </div>

      {/* Mode: auto kamera */}
      {mode === 'auto' && (
        <>
          {/* Preview setelah capture */}
          {preview && (enrollState === 'saving' || enrollState === 'success' || enrollState === 'error') ? (
            <div className="flex flex-col gap-3">
              <div className={cn('relative rounded-2xl overflow-hidden border-4', borderColor)}>
                <img
                  src={preview}
                  alt="Preview wajah"
                  className="w-full aspect-video object-cover"
                />
                <div className={cn('absolute inset-0 flex flex-col items-center justify-center gap-2', overlayColor)}>
                  {enrollState === 'saving' && (
                    <Loader2 className="h-10 w-10 text-blue-400 animate-spin" />
                  )}
                  {enrollState === 'success' && (
                    <CheckCircle className="h-12 w-12 text-green-400" />
                  )}
                </div>
              </div>
              <p className={cn('text-sm text-center font-medium',
                enrollState === 'success' ? 'text-green-600'
                : enrollState === 'error' ? 'text-red-600'
                : 'text-gray-600'
              )}>
                {statusMsg}
              </p>
              {enrollState === 'error' && (
                <Button variant="outline" onClick={handleRetry} className="w-full">
                  <RotateCcw className="h-4 w-4" />
                  Coba Lagi
                </Button>
              )}
            </div>
          ) : (
            /* Kamera aktif — auto detect */
            <div className="flex flex-col gap-3">
              <div className={cn(
                'relative rounded-2xl overflow-hidden border-4 transition-colors duration-300 aspect-video bg-gray-900',
                borderColor
              )}>
                {!camReady && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-900 z-10">
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
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                  }}
                  className="w-full h-full object-cover"
                  mirrored
                  onUserMedia={() => setCamReady(true)}
                />

                {/* Overlay */}
                <div className={cn(
                  'absolute inset-0 flex flex-col items-center justify-center transition-colors duration-300',
                  overlayColor
                )}>
                  {/* Lingkaran panduan wajah */}
                  <div className={cn(
                    'w-36 h-44 sm:w-48 sm:h-56 rounded-full border-2 border-dashed transition-colors duration-300 mb-4',
                    enrollState === 'detected' ? 'border-yellow-400' : 'border-white/50'
                  )} />

                  {/* Countdown besar */}
                  {countdown !== null && (
                    <div className="absolute text-7xl font-black text-white/90 drop-shadow-lg">
                      {countdown}
                    </div>
                  )}
                </div>

                {/* Status bar di bawah kamera */}
                <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-black/70 to-transparent">
                  <div className="flex items-center gap-2 justify-center">
                    {(enrollState === 'detecting') && (
                      <ScanFace className="h-4 w-4 text-white/70 shrink-0" />
                    )}
                    {enrollState === 'detected' && (
                      <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse shrink-0" />
                    )}
                    <span className="text-white text-sm text-center font-medium drop-shadow">
                      {statusMsg}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500 text-center">
                Pastikan wajah terlihat jelas, pencahayaan cukup, dan kamera setinggi mata.
              </p>
            </div>
          )}
        </>
      )}

      {/* Mode: upload foto */}
      {mode === 'upload' && (
        <div className="flex flex-col gap-3">
          {preview ? (
            <>
              <div className={cn('relative rounded-2xl overflow-hidden border-4', borderColor)}>
                <img src={preview} alt="Preview" className="w-full aspect-video object-cover" />
                {enrollState === 'saving' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Loader2 className="h-10 w-10 text-white animate-spin" />
                  </div>
                )}
                {enrollState === 'success' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-green-900/20">
                    <CheckCircle className="h-12 w-12 text-green-400" />
                  </div>
                )}
              </div>
              <p className={cn('text-sm text-center',
                enrollState === 'success' ? 'text-green-600'
                : enrollState === 'error' ? 'text-red-600'
                : 'text-gray-600'
              )}>
                {statusMsg}
              </p>
              {enrollState === 'error' && (
                <Button variant="outline" onClick={() => { setPreview(null); setMode('auto'); handleRetry() }} className="w-full">
                  <RotateCcw className="h-4 w-4" />
                  Coba Lagi
                </Button>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">Memproses...</div>
          )}
        </div>
      )}

      {/* Tombol upload — tampil selama belum sukses */}
      {enrollState !== 'success' && enrollState !== 'saving' && (
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
            aria-label="Upload foto wajah"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 text-gray-600"
          >
            <Upload className="h-4 w-4" />
            Upload Foto
          </Button>
          {mode === 'upload' && enrollState === 'error' && (
            <Button
              variant="outline"
              onClick={() => { setMode('auto'); setPreview(null); setEnrollState('detecting'); setStatusMsg('Arahkan wajah ke kamera...'); setTimeout(() => runDetectionLoop(), 300) }}
              className="flex-1"
            >
              Pakai Kamera
            </Button>
          )}
        </div>
      )}

      <Button variant="ghost" onClick={onCancel} className="w-full text-gray-500">
        Tutup
      </Button>
    </div>
  )
}
