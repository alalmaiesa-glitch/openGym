import crypto from 'node:crypto'

const MAX_POINTS = 1500
const MAX_SESSION_MS = 6 * 60 * 60 * 1000
const MIN_SESSION_MS = 5 * 60 * 1000
const MAX_ACCURACY_M = 60
const MAX_WALK_SEGMENT_SPEED_MPS = 5.5
const MAX_WALK_AVG_SPEED_MPS = 3.5
const MIN_WALK_AVG_SPEED_MPS = 0.35
const MAX_DISTANCE_M = 100_000

const rad = d => d * Math.PI / 180

export function haversineMeters(a, b) {
  const R = 6371008.8
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const lat1 = rad(a.lat)
  const lat2 = rad(b.lat)
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

const asPoint = raw => {
  const lat = Number(raw?.lat)
  const lon = Number(raw?.lon)
  const accuracy = Number(raw?.accuracy)
  const t = Number(raw?.t)
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return null
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) return null
  if (!Number.isFinite(accuracy) || accuracy <= 0 || accuracy > 500) return null
  if (!Number.isFinite(t) || t <= 0) return null
  return { lat, lon, accuracy, t: Math.round(t) }
}

export function verifyGpsWalk(rawPoints, { now = Date.now() } = {}) {
  if (!Array.isArray(rawPoints) || rawPoints.length < 6 || rawPoints.length > MAX_POINTS) {
    return { ok: false, code: 'gps-point-count' }
  }

  const points = rawPoints.map(asPoint)
  if (points.some(p => !p)) return { ok: false, code: 'gps-invalid-point' }

  for (let i = 1; i < points.length; i++) {
    if (points[i].t <= points[i - 1].t) return { ok: false, code: 'gps-time-order' }
  }

  const startedAt = points[0].t
  const endedAt = points.at(-1).t
  const durationMs = endedAt - startedAt
  if (durationMs < MIN_SESSION_MS) return { ok: false, code: 'gps-too-short' }
  if (durationMs > MAX_SESSION_MS) return { ok: false, code: 'gps-too-long' }
  if (endedAt > now + 5 * 60 * 1000) return { ok: false, code: 'gps-future' }
  if (endedAt < now - 31 * 24 * 60 * 60 * 1000) return { ok: false, code: 'gps-too-old' }

  const good = points.filter(p => p.accuracy <= MAX_ACCURACY_M)
  if (good.length < 6 || good.length / points.length < 0.7) {
    return { ok: false, code: 'gps-low-accuracy' }
  }

  let distanceM = 0
  let maxSegmentSpeed = 0
  let suspiciousSegments = 0

  for (let i = 1; i < good.length; i++) {
    const a = good[i - 1]
    const b = good[i]
    const dt = (b.t - a.t) / 1000
    if (dt <= 0 || dt > 180) continue

    const rawDistance = haversineMeters(a, b)
    // Ignore tiny movements that are indistinguishable from normal GPS drift.
    const noiseFloor = Math.max(4, Math.min(a.accuracy, b.accuracy) * 0.25)
    const d = rawDistance <= noiseFloor ? 0 : rawDistance
    const speed = d / dt

    if (speed > MAX_WALK_SEGMENT_SPEED_MPS) {
      suspiciousSegments += 1
      continue
    }

    maxSegmentSpeed = Math.max(maxSegmentSpeed, speed)
    distanceM += d
  }

  if (distanceM <= 0 || distanceM > MAX_DISTANCE_M) {
    return { ok: false, code: 'gps-distance' }
  }

  const durationSec = Math.round(durationMs / 1000)
  const avgSpeedMps = distanceM / durationSec
  if (avgSpeedMps < MIN_WALK_AVG_SPEED_MPS || avgSpeedMps > MAX_WALK_AVG_SPEED_MPS) {
    return { ok: false, code: 'gps-pace' }
  }

  // A single spike can be GPS noise. Repeated impossible walking speeds require review instead
  // of silently deleting them and inflating trust in the rest of the route.
  const spikeRatio = suspiciousSegments / Math.max(1, good.length - 1)
  if (suspiciousSegments >= 3 && spikeRatio > 0.05) {
    return {
      ok: true,
      verified: false,
      risk: 'review',
      code: 'gps-speed-review',
      summary: {
        distanceM: Math.round(distanceM * 10) / 10,
        durationSec,
        avgSpeedMps: Math.round(avgSpeedMps * 100) / 100,
        acceptedPoints: good.length,
        totalPoints: points.length
      }
    }
  }

  const normalized = good.map(p => [
    Math.round(p.lat * 1e6) / 1e6,
    Math.round(p.lon * 1e6) / 1e6,
    Math.round(p.accuracy),
    p.t
  ])
  const sha256 = crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex')

  return {
    ok: true,
    verified: true,
    risk: 'clear',
    code: 'verified',
    evidenceSha256: sha256,
    summary: {
      distanceM: Math.round(distanceM * 10) / 10,
      durationSec,
      avgSpeedMps: Math.round(avgSpeedMps * 100) / 100,
      acceptedPoints: good.length,
      totalPoints: points.length,
      maxSegmentSpeedMps: Math.round(maxSegmentSpeed * 100) / 100
    }
  }
}
