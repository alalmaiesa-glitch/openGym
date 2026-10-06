import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ACTIVITY_TYPES,
  challengeCompletion,
  contributionRewardQuality,
  ledgerEntry,
  progressFromEvent,
  rewardSettlementDecision,
  snapshotChallenge,
  stableHash,
  validateActivityEvent
} from '../platform/core.js'

const NOW = Date.parse('2026-10-06T06:00:00Z')
const verified = event => ({ ...event, verification: 'verified', risk: 'clear' })

test('activity ingestion requires a client idempotency key and never trusts client verification', () => {
  const r = validateActivityEvent({
    type: 'walk',
    source: 'gps',
    occurredAt: '2026-10-06T05:30:00Z',
    idempotencyKey: 'device-abc:walk:000001',
    verification: 'verified',
    risk: 'clear',
    payload: { steps: 5210, distanceM: 4032.45, durationSec: 2880 },
    evidence: { method: 'gps', sha256: 'a'.repeat(64) }
  }, { now: NOW })

  assert.equal(r.ok, true)
  assert.equal(r.event.verification, 'pending')
  assert.equal(r.event.risk, 'pending')
  assert.deepEqual(r.event.payload, { steps: 5210, distanceM: 4032.5, durationSec: 2880 })
  assert.equal(r.event.evidence.sha256, 'a'.repeat(64))
  assert.ok(ACTIVITY_TYPES.has(r.event.type))
})

test('activity ingestion refuses malformed, future and stale facts', () => {
  assert.equal(validateActivityEvent({
    type: 'walk', source: 'gps', occurredAt: '2026-10-06T05:00:00Z',
    idempotencyKey: 'short', payload: { steps: 1000 }
  }, { now: NOW }).code, 'invalid-idempotency-key')

  assert.equal(validateActivityEvent({
    type: 'walk', source: 'gps', occurredAt: '2026-10-06T07:00:01Z',
    idempotencyKey: 'device-abc:walk:000002', payload: { steps: 1000 }
  }, { now: NOW }).code, 'future-event')

  assert.equal(validateActivityEvent({
    type: 'walk', source: 'gps', occurredAt: '2026-08-01T00:00:00Z',
    idempotencyKey: 'device-abc:walk:000003', payload: { steps: 1000 }
  }, { now: NOW }).code, 'event-too-old')
})

test('walking challenge progress counts only verified clear events', () => {
  const pending = validateActivityEvent({
    type: 'walk',
    source: 'health_connect',
    occurredAt: '2026-10-06T05:00:00Z',
    idempotencyKey: 'android:walk:20261006:001',
    payload: { steps: 7200, distanceM: 5500, durationSec: 3600 }
  }, { now: NOW }).event

  assert.equal(progressFromEvent('steps', pending), 0)
  assert.equal(progressFromEvent('steps', verified(pending)), 7200)
  assert.equal(progressFromEvent('distance_m', verified(pending)), 5500)
  assert.equal(progressFromEvent('active_minutes', verified(pending)), 60)
})

test('feedback rewards completeness, never positive sentiment', () => {
  const base = {
    type: 'equipment_feedback',
    verification: 'verified',
    risk: 'clear',
    payload: {
      equipmentModelId: 'life-fitness-insignia-cp',
      note: 'Seat adjustment is hard to read.',
      issueCodes: ['seat-scale']
    }
  }

  const negative = contributionRewardQuality({ ...base, payload: { ...base.payload, rating: 1 } })
  const positive = contributionRewardQuality({ ...base, payload: { ...base.payload, rating: 5 } })

  assert.deepEqual(negative, positive)
  assert.equal(negative.eligible, true)
  assert.equal(negative.score, 100)
})

test('challenge enrollment snapshot freezes sponsor, reward, verification and terms hash', () => {
  const result = snapshotChallenge({
    id: 'walk-jeddah-10k',
    version: 3,
    metric: 'steps',
    target: 10000,
    startsAt: '2026-10-06T00:00:00Z',
    endsAt: '2026-10-07T00:00:00Z',
    sponsorId: 'sponsor-acme',
    reward: { kind: 'pt650_credit', value: 2500 },
    disclosure: 'Complete 10,000 verified steps today and receive 25 PTC immediately.',
    verification: 'Health/wearable steps; suspicious duplicate activity may be reviewed.'
  })
  assert.equal(result.ok, true)
  assert.equal(result.snapshot.reward.value, 2500)
  assert.equal(result.snapshot.termsHash.length, 64)
  assert.equal(result.snapshot.termsHash, stableHash({
    id: 'walk-jeddah-10k',
    version: 3,
    metric: 'steps',
    target: 10000,
    startsAt: '2026-10-06T00:00:00.000Z',
    endsAt: '2026-10-07T00:00:00.000Z',
    sponsorId: 'sponsor-acme',
    reward: { kind: 'pt650_credit', value: 2500 },
    disclosure: 'Complete 10,000 verified steps today and receive 25 PTC immediately.',
    verification: 'Health/wearable steps; suspicious duplicate activity may be reviewed.'
  }))
})

test('challenge settlement is instant only after verified progress and a clear risk decision', () => {
  const snap = snapshotChallenge({
    id: 'walk-5k',
    version: 1,
    metric: 'distance_m',
    target: 5000,
    startsAt: '2026-10-06T00:00:00Z',
    endsAt: '2026-10-07T00:00:00Z',
    sponsorId: 'sponsor-acme',
    reward: { kind: 'access_days', value: 7 },
    disclosure: 'Walk 5 km and receive seven days of PT650 advanced access.',
    verification: 'GPS plus device motion evidence.'
  }).snapshot

  assert.deepEqual(challengeCompletion(snap, 4999, NOW), {
    complete: false, current: 4999, target: 5000, remaining: 1
  })

  const enrollment = { challenge: snap }
  assert.equal(rewardSettlementDecision({ enrollment, progress: 5000, risk: 'review', now: NOW }).settle, false)
  const ok = rewardSettlementDecision({ enrollment, progress: 5000, risk: 'clear', now: NOW })
  assert.equal(ok.settle, true)
  assert.equal(ok.mode, 'instant')
  assert.deepEqual(ok.reward, { kind: 'access_days', value: 7 })
})

test('reward ledger entries are immutable-shaped and require unique-looking idempotency keys', () => {
  const entry = ledgerEntry({
    userId: 'user-123',
    idempotencyKey: 'challenge:walk-5k:v1:user-123',
    amount: 2500,
    currency: 'PTC',
    reason: 'Verified walking challenge',
    sourceType: 'challenge',
    sourceId: 'walk-5k'
  })

  assert.equal(entry.amount, 2500)
  assert.equal(entry.currency, 'PTC')
  assert.equal(Object.isFrozen(entry), true)
  assert.throws(() => ledgerEntry({
    userId: 'user-123',
    idempotencyKey: 'short',
    amount: 100,
    reason: 'x',
    sourceType: 'challenge',
    sourceId: 'walk-5k'
  }))
})
