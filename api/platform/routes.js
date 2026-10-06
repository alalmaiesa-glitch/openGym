import { validateActivityEvent } from './core.js'
import { verifyGpsWalk } from './gps.js'
import { PlatformError, platformConfigured, platformRpc } from './supabase.js'

const SESSION_ID_RE = /^[A-Za-z0-9_-]{16,96}$/

const firstRow = data => Array.isArray(data) ? data[0] : data

const replyPlatformError = (json, res, e) => {
  if (e instanceof PlatformError) {
    return json(res, e.status, { error: e.message, code: e.code })
  }
  console.error('PT650 platform route failed:', e?.message || e)
  return json(res, 503, { error: 'PT650 platform service is unavailable', code: 'platform-unavailable' })
}

export function platformRoutes({ json, readBody, readSession }) {
  return {
    'GET /api/platform/status': async (req, res) => {
      const user = readSession(req)
      if (!user) return json(res, 401, { error: 'not signed in' })
      json(res, 200, { configured: platformConfigured(), mode: 'server-only' })
    },

    'GET /api/move/challenges': async (req, res) => {
      const user = readSession(req)
      if (!user) return json(res, 401, { error: 'not signed in' })
      try {
        const challenges = await platformRpc('pt650_move_challenges', { p_user_id: user.id })
        json(res, 200, { challenges: Array.isArray(challenges) ? challenges : [] })
      } catch (e) {
        replyPlatformError(json, res, e)
      }
    },

    'POST /api/move/enroll': async (req, res) => {
      const user = readSession(req)
      if (!user) return json(res, 401, { error: 'not signed in' })
      const body = await readBody(req)
      const challengeId = typeof body.challengeId === 'string' ? body.challengeId.trim() : ''
      const version = Number(body.version)
      if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(challengeId)
          || !Number.isSafeInteger(version) || version < 1) {
        return json(res, 400, { error: 'invalid challenge', code: 'invalid-challenge' })
      }

      try {
        const data = await platformRpc('pt650_enroll_challenge', {
          p_user_id: user.id,
          p_challenge_id: challengeId,
          p_challenge_version: version
        })
        const row = firstRow(data)
        if (!row) return json(res, 503, { error: 'challenge enrollment failed', code: 'platform-upstream' })
        const status = row.outcome === 'sold_out' ? 409 : row.outcome === 'unavailable' ? 404 : 200
        json(res, status, row)
      } catch (e) {
        replyPlatformError(json, res, e)
      }
    },

    'GET /api/rewards/summary': async (req, res) => {
      const user = readSession(req)
      if (!user) return json(res, 401, { error: 'not signed in' })
      try {
        const data = await platformRpc('pt650_reward_summary', { p_user_id: user.id })
        json(res, 200, firstRow(data) || { ptc_balance: 0, active_access_until: null, settled_rewards: 0 })
      } catch (e) {
        replyPlatformError(json, res, e)
      }
    },

    'POST /api/move/session': async (req, res) => {
      const user = readSession(req)
      if (!user) return json(res, 401, { error: 'not signed in' })

      const body = await readBody(req)
      const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
      if (!SESSION_ID_RE.test(sessionId)) {
        return json(res, 400, { error: 'invalid walking session id', code: 'invalid-session-id' })
      }

      const verified = verifyGpsWalk(body.points)
      if (!verified.ok) {
        return json(res, 422, {
          error: 'walking session could not be verified',
          code: verified.code
        })
      }

      const occurredAt = new Date(Number(body.points.at(-1)?.t)).toISOString()
      const checked = validateActivityEvent({
        type: 'walk',
        source: 'gps',
        occurredAt,
        idempotencyKey: 'move:' + sessionId,
        payload: {
          distanceM: verified.summary.distanceM,
          durationSec: verified.summary.durationSec
        },
        evidence: verified.evidenceSha256
          ? { method: 'gps', sha256: verified.evidenceSha256 }
          : { method: 'gps' }
      })

      if (!checked.ok) {
        return json(res, 422, { error: 'walking event is invalid', code: checked.code })
      }

      try {
        const ingestData = await platformRpc('pt650_ingest_activity', {
          p_user_id: user.id,
          p_idempotency_key: checked.event.idempotencyKey,
          p_event_id: checked.event.id,
          p_event_type: checked.event.type,
          p_source: checked.event.source,
          p_occurred_at: checked.event.occurredAt,
          p_payload: checked.event.payload,
          p_evidence_artifact_id: null,
          p_evidence_sha256: verified.evidenceSha256 || null,
          p_venue_id: null,
          p_equipment_model_id: null,
          p_equipment_instance_id: null
        })
        const ingest = firstRow(ingestData)
        if (!ingest?.event_id || !ingest?.received_at) {
          return json(res, 503, { error: 'activity ingest failed', code: 'platform-upstream' })
        }

        const finalization = await platformRpc('pt650_finalize_activity', {
          p_received_at: ingest.received_at,
          p_event_id: ingest.event_id,
          p_verification_status: verified.verified ? 'verified' : 'review',
          p_risk_status: verified.risk || (verified.verified ? 'clear' : 'review')
        })

        const result = firstRow(finalization) ?? finalization ?? {}
        json(res, 200, {
          ok: true,
          duplicate: !!ingest.duplicate,
          verification: verified.verified ? 'verified' : 'review',
          summary: verified.summary,
          rewards: result.applications || [],
          eventId: ingest.event_id
        })
      } catch (e) {
        replyPlatformError(json, res, e)
      }
    }
  }
}
