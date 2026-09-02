'use client'

import { useRef, useState, useCallback } from 'react'
import Webcam from 'react-webcam'
import { Camera, Upload, RotateCcw, Check, Loader2 } from 'lucide-react'
import { extractEmbedding } from '@/lib/face'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import type { Anggota } from '@/types'

interface EnrollFaceProps {
  anggota: Anggota
  onSuccess: (updated: Anggota) => void
  onCancel: () => void
}

type Mode = 'choose' | 'camera' | 'upload'

export function EnrollFace({ anggota, onSuccess, onCancel }: EnrollFaceProps) {
  const webcamRef = useRef<Webcam>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<Mode>('choose')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [pendingEmbedding, setPendingEmbedding] = useState<number[] | null>(null)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  /**
   * Capture langsung dari video element dan langsung ekstrak embedding.
   * Embedding disimpan di state — tombol "Simpan Wajah" tinggal upload ke DB.
   * TIDAK proses ulang dari JPEG, agar pipeline identik dengan FaceScanner saat scan.
   */
  const capture = useCallback(async () => {
    const video = webcamRef.current?.video
    if (!video) return

    // Preview untuk tampilan
    const previewCanvas = document.createElement('canvas')
    previewCanvas.width = video.videoWidth || 640
    previewCanvas.height = video.videoHeight || 480
    const ctx = previewCanvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    setCapturedImage(previewCanvas.toDataURL('image/jpeg', 0.85))
    setPendingEmbedding(null)
    setStatus('Mengekstrak embedding wajah...')
    setLoading(true)

    // Ekstrak embedding langsung dari video — identik dengan pipeline scan
    try {
      const embedding = await extractEmbedding(video)
      if (!embedding) {
        setStatus('Wajah tidak terdeteksi. Coba foto lain dengan pencahayaan lebih baik.')
        setLoading(false)
        return
      }
      setPendingEmbedding(embedding)
      setStatus('Wajah terdeteksi. Klik "Simpan Wajah" untuk menyimpan.')
    } catch {
      setStatus('Gagal ekstrak wajah. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const processImage = async (
    source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
  ) => {
    setLoading(true)
    setStatus('Mengekstrak embedding wajah...')

    try {
      const embedding = await extractEmbedding(source)

      if (!embedding) {
        setStatus('Wajah tidak terdeteksi. Coba foto lain dengan pencahayaan lebih baik.')
        setLoading(false)
        return
      }

      await saveEmbedding(embedding)
    } catch (err) {
      console.error(err)
      setStatus('Gagal menyimpan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const saveEmbedding = async (embedding: number[]) => {
    setLoading(true)
    setStatus('Menyimpan ke database...')

      try {
        const { data, error } = await supabase
          .from('anggota')
          .update({ face_embedding: embedding })
          .eq('id', anggota.id)
          .select()
          .single()

        if (error) throw error

        setStatus('Berhasil! Data wajah tersimpan.')
        setTimeout(() => onSuccess(data as Anggota), 1000)
      } catch (err) {
        console.error(err)
        setStatus('Gagal menyimpan. Coba lagi.')
      } finally {
        setLoading(false)
      }
  }

  const handleCameraEnroll = async () => {
    if (!pendingEmbedding) return
    await saveEmbedding(pendingEmbedding)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.src = url
    img.onload = () => {
      setCapturedImage(url)
      processImage(img)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Info anggota */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold">
          {anggota.nama[0]}
        </div>
        <div>
          <p className="font-medium text-gray-900">{anggota.nama}</p>
          <p className="text-sm text-gray-500">No. {anggota.nomor_anggota}</p>
        </div>
      </div>

      {/* Panduan penting */}
      <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
        💡 Tips: Foto dalam kondisi pencahayaan yang sama dengan saat absensi (misal: di dalam ruangan latihan)
      </div>

      {/* Mode pilihan */}
      {mode === 'choose' && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setMode('camera')}
            className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-red-400 hover:bg-red-50 transition-colors"
          >
            <Camera className="h-8 w-8 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Ambil dari Kamera</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-red-400 hover:bg-red-50 transition-colors"
          >
            <Upload className="h-8 w-8 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Upload Foto</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
            aria-label="Upload foto wajah"
          />
        </div>
      )}

      {/* Mode kamera */}
      {mode === 'camera' && (
        <div className="flex flex-col gap-3">
          {!capturedImage ? (
            <>
              <div className="relative rounded-xl overflow-hidden aspect-video bg-gray-900">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: 'user', width: 640, height: 480 }}
                  className="w-full h-full object-cover"
                  mirrored
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-40 h-48 rounded-full border-2 border-dashed border-white/60" />
                </div>
              </div>
              <p className="text-xs text-gray-500 text-center">
                Posisikan wajah di dalam lingkaran, pastikan pencahayaan cukup
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setMode('choose')} className="flex-1">
                  Batal
                </Button>
                <Button onClick={capture} className="flex-1">
                  <Camera className="h-4 w-4" />
                  Ambil Foto
                </Button>
              </div>
            </>
          ) : (
            <>
              <img
                src={capturedImage}
                alt="Preview wajah"
                className="rounded-xl w-full aspect-video object-cover"
              />
              {status && (
                <p className={`text-sm text-center ${
                  status.includes('Berhasil') ? 'text-green-600'
                  : status.includes('Gagal') || status.includes('tidak') ? 'text-red-600'
                  : 'text-gray-600'
                }`}>
                  {loading && <Loader2 className="inline h-3 w-3 animate-spin mr-1" />}
                  {status}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => { setCapturedImage(null); setStatus(''); setPendingEmbedding(null) }}
                  disabled={loading}
                  className="flex-1"
                >
                  <RotateCcw className="h-4 w-4" />
                  Ulang
                </Button>
                <Button
                  onClick={handleCameraEnroll}
                  loading={loading}
                  disabled={loading || !pendingEmbedding}
                  className="flex-1"
                >
                  <Check className="h-4 w-4" />
                  Simpan Wajah
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Mode upload */}
      {mode === 'upload' && capturedImage && (
        <div className="flex flex-col gap-3">
          <img
            src={capturedImage}
            alt="Preview upload"
            className="rounded-xl w-full aspect-video object-cover"
          />
          {status && (
            <div className="flex items-center gap-2 justify-center">
              {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
              <p className={`text-sm ${
                status.includes('Berhasil') ? 'text-green-600'
                : status.includes('Gagal') || status.includes('tidak') ? 'text-red-600'
                : 'text-gray-600'
              }`}>
                {status}
              </p>
            </div>
          )}
        </div>
      )}

      <Button variant="ghost" onClick={onCancel} className="w-full text-gray-500">
        Tutup
      </Button>
    </div>
  )
}
