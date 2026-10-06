import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import { verifyGpsWalk } from "./gps.ts"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Cache-Control": "no-store"
}

const json = (body: unknown, status = 200, extra: Record<string,string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, ...extra, "Content-Type": "application/json; charset=utf-8" }
  })

const supabaseUrl = Deno.env.get("SUPABASE_URL") || ""
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || ""
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

async function caller(req: Request) {
  const auth = req.headers.get("authorization") || ""
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : ""
  if (!token) return null
  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: "Bearer " + token } }
  })
  const { data, error } = await userClient.auth.getUser(token)
  return error || !data.user ? null : data.user
}

const first = (data: any) => Array.isArray(data) ? data[0] : data

const APPLE_HEALTH_METRICS = new Set([
  "weight_kg", "body_fat_pct", "resting_hr_bpm", "hrv_sdnn_ms",
  "spo2_pct", "respiratory_rate", "body_temp_c", "sleep_duration_min"
])
const HEALTH_CONNECT_METRICS = new Set([
  "weight_kg", "body_fat_pct", "resting_hr_bpm", "hrv_rmssd_ms",
  "spo2_pct", "respiratory_rate", "body_temp_c", "sleep_duration_min"
])
const NATIVE_HEALTH_ACTIVITIES = new Set([
  "run", "walk", "cycling", "swimming", "hiking", "rowing", "elliptical",
  "strength_training", "functional_strength", "hiit", "yoga", "pilates", "other"
])
const UUID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const HEALTH_CONNECT_ID_RE = /^[A-Za-z0-9._:-]{1,256}$/

function validNativeExternalKey(provider: string, value: unknown) {
  const key = String(value || "")
  return provider === "apple_health" ? UUID_RE.test(key) : HEALTH_CONNECT_ID_RE.test(key)
}

function nativeObject(value: unknown) {
  return value != null && typeof value === "object" && !Array.isArray(value)
}

function hasRawLocation(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasRawLocation)
  if (!nativeObject(value)) return false
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const k = key.toLowerCase()
    if (["lat","lng","latitude","longitude","gps","locations","coordinates","routepoints","workoutroute"].includes(k)) return true
    if (hasRawLocation(child)) return true
  }
  return false
}

async function rate(userId: string, route: string, limit: number, seconds: number) {
  const { data, error } = await admin.rpc("pt650_rate_limit", {
    p_user_id: userId,
    p_route: route,
    p_limit: limit,
    p_window_seconds: seconds
  })
  if (error) throw error
  return first(data) || { allowed: false, remaining: 0, retry_after: 60 }
}

async function boundedJson(req: Request, max = 600_000) {
  const announced = Number(req.headers.get("content-length") || 0)
  if (announced > max) throw Object.assign(new Error("request too large"), { status: 413, code: "too-large" })
  const text = await req.text()
  if (new TextEncoder().encode(text).byteLength > max) throw Object.assign(new Error("request too large"), { status: 413, code: "too-large" })
  try { return text ? JSON.parse(text) : {} }
  catch { throw Object.assign(new Error("invalid JSON"), { status: 400, code: "bad-json" }) }
}

function actionOf(req: Request) {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean)
  const i = parts.lastIndexOf("pt650-platform")
  return i >= 0 ? (parts[i + 1] || "status") : (parts.at(-1) || "status")
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors })

  const user = await caller(req)
  if (!user) return json({ error: "unauthorized", code: "auth" }, 401)

  const action = actionOf(req)

  try {

    if (req.method === "GET" && action === "account") {
      const gate = await rate(user.id, "account", 60, 60)
      if (!gate.allowed) return json({ error: "rate limit", code: "rate-limit" }, 429, { "Retry-After": String(gate.retry_after) })

      const acceptLanguage = (req.headers.get("accept-language") || "ar").split(",")[0].trim()
      const locale = /^[A-Za-z]{2,3}([_-][A-Za-z0-9]{2,8})?$/.test(acceptLanguage) ? acceptLanguage : "ar"
      const { data, error } = await admin.rpc("pt650_account_bootstrap", {
        p_user_id: user.id,
        p_locale: locale
      })
      if (error) throw error
      return json({
        id: user.id,
        email: user.email || null,
        emailConfirmed: !!user.email_confirmed_at,
        profile: first(data) || null
      })
    }

    if (req.method === "POST" && action === "profile") {
      const gate = await rate(user.id, "profile", 30, 3600)
      if (!gate.allowed) return json({ error: "rate limit", code: "rate-limit" }, 429, { "Retry-After": String(gate.retry_after) })
      const body = await boundedJson(req, 16_000)
      const displayName = typeof body.displayName === "string" ? body.displayName.trim() : ""
      const locale = typeof body.locale === "string" ? body.locale.trim() : "ar"
      if (displayName.length > 80 || !/^[A-Za-z]{2,3}([_-][A-Za-z0-9]{2,8})?$/.test(locale)) {
        return json({ error: "invalid profile", code: "invalid-profile" }, 400)
      }
      const { data, error } = await admin.rpc("pt650_account_update_profile", {
        p_user_id: user.id,
        p_display_name: displayName || null,
        p_locale: locale
      })
      if (error) throw error
      return json({
        id: user.id,
        email: user.email || null,
        profile: first(data) || null
      })
    }


    if (req.method === "GET" && action === "training-rev") {
      const gate = await rate(user.id, "training-rev", 180, 60)
      if (!gate.allowed) return json({ error: "rate limit", code: "rate-limit" }, 429, { "Retry-After": String(gate.retry_after) })
      const { data, error } = await admin.rpc("pt650_training_revision", { p_user_id: user.id })
      if (error) throw error
      const row = first(data)
      return json({
        rev: Number(row?.rev || 0),
        stateTs: Number(row?.state_ts || 0),
        updatedAt: row?.updated_at || null
      })
    }

    if (req.method === "GET" && action === "training-state") {
      const gate = await rate(user.id, "training-read", 120, 3600)
      if (!gate.allowed) return json({ error: "rate limit", code: "rate-limit" }, 429, { "Retry-After": String(gate.retry_after) })
      const { data, error } = await admin.rpc("pt650_training_get", { p_user_id: user.id })
      if (error) throw error
      const row = first(data)
      return json(row ? {
        rev: Number(row.rev || 0),
        state: row.state || null,
        stateTs: Number(row.state_ts || 0),
        updatedAt: row.updated_at || null
      } : { rev: 0, state: null, stateTs: 0, updatedAt: null })
    }

    if (req.method === "POST" && action === "training-state") {
      const gate = await rate(user.id, "training-write", 900, 3600)
      if (!gate.allowed) return json({ error: "rate limit", code: "rate-limit" }, 429, { "Retry-After": String(gate.retry_after) })
      const body = await boundedJson(req, 2_700_000)
      const state = body?.state
      const baseRev = body?.baseRev == null ? null : Number(body.baseRev)
      const stateTs = Number(state?._ts || body?.stateTs || 0)
      if (!state || typeof state !== "object" || Array.isArray(state)) {
        return json({ error: "invalid training state", code: "invalid-state" }, 400)
      }
      if (baseRev != null && (!Number.isSafeInteger(baseRev) || baseRev < 0)) {
        return json({ error: "invalid base revision", code: "invalid-revision" }, 400)
      }
      if (!Number.isSafeInteger(stateTs) || stateTs < 0) {
        return json({ error: "invalid state timestamp", code: "invalid-state-ts" }, 400)
      }

      const { data, error } = await admin.rpc("pt650_training_put", {
        p_user_id: user.id,
        p_base_revision: baseRev,
        p_state: state,
        p_state_ts: stateTs
      })
      if (error) {
        if (error.code === "22001") return json({ error: "training state too large", code: "state-too-large" }, 413)
        throw error
      }
      const row = first(data)
      if (!row) throw new Error("bad training sync response")

      // Health indexing is a derived side-effect of a successful workout-cloud write. A Health
      // bridge failure must never roll back or misreport the already-saved training document.
      if (row.outcome === "written" && Array.isArray(state.bodyweight) && state.bodyweight.length) {
        const { error: healthBridgeError } = await admin.rpc("pt650_health_ingest_bodyweight_batch", {
          p_user_id: user.id,
          p_unit: state.unit === "lb" ? "lb" : "kg",
          p_entries: state.bodyweight
        })
        if (healthBridgeError) console.error("pt650-health-weight-bridge", healthBridgeError.message)
      }

      const payload = {
        rev: Number(row.rev || 0),
        stateTs: Number(row.state_ts || 0),
        updatedAt: row.updated_at || null,
        ...(row.state ? { state: row.state } : {})
      }
      return json(payload, row.outcome === "conflict" ? 409 : 200)
    }



    if (req.method === "GET" && action === "wearable-framework") {
      const gate = await rate(user.id, "wearable-framework", 60, 60)
      if (!gate.allowed) return json({ error: "rate limit", code: "rate-limit" }, 429, { "Retry-After": String(gate.retry_after) })

      const { data, error } = await admin.rpc("pt650_wearable_framework", { p_user_id: user.id })
      if (error) throw error
      return json(first(data) ?? data ?? { adapters: [], connections: [], sync: { queued: 0, leased: 0, dead: 0 } })
    }

    if (req.method === "POST" && action === "wearable-priority") {
      const gate = await rate(user.id, "wearable-priority", 30, 3600)
      if (!gate.allowed) return json({ error: "rate limit", code: "rate-limit" }, 429, { "Retry-After": String(gate.retry_after) })

      const body = await boundedJson(req, 12_000)
      const provider = typeof body.provider === "string" ? body.provider.trim() : ""
      const scopeKey = typeof body.scopeKey === "string" && body.scopeKey.trim() ? body.scopeKey.trim() : "*"
      const priority = Number(body.priority)
      const enabled = body.enabled !== false

      if (!/^[a-z0-9][a-z0-9_-]{1,63}$/.test(provider)
          || !/^[a-z*][a-z0-9_*.:+-]{0,79}$/.test(scopeKey)
          || !Number.isSafeInteger(priority) || priority < 0 || priority > 1000) {
        return json({ error: "invalid source priority", code: "invalid-priority" }, 400)
      }

      const { data, error } = await admin.rpc("pt650_wearable_set_priority", {
        p_user_id: user.id,
        p_provider: provider,
        p_scope_key: scopeKey,
        p_priority: priority,
        p_enabled: enabled
      })
      if (error) throw error
      return json({ ok: true, provider, scopeKey, priority: Number(first(data) ?? data ?? priority), enabled })
    }


    if (req.method === "POST" && action === "wearable-native-ingest") {
      const gate = await rate(user.id, "wearable-native-ingest", 120, 3600)
      if (!gate.allowed) return json({ error: "rate limit", code: "rate-limit" }, 429, { "Retry-After": String(gate.retry_after) })

      const body = await boundedJson(req, 1_200_000)
      const provider = typeof body.provider === "string" ? body.provider.trim() : ""
      const permissionState = nativeObject(body.permissionState) ? body.permissionState : {}
      const cursor = nativeObject(body.cursor) ? body.cursor : null
      const cursorKey = typeof body.cursorKey === "string" ? body.cursorKey.trim() : ""
      const observations = Array.isArray(body.observations) ? body.observations : null
      const activities = Array.isArray(body.activities) ? body.activities : null
      const deletions = Array.isArray(body.deletions) ? body.deletions : null
      const highWatermark = body.highWatermark == null ? null : String(body.highWatermark)

      if (!["apple_health","health_connect"].includes(provider)
          || !cursor || !/^[a-z][a-z0-9_.:-]{0,79}$/.test(cursorKey)
          || observations == null || activities == null || deletions == null
          || observations.length > 1000 || activities.length > 250 || deletions.length > 1000
          || observations.length + activities.length + deletions.length > 1500) {
        return json({ error: "invalid native health batch", code: "invalid-native-batch" }, 400)
      }
      if ("anchor" in cursor || "anchors" in cursor || hasRawLocation(body)) {
        return json({ error: "native cursor/location payload rejected", code: "unsafe-native-payload" }, 400)
      }
      if (highWatermark && Number.isNaN(Date.parse(highWatermark))) {
        return json({ error: "invalid high watermark", code: "invalid-native-batch" }, 400)
      }

      const allowedMetrics = provider === "apple_health" ? APPLE_HEALTH_METRICS : HEALTH_CONNECT_METRICS
      for (const item of observations) {
        if (!nativeObject(item)
            || !validNativeExternalKey(provider, item.externalKey)
            || !allowedMetrics.has(String(item.metric || ""))) {
          return json({ error: "invalid native health observation", code: "invalid-native-observation" }, 400)
        }
      }
      for (const item of activities) {
        if (!nativeObject(item)
            || !validNativeExternalKey(provider, item.externalKey)
            || !NATIVE_HEALTH_ACTIVITIES.has(String(item.activityType || ""))) {
          return json({ error: "invalid native health activity", code: "invalid-native-activity" }, 400)
        }
      }
      for (const item of deletions) {
        if (!nativeObject(item)
            || !validNativeExternalKey(provider, item.externalKey)
            || !["observation","activity"].includes(String(item.objectKind || ""))) {
          return json({ error: "invalid native health deletion", code: "invalid-native-deletion" }, 400)
        }
      }

      const { data, error } = await admin.rpc("pt650_wearable_ingest_native_batch", {
        p_user_id: user.id,
        p_provider: provider,
        p_permission_state: permissionState,
        p_cursor_key: cursorKey,
        p_cursor: cursor,
        p_high_watermark: highWatermark,
        p_observations: observations,
        p_activities: activities,
        p_deletions: deletions
      })
      if (error) throw error
      return json(first(data) ?? data ?? { status: "pending", cursorCommitted: false })
    }

    if (req.method === "GET" && action === "health-summary") {
      const gate = await rate(user.id, "health-summary", 120, 60)
      if (!gate.allowed) return json({ error: "rate limit", code: "rate-limit" }, 429, { "Retry-After": String(gate.retry_after) })

      // Backfill pre-Health-Core workout weigh-ins once/idempotently. A derived index problem must
      // not make the athlete's Health dashboard unavailable.
      const { error: reindexError } = await admin.rpc("pt650_health_reindex_workout", { p_user_id: user.id })
      if (reindexError) console.error("pt650-health-reindex", reindexError.message)

      const { data, error } = await admin.rpc("pt650_health_summary", { p_user_id: user.id })
      if (error) throw error
      return json(first(data) ?? data ?? { latest: {}, activity30d: { count: 0, distanceM: 0, durationSec: 0 }, sources: [] })
    }

    if (req.method === "GET" && action === "health-activities") {
      const gate = await rate(user.id, "health-activities", 120, 60)
      if (!gate.allowed) return json({ error: "rate limit", code: "rate-limit" }, 429, { "Retry-After": String(gate.retry_after) })
      const rawLimit = Number(new URL(req.url).searchParams.get("limit") || 20)
      const limit = Number.isSafeInteger(rawLimit) ? Math.max(1, Math.min(rawLimit, 100)) : 20
      const { data, error } = await admin.rpc("pt650_health_recent_activities", {
        p_user_id: user.id,
        p_limit: limit
      })
      if (error) throw error
      return json({ activities: data || [] })
    }

    if (req.method === "GET" && action === "health-adapters") {
      const gate = await rate(user.id, "health-adapters", 60, 60)
      if (!gate.allowed) return json({ error: "rate limit", code: "rate-limit" }, 429, { "Retry-After": String(gate.retry_after) })
      const { data, error } = await admin.rpc("pt650_health_adapter_status")
      if (error) throw error
      return json({ adapters: data || [] })
    }

    if (req.method === "GET" && action === "status") {
      return json({ ok: true, mode: "edge", userId: user.id })
    }

    if (req.method === "GET" && action === "challenges") {
      const gate = await rate(user.id, "challenges", 120, 60)
      if (!gate.allowed) return json({ error: "rate limit", code: "rate-limit" }, 429, { "Retry-After": String(gate.retry_after) })
      const { data, error } = await admin.rpc("pt650_move_challenges", { p_user_id: user.id })
      if (error) throw error
      return json({ challenges: data || [] })
    }

    if (req.method === "GET" && action === "rewards") {
      const gate = await rate(user.id, "rewards", 120, 60)
      if (!gate.allowed) return json({ error: "rate limit", code: "rate-limit" }, 429, { "Retry-After": String(gate.retry_after) })
      const { data, error } = await admin.rpc("pt650_reward_summary", { p_user_id: user.id })
      if (error) throw error
      return json(first(data) || { ptc_balance: 0, active_access_until: null, settled_rewards: 0 })
    }

    if (req.method === "POST" && action === "enroll") {
      const gate = await rate(user.id, "enroll", 20, 3600)
      if (!gate.allowed) return json({ error: "rate limit", code: "rate-limit" }, 429, { "Retry-After": String(gate.retry_after) })
      const body = await boundedJson(req, 16_000)
      const challengeId = typeof body.challengeId === "string" ? body.challengeId.trim() : ""
      const version = Number(body.version)
      if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(challengeId) || !Number.isSafeInteger(version) || version < 1) {
        return json({ error: "invalid challenge", code: "invalid-challenge" }, 400)
      }
      const { data, error } = await admin.rpc("pt650_enroll_challenge", {
        p_user_id: user.id,
        p_challenge_id: challengeId,
        p_challenge_version: version
      })
      if (error) throw error
      const row = first(data)
      if (!row) return json({ error: "enrollment failed", code: "platform-upstream" }, 503)
      return json(row, row.outcome === "sold_out" ? 409 : row.outcome === "unavailable" ? 404 : 200)
    }

    if (req.method === "POST" && action === "session") {
      const gate = await rate(user.id, "move-session", 12, 3600)
      if (!gate.allowed) return json({ error: "rate limit", code: "rate-limit" }, 429, { "Retry-After": String(gate.retry_after) })
      const body = await boundedJson(req)
      const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : ""
      if (!/^[A-Za-z0-9_-]{16,96}$/.test(sessionId)) {
        return json({ error: "invalid walking session id", code: "invalid-session-id" }, 400)
      }

      const checked: any = await verifyGpsWalk(body.points)
      if (!checked.ok) return json({ error: "walking session could not be verified", code: checked.code }, 422)

      const firstPoint = Array.isArray(body.points) ? body.points[0] : null
      const lastPoint = Array.isArray(body.points) ? body.points.at(-1) : null
      const startedAt = new Date(Number(firstPoint?.t)).toISOString()
      const occurredAt = new Date(Number(lastPoint?.t)).toISOString()
      const eventId = crypto.randomUUID()

      const { data: ingestData, error: ingestError } = await admin.rpc("pt650_ingest_activity", {
        p_user_id: user.id,
        p_idempotency_key: "move:" + sessionId,
        p_event_id: eventId,
        p_event_type: "walk",
        p_source: "gps",
        p_occurred_at: occurredAt,
        p_payload: {
          distanceM: checked.summary.distanceM,
          durationSec: checked.summary.durationSec
        },
        p_evidence_artifact_id: null,
        p_evidence_sha256: checked.evidenceSha256 || null,
        p_venue_id: null,
        p_equipment_model_id: null,
        p_equipment_instance_id: null
      })
      if (ingestError) throw ingestError
      const ingest = first(ingestData)
      if (!ingest?.event_id || !ingest?.received_at) throw new Error("bad ingest response")

      const { data: finalData, error: finalError } = await admin.rpc("pt650_finalize_activity", {
        p_received_at: ingest.received_at,
        p_event_id: ingest.event_id,
        p_verification_status: checked.verified ? "verified" : "review",
        p_risk_status: checked.risk || (checked.verified ? "clear" : "review")
      })
      if (finalError) throw finalError
      const finalization = first(finalData) ?? finalData ?? {}

      const { data: healthData, error: healthError } = await admin.rpc("pt650_record_move_activity", {
        p_user_id: user.id,
        p_external_key: "move:" + sessionId,
        p_started_at: startedAt,
        p_ended_at: occurredAt,
        p_duration_sec: checked.summary.durationSec,
        p_distance_m: checked.summary.distanceM,
        p_route_fingerprint: checked.evidenceSha256 || null,
        p_verification: checked.verified ? "pt650_verified" : "review"
      })
      if (healthError) throw healthError
      const healthActivity = first(healthData)

      return json({
        ok: true,
        duplicate: !!ingest.duplicate,
        verification: checked.verified ? "verified" : "review",
        summary: checked.summary,
        rewards: finalization.applications || [],
        eventId: ingest.event_id,
        healthActivityId: healthActivity?.activity_id || null
      })
    }

    return json({ error: "not found", code: "not-found" }, 404)
  } catch (e: any) {
    console.error("pt650-platform", action, e?.message || e)
    const status = Number(e?.status) || 503
    return json({ error: status === 503 ? "platform unavailable" : e?.message || "request failed", code: e?.code || "platform-error" }, status)
  }
})
