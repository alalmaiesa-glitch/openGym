import crypto from 'node:crypto'

export const PRIVACY_MIN_DISTINCT_USERS = 20
export const EVENT_STREAM_SHARDS = 64

const EVIDENCE_RETENTION_DAYS = Object.freeze({
  gps_route: 3,
  machine_photo: 7,
  manufacturer_label: 30,
  qr_capture: 7,
  wearable_proof: 3
})

export function streamShard(key, shards = EVENT_STREAM_SHARDS) {
  if (!Number.isInteger(shards) || shards < 1 || shards > 4096) throw new Error('invalid shard count')
  const digest = crypto.createHash('sha256').update(String(key || '')).digest()
  return digest.readUInt32BE(0) % shards
}

export function monthPartition(receivedAt) {
  const d = new Date(receivedAt)
  if (!Number.isFinite(d.getTime())) throw new Error('invalid date')
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `activity_events_${y}_${m}`
}

export function evidenceExpiry(kind, createdAt = Date.now()) {
  const days = EVIDENCE_RETENTION_DAYS[kind]
  if (!days) throw new Error('unknown evidence kind')
  const t = new Date(createdAt).getTime()
  if (!Number.isFinite(t)) throw new Error('invalid createdAt')
  return new Date(t + days * 86400000).toISOString()
}

export function manufacturerAggregate(row, { minUsers = PRIVACY_MIN_DISTINCT_USERS } = {}) {
  const distinctUsers = Math.max(0, Number(row?.distinctUsers ?? row?.distinct_users) || 0)
  if (distinctUsers < minUsers) {
    return {
      suppressed: true,
      reason: 'privacy-threshold',
      minimumDistinctUsers: minUsers
    }
  }

  return {
    suppressed: false,
    day: row?.day || null,
    equipmentModelId: row?.equipmentModelId ?? row?.equipment_model_id ?? null,
    countryCode: row?.countryCode ?? row?.country_code ?? null,
    city: row?.city || null,
    verifiedUses: Math.max(0, Number(row?.verifiedUses ?? row?.verified_uses) || 0),
    distinctUsers,
    returningUsers: Math.max(0, Number(row?.returningUsers ?? row?.returning_users) || 0),
    feedbackCount: Math.max(0, Number(row?.feedbackCount ?? row?.feedback_count) || 0)
  }
}

export function outboxRetryDelayMs(attempt) {
  const n = Math.max(0, Math.min(12, Math.floor(Number(attempt) || 0)))
  return Math.min(15 * 60_000, 1000 * (2 ** n))
}
