import test from 'node:test'
import assert from 'node:assert/strict'
import {
  EVENT_STREAM_SHARDS,
  PRIVACY_MIN_DISTINCT_USERS,
  evidenceExpiry,
  manufacturerAggregate,
  monthPartition,
  outboxRetryDelayMs,
  streamShard
} from '../platform/scale.js'

test('event sharding is deterministic and bounded', () => {
  const a = streamShard('user-123')
  const b = streamShard('user-123')
  assert.equal(a, b)
  assert.ok(a >= 0 && a < EVENT_STREAM_SHARDS)
  assert.throws(() => streamShard('x', 0))
})

test('partition names use UTC month boundaries', () => {
  assert.equal(monthPartition('2026-10-31T23:59:59Z'), 'activity_events_2026_10')
  assert.equal(monthPartition('2026-11-01T00:00:00Z'), 'activity_events_2026_11')
})

test('raw GPS and machine photo evidence expires quickly by default', () => {
  assert.equal(evidenceExpiry('gps_route', '2026-10-06T00:00:00Z'), '2026-10-09T00:00:00.000Z')
  assert.equal(evidenceExpiry('machine_photo', '2026-10-06T00:00:00Z'), '2026-10-13T00:00:00.000Z')
  assert.equal(evidenceExpiry('manufacturer_label', '2026-10-06T00:00:00Z'), '2026-11-05T00:00:00.000Z')
})

test('manufacturer analytics suppress small cohorts', () => {
  assert.equal(PRIVACY_MIN_DISTINCT_USERS, 20)
  assert.deepEqual(manufacturerAggregate({
    day: '2026-10-06',
    equipment_model_id: 'model-x',
    distinct_users: 19,
    verified_uses: 200
  }), {
    suppressed: true,
    reason: 'privacy-threshold',
    minimumDistinctUsers: 20
  })

  assert.deepEqual(manufacturerAggregate({
    day: '2026-10-06',
    equipment_model_id: 'model-x',
    country_code: 'SA',
    city: 'Riyadh',
    distinct_users: 20,
    verified_uses: 200,
    returning_users: 8,
    feedback_count: 5
  }), {
    suppressed: false,
    day: '2026-10-06',
    equipmentModelId: 'model-x',
    countryCode: 'SA',
    city: 'Riyadh',
    verifiedUses: 200,
    distinctUsers: 20,
    returningUsers: 8,
    feedbackCount: 5
  })
})

test('outbox retry delay backs off and caps', () => {
  assert.equal(outboxRetryDelayMs(0), 1000)
  assert.equal(outboxRetryDelayMs(1), 2000)
  assert.equal(outboxRetryDelayMs(20), 15 * 60_000)
})
