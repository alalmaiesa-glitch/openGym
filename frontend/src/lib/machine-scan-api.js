import { api } from './api.js'

export const MACHINE_SCAN_MAX_SOURCE_BYTES = 12 * 1024 * 1024
export const MACHINE_SCAN_MAX_UPLOAD_BYTES = 1400 * 1024
const ACCEPTED = new Set(['image/jpeg', 'image/png', 'image/webp'])

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image-decode')) }
    img.src = url
  })
}

function canvasBlob(canvas, quality) {
  return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const data = String(reader.result || '')
      resolve(data.includes(',') ? data.slice(data.indexOf(',') + 1) : data)
    }
    reader.onerror = () => reject(reader.error || new Error('image-read'))
    reader.readAsDataURL(blob)
  })
}

/**
 * Downsize a gym-machine photo before it leaves the device.
 * The original file is never stored or uploaded; only this bounded JPEG is sent for recognition.
 */
export async function prepareMachinePhoto(file, { maxDimension = 1280 } = {}) {
  if (!(file instanceof Blob)) throw new Error('image-required')
  if (file.size <= 0 || file.size > MACHINE_SCAN_MAX_SOURCE_BYTES) throw new Error('image-size')
  if (file.type && !ACCEPTED.has(file.type)) throw new Error('image-type')

  const img = await loadImage(file)
  const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height))
  let width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale))
  let height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale))
  let quality = 0.84
  let blob = null

  // A couple of bounded reductions are enough for a phone photo while keeping labels/handles
  // legible for the recognition model. This is intentionally not a general image compressor.
  for (let attempt = 0; attempt < 4; attempt++) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('image-canvas')
    ctx.drawImage(img, 0, 0, width, height)
    blob = await canvasBlob(canvas, quality)
    if (!blob) throw new Error('image-encode')
    if (blob.size <= MACHINE_SCAN_MAX_UPLOAD_BYTES) break
    width = Math.max(640, Math.round(width * 0.82))
    height = Math.max(640, Math.round(height * 0.82))
    quality = Math.max(0.66, quality - 0.07)
  }

  if (!blob || blob.size > MACHINE_SCAN_MAX_UPLOAD_BYTES) throw new Error('image-size')
  return {
    mime: 'image/jpeg',
    bytes: blob.size,
    width,
    height,
    base64: await blobToBase64(blob)
  }
}

export async function analyzeMachinePhoto(file) {
  const image = await prepareMachinePhoto(file)
  return api('/api/machine-scan/analyze', {
    method: 'POST',
    timeout: 45000,
    body: JSON.stringify({ mime: image.mime, imageBase64: image.base64 })
  })
}
