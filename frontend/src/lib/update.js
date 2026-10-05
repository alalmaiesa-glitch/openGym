// Update check for this Arabic edition.
// The native Android build only trusts releases published from this fork, so an update can never
// silently replace it with the upstream application.

import { MOBILE } from './mobile.js'

const RELEASES_URL = 'https://api.github.com/repos/alalmaiesa-glitch/openGym/releases/latest'
export const RELEASES_PAGE = 'https://github.com/alalmaiesa-glitch/openGym/releases'

function compareSemver(a, b) {
  const pa = String(a || '').replace(/^v/, '').split('+')[0].split('.').map(Number)
  const pb = String(b || '').replace(/^v/, '').split('+')[0].split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0)
    if (diff > 0) return 1
    if (diff < 0) return -1
  }
  return 0
}

let cached = null
export function resetUpdateCheck() { cached = null }

export async function checkForUpdate() {
  if (!cached) cached = fetchLatest().catch(e => { cached = null; throw e })
  return cached
}

async function fetchLatest() {
  const res = await fetch(RELEASES_URL, { headers: { Accept: 'application/vnd.github+json' } })
  // A new fork may legitimately have no published release yet.
  if (res.status === 404) {
    return { hasUpdate: false, latestVersion: __APP_VERSION__, apkUrl: null, hashUrl: null }
  }
  if (!res.ok) throw new Error(`GitHub API ${res.status}`)

  const latest = await res.json()
  if (!latest?.tag_name) {
    return { hasUpdate: false, latestVersion: __APP_VERSION__, apkUrl: null, hashUrl: null }
  }

  const latestVersion = latest.tag_name.replace(/^v/, '')
  const hasUpdate = compareSemver(latestVersion, __APP_VERSION__) > 0
  const assets = Array.isArray(latest.assets) ? latest.assets : []
  const urlOf = a => a?.browser_download_url || a?.url || ''
  const nameOf = a => a?.name || urlOf(a).split('/').pop() || ''

  // Match the APK itself without accidentally taking the checksum first.
  const apk = assets.find(a => /\.apk$/i.test(nameOf(a)) || /\.apk$/i.test(urlOf(a)))
  const hash = assets.find(a => /\.apk\.sha256$/i.test(nameOf(a)) || /\.apk\.sha256$/i.test(urlOf(a)) || /sha256/i.test(nameOf(a)))

  return {
    hasUpdate,
    latestVersion,
    apkUrl: apk ? urlOf(apk) : null,
    hashUrl: hash ? urlOf(hash) : null,
  }
}

export async function sha256(buffer) {
  const hash = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function downloadAndInstall(url, expectedHash = null, onProgress = null) {
  if (!MOBILE) {
    window.open(RELEASES_PAGE, '_blank', 'noopener')
    return
  }

  const { Filesystem, Directory } = await import('@capacitor/filesystem')
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)

  const total = parseInt(res.headers.get('content-length') || '0', 10)
  const reader = res.body.getReader()
  const chunks = []
  let received = 0

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    received += value.length
    if (onProgress) onProgress(received, total)
  }

  const blob = new Blob(chunks)
  if (blob.size < 100_000) {
    throw new Error('Downloaded file is too small to be a valid APK (' + blob.size + ' bytes)')
  }

  if (expectedHash) {
    const buffer = await blob.arrayBuffer()
    const actualHash = await sha256(buffer)
    if (actualHash !== expectedHash.toLowerCase().trim()) {
      throw new Error('SHA-256 mismatch — download may be corrupted or tampered with')
    }
  }

  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })

  const fileName = 'opengym-update.apk'
  await Filesystem.writeFile({
    path: fileName,
    directory: Directory.Cache,
    data: base64,
  })

  const { registerPlugin } = await import('@capacitor/core')
  const Install = registerPlugin('Install')
  await Install.installApk({ fileName })
}
