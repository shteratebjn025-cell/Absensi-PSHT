'use client'

import { useEffect } from 'react'

/**
 * Suppress pesan INFO/WARNING dari MediaPipe yang tampil
 * sebagai "Console Error" di Next.js dev overlay.
 * MediaPipe menggunakan console.error untuk semua log internalnya.
 */
export function MediaPipeSuppressor() {
  useEffect(() => {
    const originalError = console.error
    console.error = (...args: unknown[]) => {
      const msg = args[0]
      if (typeof msg === 'string') {
        // Abaikan pesan internal MediaPipe / TensorFlow Lite
        if (
          msg.startsWith('INFO:') ||
          msg.startsWith('W0') ||
          msg.startsWith('I0') ||
          msg.includes('TensorFlow Lite') ||
          msg.includes('XNNPACK') ||
          msg.includes('face_landmarker') ||
          msg.includes('FaceBlendshapesGraph') ||
          msg.includes('gl_context') ||
          msg.includes('Graph successfully')
        ) {
          return
        }
      }
      originalError.apply(console, args)
    }

    return () => {
      console.error = originalError
    }
  }, [])

  return null
}
