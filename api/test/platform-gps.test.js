import test from 'node:test'
import assert from 'node:assert/strict'
import { haversineMeters, verifyGpsWalk } from '../platform/gps.js'

const NOW = Date.parse('2026-10-06T08:00:00Z')

function walkingPoints({ count = 21, seconds = 60, lonStep = 0.0009, accuracy = 8 } = {}) {
  const start = NOW - (count - 1) * seconds * 1000
  return Array.from({ length: count }, (_, i) => ({
    lat: 21.5433,
    lon: 39.1728 + i * lonStep,
    accuracy,
    t: start + i * seconds * 1000
  }))
}

test('haversine distance is stable for nearby points', () => {
  const d = haversineMeters({ lat: 21.5433, lon: 39.1728 }, { lat: 21.5433, lon: 39.1738 })
  assert.ok(d > 95 && d < 110)
})

test('GPS walking verifier accepts a plausible sustained walk and hashes evidence', () => {
  const points = walkingPoints()
  const r = verifyGpsWalk(points, { now: NOW })
  assert.equal(r.ok, true)
  assert.equal(r.verified, true)
  assert.equal(r.risk, 'clear')
  assert.equal(r.evidenceSha256.length, 64)
  assert.ok(r.summary.distanceM > 1800)
  assert.ok(r.summary.distanceM < 2100)
  assert.equal(r.summary.durationSec, 1200)
  assert.equal(r.summary.acceptedPoints, points.length)
})

test('GPS walking verifier rejects sessions shorter than five minutes', () => {
  const r = verifyGpsWalk(walkingPoints({ count: 6, seconds: 30 }), { now: NOW })
  assert.deepEqual(r, { ok: false, code: 'gps-too-short' })
})

test('GPS walking verifier rejects low-quality location evidence', () => {
  const r = verifyGpsWalk(walkingPoints({ accuracy: 120 }), { now: NOW })
  assert.deepEqual(r, { ok: false, code: 'gps-low-accuracy' })
})

test('GPS walking verifier refuses an implausibly fast route', () => {
  const r = verifyGpsWalk(walkingPoints({ count: 21, seconds: 10, lonStep: 0.002 }), { now: NOW })
  assert.ok(
    !r.ok || r.risk === 'review',
    'an implausibly fast walking route must not be auto-verified'
  )
})

test('GPS evidence hash is deterministic and raw coordinates are not returned', () => {
  const points = walkingPoints()
  const a = verifyGpsWalk(points, { now: NOW })
  const b = verifyGpsWalk(points, { now: NOW })
  assert.equal(a.evidenceSha256, b.evidenceSha256)
  assert.equal('points' in a, false)
  assert.equal(JSON.stringify(a).includes('39.1728'), false)
})
