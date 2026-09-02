'use client'

import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision'

let imageLandmarker: FaceLandmarker | null = null
let initPromise: Promise<FaceLandmarker> | null = null

const MODEL_PATH = '/models/face_landmarker.task'
const MODEL_CDN =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
const WASM_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'

// Ukuran canonical — konsisten antara enroll dan scan
const CANONICAL_W = 640
const CANONICAL_H = 480

type LoadCallback = (msg: string) => void
let onLoadProgress: LoadCallback | null = null

export function setFaceLoadCallback(cb: LoadCallback | null) {
  onLoadProgress = cb
}

async function createLandmarkerWithFallback(): Promise<FaceLandmarker> {
  onLoadProgress?.('Memuat model deteksi wajah...')
  const vision = await FilesetResolver.forVisionTasks(WASM_CDN)

  let modelPath = MODEL_CDN
  try {
    const res = await fetch(MODEL_PATH, { method: 'HEAD' })
    if (res.ok) { modelPath = MODEL_PATH; onLoadProgress?.('Memuat model lokal...') }
  } catch { /* pakai CDN */ }

  const base = { modelAssetPath: modelPath, delegate: 'GPU' as const }
  const opts = { baseOptions: base, outputFaceBlendshapes: false, runningMode: 'IMAGE' as const, numFaces: 1 }

  try {
    onLoadProgress?.('Inisialisasi GPU...')
    const lm = await FaceLandmarker.createFromOptions(vision, opts)
    onLoadProgress?.(null as unknown as string)
    return lm
  } catch {
    onLoadProgress?.('Beralih ke CPU mode...')
    const lm = await FaceLandmarker.createFromOptions(vision, {
      ...opts, baseOptions: { ...base, delegate: 'CPU' as const },
    })
    onLoadProgress?.(null as unknown as string)
    return lm
  }
}

async function getLandmarker(): Promise<FaceLandmarker> {
  if (imageLandmarker) return imageLandmarker
  if (!initPromise) {
    initPromise = createLandmarkerWithFallback()
      .then((lm) => { imageLandmarker = lm; initPromise = null; return lm })
      .catch((err) => { initPromise = null; throw err })
  }
  return initPromise
}

/**
 * Normalisasi semua sumber ke canvas 640×480.
 * TIDAK di-mirror — konsisten untuk semua sumber.
 */
function toCanonicalCanvas(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas')
  canvas.width = CANONICAL_W
  canvas.height = CANONICAL_H
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(source, 0, 0, CANONICAL_W, CANONICAL_H)
  return canvas
}

/**
 * Ekstrak embedding dari video/image/canvas.
 * 
 * Pipeline canonical:
 * 1. Normalize ke 640×480
 * 2. Detect landmark (478 titik)
 * 3. Normalisasi posisi ke bounding box wajah (translasi + scale invariant)
 * 4. Ambil X,Y saja (Z dihapus — terlalu sensitif terhadap jarak kamera)  
 * 5. Downsample ke 128D + L2 normalize
 */
export async function extractEmbedding(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): Promise<number[] | null> {
  try {
    if (source instanceof HTMLVideoElement) {
      if (source.readyState < 2 || source.videoWidth === 0) return null
    }

    const canvas = toCanonicalCanvas(source)
    if (!canvas) return null

    const landmarker = await getLandmarker()
    const result = landmarker.detect(canvas)

    if (!result.faceLandmarks || result.faceLandmarks.length === 0) return null

    return buildEmbedding(result.faceLandmarks[0])
  } catch (err) {
    console.warn('extractEmbedding:', err)
    return null
  }
}

/**
 * Bangun embedding 128D yang stabil:
 * 
 * 1. NORMALISASI POSISI: Geser landmark ke pusat bounding box wajah
 *    lalu scale agar lebar wajah = 1.0. Ini membuat embedding tidak
 *    terpengaruh oleh posisi wajah di frame (kiri/kanan/atas/bawah)
 *    maupun jarak ke kamera (dekat/jauh).
 *
 * 2. Hanya pakai X,Y — Z dihapus karena sensitif terhadap jarak.
 *
 * 3. Downsample 956 → 128D → L2 normalize.
 */
function buildEmbedding(landmarks: Array<{ x: number; y: number; z: number }>): number[] {
  // Hitung bounding box wajah
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const lm of landmarks) {
    if (lm.x < minX) minX = lm.x
    if (lm.x > maxX) maxX = lm.x
    if (lm.y < minY) minY = lm.y
    if (lm.y > maxY) maxY = lm.y
  }

  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const scaleX = maxX - minX || 1  // lebar wajah
  const scaleY = maxY - minY || 1  // tinggi wajah
  const scale = Math.max(scaleX, scaleY)  // uniform scale

  // Normalisasi: geser ke pusat, scale ke [-0.5, 0.5]
  const raw: number[] = []
  for (const lm of landmarks) {
    raw.push(
      (lm.x - cx) / scale,
      (lm.y - cy) / scale,
    )
  }
  // 478 × 2 = 956 → 128D
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
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0))
  if (mag === 0) return vec
  return vec.map((v) => v / mag)
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i]
  return dot
}
