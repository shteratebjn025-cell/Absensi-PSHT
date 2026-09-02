'use client'

import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision'

// Simpan instance IMAGE landmarker (dipakai untuk semua source termasuk video)
let imageLandmarker: FaceLandmarker | null = null
let initPromise: Promise<FaceLandmarker> | null = null

// Path model — gunakan lokal jika ada, fallback ke CDN
const MODEL_PATH = '/models/face_landmarker.task'
const MODEL_CDN =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
const WASM_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'

// Callback untuk loading progress (opsional, dipakai komponen)
type LoadCallback = (msg: string) => void
let onLoadProgress: LoadCallback | null = null

export function setFaceLoadCallback(cb: LoadCallback | null) {
  onLoadProgress = cb
}

async function createLandmarkerWithFallback(): Promise<FaceLandmarker> {
  onLoadProgress?.('Memuat model deteksi wajah...')

  const vision = await FilesetResolver.forVisionTasks(WASM_CDN)

  // Cek apakah model lokal tersedia
  let modelPath = MODEL_CDN
  try {
    const res = await fetch(MODEL_PATH, { method: 'HEAD' })
    if (res.ok) {
      modelPath = MODEL_PATH
      onLoadProgress?.('Memuat model lokal...')
    }
  } catch {
    // model lokal tidak ada, lanjut pakai CDN
  }

  const options = {
    baseOptions: {
      modelAssetPath: modelPath,
      delegate: 'GPU' as const,
    },
    outputFaceBlendshapes: false,
    runningMode: 'IMAGE' as const,
    numFaces: 1,
  }

  // Coba GPU dulu, fallback ke CPU jika gagal
  try {
    onLoadProgress?.('Inisialisasi GPU...')
    const lm = await FaceLandmarker.createFromOptions(vision, options)
    onLoadProgress?.(null as unknown as string)
    return lm
  } catch (gpuErr) {
    console.warn('GPU delegate gagal, mencoba CPU...', gpuErr)
    onLoadProgress?.('Beralih ke CPU mode...')
    const lm = await FaceLandmarker.createFromOptions(vision, {
      ...options,
      baseOptions: { ...options.baseOptions, delegate: 'CPU' as const },
    })
    onLoadProgress?.(null as unknown as string)
    return lm
  }
}

async function getLandmarker(): Promise<FaceLandmarker> {
  if (imageLandmarker) return imageLandmarker

  // Pastikan hanya satu inisialisasi berjalan sekaligus
  if (!initPromise) {
    initPromise = createLandmarkerWithFallback()
      .then((lm) => {
        imageLandmarker = lm
        initPromise = null
        return lm
      })
      .catch((err) => {
        initPromise = null
        throw err
      })
  }

  return initPromise
}

/**
 * Ekstrak embedding wajah dari berbagai sumber:
 * - HTMLVideoElement  → gambar ke canvas dulu (lebih stabil)
 * - HTMLImageElement  → langsung detect
 * - HTMLCanvasElement → langsung detect
 *
 * Menggunakan 478 landmark MediaPipe FaceLandmarker,
 * di-downsample ke 128D lalu dinormalisasi L2.
 */
export async function extractEmbedding(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): Promise<number[] | null> {
  try {
    const landmarker = await getLandmarker()

    let detectSource: HTMLImageElement | HTMLCanvasElement

    if (source instanceof HTMLVideoElement) {
      const video = source
      if (video.readyState < 2 || video.videoWidth === 0) return null

      // Resize ke 640×480 — ukuran optimal untuk MediaPipe
      // Resolusi lebih tinggi tidak menambah akurasi tapi memperlambat proses
      const TARGET_W = 640
      const TARGET_H = 480
      const canvas = document.createElement('canvas')
      canvas.width = TARGET_W
      canvas.height = TARGET_H
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      ctx.drawImage(video, 0, 0, TARGET_W, TARGET_H)
      detectSource = canvas
    } else {
      detectSource = source
    }

    const result = landmarker.detect(detectSource)

    if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
      return null
    }

    return buildEmbedding(result.faceLandmarks[0])
  } catch (err) {
    console.warn('extractEmbedding:', err)
    return null
  }
}

/** Bangun embedding 128D ternormalisasi dari landmark MediaPipe */
function buildEmbedding(landmarks: Array<{ x: number; y: number; z: number }>): number[] {
  const raw: number[] = []
  for (const lm of landmarks) {
    raw.push(lm.x, lm.y, lm.z)
  }
  return normalizeL2(downsampleTo128(raw))
}

function downsampleTo128(arr: number[]): number[] {
  const result: number[] = []
  const blockSize = arr.length / 128
  for (let i = 0; i < 128; i++) {
    const start = Math.floor(i * blockSize)
    const end = Math.floor((i + 1) * blockSize)
    let sum = 0
    for (let j = start; j < end; j++) sum += arr[j]
    result.push(sum / (end - start))
  }
  return result
}

function normalizeL2(vec: number[]): number[] {
  const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0))
  if (magnitude === 0) return vec
  return vec.map((v) => v / magnitude)
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i]
  return dot
}
