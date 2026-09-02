'use client'

/**
 * lib/face.ts — Face Recognition menggunakan face-api.js
 *
 * Pipeline:
 * 1. Load 3 model: SSD MobileNet (deteksi) + Landmark 68 + FaceNet (recognition)
 * 2. extractEmbedding() → deteksi wajah → hitung 128D face descriptor
 * 3. Descriptor di-L2 normalize → simpan ke Supabase VECTOR(128)
 *
 * face-api.js menggunakan neural network yang ditraining khusus untuk
 * face recognition (FaceNet-based), jauh lebih akurat dari landmark geometry.
 */

import * as faceapi from 'face-api.js'

const MODEL_URL = '/models/faceapi'

type LoadCallback = (msg: string | null) => void
let onLoadProgress: LoadCallback | null = null

export function setFaceLoadCallback(cb: LoadCallback | null) {
  onLoadProgress = cb
}

let modelsLoaded = false
let loadPromise: Promise<void> | null = null

async function loadModels(): Promise<void> {
  if (modelsLoaded) return
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    try {
      onLoadProgress?.('Memuat model deteksi wajah...')
      await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL)

      onLoadProgress?.('Memuat model landmark...')
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)

      onLoadProgress?.('Memuat model pengenalan wajah...')
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)

      modelsLoaded = true
      onLoadProgress?.(null)
    } catch (err) {
      loadPromise = null
      throw err
    }
  })()

  return loadPromise
}

/**
 * Ekstrak embedding 128D dari video/image/canvas.
 * Return null jika wajah tidak terdeteksi.
 *
 * Embedding sudah di-L2 normalize oleh face-api.js,
 * siap disimpan ke Supabase VECTOR(128) dan dicocokkan
 * dengan cosine similarity (fungsi match_face).
 */
export async function extractEmbedding(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): Promise<number[] | null> {
  try {
    await loadModels()

    if (source instanceof HTMLVideoElement) {
      if (source.readyState < 2 || source.videoWidth === 0) return null
    }

    const detection = await faceapi
      .detectSingleFace(source, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor()

    if (!detection) return null

    // FaceDescriptor adalah Float32Array 128D, sudah L2 normalized
    return Array.from(detection.descriptor)
  } catch (err) {
    console.warn('extractEmbedding error:', err)
    return null
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i]
  return dot
}
