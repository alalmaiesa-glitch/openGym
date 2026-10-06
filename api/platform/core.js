import crypto from 'node:crypto'

export const ACTIVITY_TYPES = Object.freeze(new Set([
  'walk',
  'run',
  'gym_machine_use',
  'equipment_contribution',
  'equipment_feedback',
  'coach_session',
  'recovery_session',
  'event_participation'
]))

export const ACTIVITY_SOURCES = Object.freeze(new Set([
  'gps',
  'healthkit',
  'health_connect',
  'huawei_health',
  'equipment_qr',
  'machine_scan',
  'wearable',
  'coach',
  'partner',
  'manual'
]))

export const CHALLENGE_METRICS = Object.freeze(new Set([
  'steps',
  'distance_m',
  'active_minutes',
  'verified_machine_uses',
  'verified_contributions'
]))

export const REWARD_KINDS = Object.freeze(new Set([
  'pt650_credit',
  'access_days',
  'coupon',
  'partner_benefit'
]))

export const VERIFICATION_STATES = Object.freeze(new Set([
  'pending',
  'verified',
  'rejected',
  'review'
]))

const IDEMPOTENCY_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/
const SHA256_RE = /^[a-f0-9]{64}$/i
const MAX_EVENT_AGE_MS = 31 * 24 * 60 * 60 * 1000
const MAX_FUTURE_SKEW_MS = 10 * 60 * 1000

const finiteInt = (value, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const n = Number(value)
  return Number.isSafeInteger(n) && n >= min && n <= max ? n : null
}

const finiteNumber = (value, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const n = Number(value)
  return Number.isFinite(n) && n >= min && n <= max ? n : null
}

const cleanText = (value, max = 240) =>
  typeof value === 'string' ? value.trim().slice(0, max) : ''

const cleanId = value => {
  const v = cleanText(value, 128)
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(v) ? v : null
}

export function stableHash(value) {
  return crypto.createHash('sha256')
    .update(typeof value === 'string' ? value : JSON.stringify(value))
    .digest('hex')
}

export function newPlatformId() {
  return crypto.randomUUID()
}

function metricPayload(type, payload = {}) {
  switch (type) {
    case 'walk':
    case 'run': {
      const steps = finiteInt(payload.steps, 0, 250000)
      const distanceM = finiteNumber(payload.distanceM, 0, 500000)
      const durationSec = finiteInt(payload.durationSec, 1, 24 * 60 * 60)
      if (steps == null && distanceM == null && durationSec == null) return null
      return {
        ...(steps != null ? { steps } : {}),
        ...(distanceM != null ? { distanceM: Math.round(distanceM * 10) / 10 } : {}),
        ...(durationSec != null ? { durationSec } : {})
      }
    }
    case 'gym_machine_use': {
      const machineInstanceId = cleanId(payload.machineInstanceId)
      const equipmentModelId = cleanId(payload.equipmentModelId)
      if (!machineInstanceId && !equipmentModelId) return null
      const sets = finiteInt(payload.sets, 0, 100)
      const reps = finiteInt(payload.reps, 0, 5000)
      const durationSec = finiteInt(payload.durationSec, 0, 4 * 60 * 60)
      return {
        ...(machineInstanceId ? { machineInstanceId } : {}),
        ...(equipmentModelId ? { equipmentModelId } : {}),
        ...(sets != null ? { sets } : {}),
        ...(reps != null ? { reps } : {}),
        ...(durationSec != null ? { durationSec } : {})
      }
    }
    case 'equipment_contribution': {
      const contributionType = cleanText(payload.contributionType, 48)
      const equipmentModelId = cleanId(payload.equipmentModelId)
      const machineInstanceId = cleanId(payload.machineInstanceId)
      if (!contributionType || (!equipmentModelId && !machineInstanceId)) return null
      return {
        contributionType,
        ...(equipmentModelId ? { equipmentModelId } : {}),
        ...(machineInstanceId ? { machineInstanceId } : {}),
        fieldsCompleted: finiteInt(payload.fieldsCompleted, 0, 100) ?? 0
      }
    }
    case 'equipment_feedback': {
      const equipmentModelId = cleanId(payload.equipmentModelId)
      const machineInstanceId = cleanId(payload.machineInstanceId)
      if (!equipmentModelId && !machineInstanceId) return null
      const rating = finiteInt(payload.rating, 1, 5)
      return {
        ...(equipmentModelId ? { equipmentModelId } : {}),
        ...(machineInstanceId ? { machineInstanceId } : {}),
        ...(rating != null ? { rating } : {}),
        note: cleanText(payload.note, 1000),
        issueCodes: Array.isArray(payload.issueCodes)
          ? [...new Set(payload.issueCodes.map(x => cleanText(x, 48)).filter(Boolean))].slice(0, 12)
          : []
      }
    }
    case 'coach_session':
    case 'recovery_session':
    case 'event_participation': {
      const providerId = cleanId(payload.providerId)
      const bookingId = cleanId(payload.bookingId)
      const durationSec = finiteInt(payload.durationSec, 0, 24 * 60 * 60)
      if (!providerId && !bookingId) return null
      return {
        ...(providerId ? { providerId } : {}),
        ...(bookingId ? { bookingId } : {}),
        ...(durationSec != null ? { durationSec } : {})
      }
    }
    default:
      return null
  }
}

/**
 * Client-facing ingestion validation. It deliberately cannot mark an event verified:
 * verification is a server/worker decision after evidence checks, never a claim from the app.
 */
export function validateActivityEvent(input, { now = Date.now() } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, code: 'invalid-event' }
  }

  const type = cleanText(input.type, 48)
  const source = cleanText(input.source, 48)
  const idempotencyKey = cleanText(input.idempotencyKey, 128)
  const occurredAt = Date.parse(input.occurredAt)

  if (!ACTIVITY_TYPES.has(type)) return { ok: false, code: 'invalid-type' }
  if (!ACTIVITY_SOURCES.has(source)) return { ok: false, code: 'invalid-source' }
  if (!IDEMPOTENCY_RE.test(idempotencyKey)) return { ok: false, code: 'invalid-idempotency-key' }
  if (!Number.isFinite(occurredAt)) return { ok: false, code: 'invalid-occurred-at' }
  if (occurredAt > now + MAX_FUTURE_SKEW_MS) return { ok: false, code: 'future-event' }
  if (occurredAt < now - MAX_EVENT_AGE_MS) return { ok: false, code: 'event-too-old' }

  const payload = metricPayload(type, input.payload)
  if (!payload) return { ok: false, code: 'invalid-payload' }

  const evidence = input.evidence && typeof input.evidence === 'object' && !Array.isArray(input.evidence)
    ? {
        method: cleanText(input.evidence.method, 48) || source,
        ...(cleanId(input.evidence.artifactId) ? { artifactId: cleanId(input.evidence.artifactId) } : {}),
        ...(SHA256_RE.test(String(input.evidence.sha256 || '')) ? { sha256: String(input.evidence.sha256).toLowerCase() } : {})
      }
    : { method: source }

  return {
    ok: true,
    event: {
      id: newPlatformId(),
      type,
      source,
      occurredAt: new Date(occurredAt).toISOString(),
      idempotencyKey,
      payload,
      evidence,
      verification: 'pending',
      risk: 'pending'
    }
  }
}

export function contributionRewardQuality(event) {
  if (!event || event.verification !== 'verified' || event.risk !== 'clear') {
    return { eligible: false, score: 0, reason: 'not-verified' }
  }

  if (event.type === 'equipment_feedback') {
    // Rating polarity is intentionally excluded. A 1/5 review and a 5/5 review earn the same
    // when both are complete and verified; PT650 must never pay people to praise a sponsor.
    const usefulFields = [
      Number.isInteger(event.payload?.rating),
      !!cleanText(event.payload?.note, 1000),
      Array.isArray(event.payload?.issueCodes) && event.payload.issueCodes.length > 0
    ].filter(Boolean).length
    return { eligible: true, score: 40 + usefulFields * 20, reason: 'verified-feedback' }
  }

  if (event.type === 'equipment_contribution') {
    const completed = finiteInt(event.payload?.fieldsCompleted, 0, 100) ?? 0
    return {
      eligible: true,
      score: Math.min(100, 50 + completed),
      reason: 'verified-contribution'
    }
  }

  return { eligible: false, score: 0, reason: 'not-contribution' }
}

export function snapshotChallenge(input) {
  if (!input || typeof input !== 'object') return { ok: false, code: 'invalid-challenge' }
  const id = cleanId(input.id)
  const version = finiteInt(input.version, 1, 1_000_000)
  const metric = cleanText(input.metric, 48)
  const target = finiteNumber(input.target, 1, 1_000_000_000)
  const rewardKind = cleanText(input.reward?.kind, 48)
  const rewardValue = finiteInt(input.reward?.value, 1, 1_000_000_000)
  const sponsorId = cleanId(input.sponsorId)
  const startsAt = Date.parse(input.startsAt)
  const endsAt = Date.parse(input.endsAt)

  if (!id || !version || !CHALLENGE_METRICS.has(metric) || target == null) return { ok: false, code: 'invalid-metric' }
  if (!REWARD_KINDS.has(rewardKind) || rewardValue == null) return { ok: false, code: 'invalid-reward' }
  if (!sponsorId) return { ok: false, code: 'invalid-sponsor' }
  if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || endsAt <= startsAt) return { ok: false, code: 'invalid-window' }

  const disclosure = cleanText(input.disclosure, 600)
  const verification = cleanText(input.verification, 240)
  if (!disclosure || !verification) return { ok: false, code: 'missing-disclosure' }

  const snapshot = {
    id,
    version,
    metric,
    target,
    startsAt: new Date(startsAt).toISOString(),
    endsAt: new Date(endsAt).toISOString(),
    sponsorId,
    reward: { kind: rewardKind, value: rewardValue },
    disclosure,
    verification
  }
  return { ok: true, snapshot: { ...snapshot, termsHash: stableHash(snapshot) } }
}

export function progressFromEvent(metric, event) {
  if (!event || event.verification !== 'verified' || event.risk !== 'clear') return 0
  switch (metric) {
    case 'steps':
      return event.type === 'walk' || event.type === 'run' ? finiteInt(event.payload?.steps, 0) ?? 0 : 0
    case 'distance_m':
      return event.type === 'walk' || event.type === 'run' ? finiteNumber(event.payload?.distanceM, 0) ?? 0 : 0
    case 'active_minutes':
      return event.type === 'walk' || event.type === 'run'
        ? Math.floor((finiteInt(event.payload?.durationSec, 0) ?? 0) / 60)
        : 0
    case 'verified_machine_uses':
      return event.type === 'gym_machine_use' ? 1 : 0
    case 'verified_contributions':
      return ['equipment_contribution', 'equipment_feedback'].includes(event.type) ? 1 : 0
    default:
      return 0
  }
}

export function challengeCompletion(snapshot, progress, now = Date.now()) {
  if (!snapshot || !CHALLENGE_METRICS.has(snapshot.metric)) return { complete: false, reason: 'invalid-challenge' }
  const start = Date.parse(snapshot.startsAt)
  const end = Date.parse(snapshot.endsAt)
  if (now < start) return { complete: false, reason: 'not-started' }
  if (now > end) return { complete: false, reason: 'ended' }
  const current = finiteNumber(progress, 0) ?? 0
  return {
    complete: current >= snapshot.target,
    current,
    target: snapshot.target,
    remaining: Math.max(0, snapshot.target - current)
  }
}

export function ledgerEntry({
  userId,
  idempotencyKey,
  amount,
  currency = 'PTC',
  reason,
  sourceType,
  sourceId,
  metadata = {}
}) {
  const uid = cleanId(userId)
  const key = cleanText(idempotencyKey, 128)
  const n = Number(amount)
  if (!uid || !IDEMPOTENCY_RE.test(key)) throw new Error('invalid ledger identity')
  if (!Number.isSafeInteger(n) || n === 0) throw new Error('ledger amount must be a non-zero integer')
  if (!/^[A-Z0-9]{2,12}$/.test(currency)) throw new Error('invalid ledger currency')

  return Object.freeze({
    id: newPlatformId(),
    userId: uid,
    idempotencyKey: key,
    amount: n,
    currency,
    reason: cleanText(reason, 160),
    sourceType: cleanText(sourceType, 48),
    sourceId: cleanId(sourceId),
    metadata: metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {},
    createdAt: new Date().toISOString()
  })
}

export function rewardSettlementDecision({ enrollment, progress, risk = 'clear', alreadySettled = false, now = Date.now() }) {
  if (!enrollment?.challenge) return { settle: false, reason: 'missing-enrollment' }
  if (alreadySettled) return { settle: false, reason: 'already-settled' }
  if (risk !== 'clear') return { settle: false, reason: risk === 'rejected' ? 'rejected' : 'review' }

  const status = challengeCompletion(enrollment.challenge, progress, now)
  if (!status.complete) return { settle: false, reason: status.reason || 'incomplete', progress: status }

  return {
    settle: true,
    mode: 'instant',
    reward: enrollment.challenge.reward,
    termsHash: enrollment.challenge.termsHash,
    progress: status
  }
}
