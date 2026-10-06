const MAX_POINTS = 1500
const MAX_SESSION_MS = 6 * 60 * 60 * 1000
const MIN_SESSION_MS = 5 * 60 * 1000
const MAX_ACCURACY_M = 60
const MAX_WALK_SEGMENT_SPEED_MPS = 5.5
const MAX_WALK_AVG_SPEED_MPS = 3.5
const MIN_WALK_AVG_SPEED_MPS = 0.35
const MAX_DISTANCE_M = 100_000

export type GpsPoint = { lat: number; lon: number; accuracy: number; t: number }

const rad = (d: number) => d * Math.PI / 180

export function haversineMeters(a: GpsPoint, b: GpsPoint) {
  const R = 6371008.8
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

const pointOf = (raw: any): GpsPoint | null => {
  const lat = Number(raw?.lat), lon = Number(raw?.lon), accuracy = Number(raw?.accuracy), t = Number(raw?.t)
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return null
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) return null
  if (!Number.isFinite(accuracy) || accuracy <= 0 || accuracy > 500) return null
  if (!Number.isFinite(t) || t <= 0) return null
  return { lat, lon, accuracy, t: Math.round(t) }
}

async function sha256(value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('')
}

export async function verifyGpsWalk(raw: unknown, now = Date.now()) {
  if (!Array.isArray(raw) || raw.length < 6 || raw.length > MAX_POINTS) return { ok: false, code: 'gps-point-count' }
  const points = raw.map(pointOf)
  if (points.some(p => !p)) return { ok: false, code: 'gps-invalid-point' }
  const clean = points as GpsPoint[]

  for (let i = 1; i < clean.length; i++) {
    if (clean[i].t <= clean[i - 1].t) return { ok: false, code: 'gps-time-order' }
  }

  const startedAt = clean[0].t
  const endedAt = clean.at(-1)!.t
  const durationMs = endedAt - startedAt
  if (durationMs < MIN_SESSION_MS) return { ok: false, code: 'gps-too-short' }
  if (durationMs > MAX_SESSION_MS) return { ok: false, code: 'gps-too-long' }
  if (endedAt > now + 5 * 60 * 1000) return { ok: false, code: 'gps-future' }
  if (endedAt < now - 31 * 24 * 60 * 60 * 1000) return { ok: false, code: 'gps-too-old' }

  const good = clean.filter(p => p.accuracy <= MAX_ACCURACY_M)
  if (good.length < 6 || good.length / clean.length < 0.7) return { ok: false, code: 'gps-low-accuracy' }

  let distanceM = 0, maxSegmentSpeed = 0, suspiciousSegments = 0
  for (let i = 1; i < good.length; i++) {
    const a = good[i - 1], b = good[i]
    const dt = (b.t - a.t) / 1000
    if (dt <= 0 || dt > 180) continue
    const rawDistance = haversineMeters(a, b)
    const noiseFloor = Math.max(4, Math.min(a.accuracy, b.accuracy) * 0.25)
    const d = rawDistance <= noiseFloor ? 0 : rawDistance
    const speed = d / dt
    if (speed > MAX_WALK_SEGMENT_SPEED_MPS) { suspiciousSegments++; continue }
    maxSegmentSpeed = Math.max(maxSegmentSpeed, speed)
    distanceM += d
  }

  if (distanceM <= 0 || distanceM > MAX_DISTANCE_M) return { ok: false, code: 'gps-distance' }

  const durationSec = Math.round(durationMs / 1000)
  const avgSpeedMps = distanceM / durationSec
  if (avgSpeedMps < MIN_WALK_AVG_SPEED_MPS || avgSpeedMps > MAX_WALK_AVG_SPEED_MPS) {
    return { ok: false, code: 'gps-pace' }
  }

  const summary = {
    distanceM: Math.round(distanceM * 10) / 10,
    durationSec,
    avgSpeedMps: Math.round(avgSpeedMps * 100) / 100,
    acceptedPoints: good.length,
    totalPoints: clean.length,
    maxSegmentSpeedMps: Math.round(maxSegmentSpeed * 100) / 100
  }

  const spikeRatio = suspiciousSegments / Math.max(1, good.length - 1)
  if (suspiciousSegments >= 3 && spikeRatio > 0.05) {
    return { ok: true, verified: false, risk: 'review', code: 'gps-speed-review', summary }
  }

  const normalized = good.map(p => [
    Math.round(p.lat * 1e6) / 1e6,
    Math.round(p.lon * 1e6) / 1e6,
    Math.round(p.accuracy),
    p.t
  ])
  return {
    ok: true,
    verified: true,
    risk: 'clear',
    code: 'verified',
    evidenceSha256: await sha256(normalized),
    summary
  }
}
