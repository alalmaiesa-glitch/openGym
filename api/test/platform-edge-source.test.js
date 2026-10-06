import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const edge = readFileSync(resolve(process.cwd(), '../supabase/functions/pt650-platform/index.ts'), 'utf8')
const edgeGps = readFileSync(resolve(process.cwd(), '../supabase/functions/pt650-platform/gps.ts'), 'utf8')
const rateSql = readFileSync(resolve(process.cwd(), 'platform/sql/010_edge_rate_limit.sql'), 'utf8')

test('Edge API authenticates a Supabase user before privileged RPCs', () => {
  assert.match(edge, /auth\.getUser\(token\)/)
  assert.match(edge, /SUPABASE_SERVICE_ROLE_KEY/)
  assert.match(edge, /if \(!user\) return json\(\{ error: "unauthorized"/)
  assert.match(edge, /admin\.rpc\("pt650_move_challenges"/)
  assert.match(edge, /admin\.rpc\("pt650_ingest_activity"/)
  assert.match(edge, /admin\.rpc\("pt650_finalize_activity"/)
})

test('Edge API rate limits reads, enrollment and GPS settlement independently', () => {
  assert.match(edge, /rate\(user\.id, "challenges", 120, 60\)/)
  assert.match(edge, /rate\(user\.id, "enroll", 20, 3600\)/)
  assert.match(edge, /rate\(user\.id, "move-session", 12, 3600\)/)
  assert.match(rateSql, /create table if not exists pt650\.api_rate_buckets/i)
  assert.match(rateSql, /revoke all on table pt650\.api_rate_buckets from public, anon, authenticated/i)
  assert.match(rateSql, /grant all on table pt650\.api_rate_buckets to service_role/i)
})

test('Edge GPS verifier fails closed and does not return raw route coordinates', () => {
  assert.match(edgeGps, /MAX_ACCURACY_M = 60/)
  assert.match(edgeGps, /MAX_WALK_SEGMENT_SPEED_MPS = 5\.5/)
  assert.match(edgeGps, /gps-speed-review/)
  assert.match(edgeGps, /crypto\.subtle\.digest\('SHA-256'/)
  assert.doesNotMatch(edgeGps, /return \{[^}]*points:/)
})

test('Edge request body is bounded before GPS JSON is parsed', () => {
  assert.ok(edge.includes('async function boundedJson(req: Request, max = 600_000)'))
  assert.match(edge, /content-length/)
  assert.match(edge, /status: 413/)
})


test('Edge API bootstraps one unified PT650 profile from the authenticated user', () => {
  assert.match(edge, /action === "account"/)
  assert.match(edge, /admin\.rpc\("pt650_account_bootstrap"/)
  assert.match(edge, /p_user_id: user\.id/)
  assert.match(edge, /emailConfirmed/)
})

test('Edge API updates profile only through the authenticated user identity', () => {
  assert.match(edge, /action === "profile"/)
  assert.match(edge, /admin\.rpc\("pt650_account_update_profile"/)
  assert.match(edge, /p_user_id: user\.id/)
  assert.match(edge, /displayName\.length > 80/)
})


test('Edge training sync is JWT-owned, revisioned and body-bounded', () => {
  assert.match(edge, /action === "training-rev"/)
  assert.match(edge, /action === "training-state"/)
  assert.match(edge, /admin\.rpc\("pt650_training_revision", \{ p_user_id: user\.id \}\)/)
  assert.match(edge, /admin\.rpc\("pt650_training_get", \{ p_user_id: user\.id \}\)/)
  assert.match(edge, /admin\.rpc\("pt650_training_put"/)
  assert.match(edge, /p_user_id: user\.id/)
  assert.match(edge, /boundedJson\(req, 2_700_000\)/)
  assert.match(edge, /row\.outcome === "conflict" \? 409 : 200/)
})

test('Edge training sync separates cheap revision polling from bounded state writes', () => {
  assert.match(edge, /rate\(user\.id, "training-rev", 180, 60\)/)
  assert.match(edge, /rate\(user\.id, "training-read", 120, 3600\)/)
  assert.match(edge, /rate\(user\.id, "training-write", 900, 3600\)/)
})


test('Edge Health API exposes authenticated summary, activities and honest adapter status', () => {
  assert.match(edge, /action === "health-summary"/)
  assert.match(edge, /admin\.rpc\("pt650_health_summary", \{ p_user_id: user\.id \}\)/)
  assert.match(edge, /action === "health-activities"/)
  assert.match(edge, /admin\.rpc\("pt650_health_recent_activities"/)
  assert.match(edge, /action === "health-adapters"/)
  assert.match(edge, /admin\.rpc\("pt650_health_adapter_status"\)/)
})

test('verified PT650 Move sessions also become canonical endurance activities', () => {
  assert.match(edge, /admin\.rpc\("pt650_record_move_activity"/)
  assert.match(edge, /p_external_key: "move:" \+ sessionId/)
  assert.match(edge, /p_verification: checked\.verified \? "pt650_verified" : "review"/)
  assert.match(edge, /healthActivityId/)
})

test('workout cloud writes index bodyweight into Health without making sync depend on the derived bridge', () => {
  assert.match(edge, /row\.outcome === "written" && Array\.isArray\(state\.bodyweight\)/)
  assert.match(edge, /admin\.rpc\("pt650_health_ingest_bodyweight_batch"/)
  assert.match(edge, /console\.error\("pt650-health-weight-bridge"/)
  assert.doesNotMatch(edge, /if \(healthBridgeError\) throw healthBridgeError/)
})


test('Health summary reindexes pre-existing workout weights without failing the dashboard on derived-index errors', () => {
  assert.match(edge, /admin\.rpc\("pt650_health_reindex_workout", \{ p_user_id: user\.id \}\)/)
  assert.match(edge, /console\.error\("pt650-health-reindex"/)
  assert.doesNotMatch(edge, /if \(reindexError\) throw reindexError/)
})


test('Wearable control plane is JWT-owned and exposes only safe framework metadata/actions', () => {
  assert.match(edge, /action === "wearable-framework"/)
  assert.match(edge, /admin\.rpc\("pt650_wearable_framework", \{ p_user_id: user\.id \}\)/)
  assert.match(edge, /action === "wearable-priority"/)
  assert.match(edge, /admin\.rpc\("pt650_wearable_set_priority"/)
  assert.match(edge, /p_user_id: user\.id/)
  assert.doesNotMatch(edge, /action === "wearable-token"/)
  assert.doesNotMatch(edge, /action === "wearable-cursor"/)
})

test('Wearable source priority input is bounded and rate limited', () => {
  assert.match(edge, /rate\(user\.id, "wearable-priority", 30, 3600\)/)
  assert.match(edge, /priority < 0 \|\| priority > 1000/)
  assert.match(edge, /invalid source priority/)
})


test('native wearable ingest supports Apple Health and Health Connect without weakening payload safety', () => {
  assert.match(edge, /action === "wearable-native-ingest"/)
  assert.match(edge, /rate\(user\.id, "wearable-native-ingest", 120, 3600\)/)
  assert.match(edge, /boundedJson\(req, 1_200_000\)/)
  assert.match(edge, /\["apple_health","health_connect"\]\.includes\(provider\)/)
  assert.match(edge, /HEALTH_CONNECT_METRICS/)
  assert.match(edge, /validNativeExternalKey/)
  assert.match(edge, /observations\.length > 1000/)
  assert.match(edge, /activities\.length > 250/)
  assert.match(edge, /hasRawLocation\(body\)/)
  assert.match(edge, /"anchors" in cursor/)
  assert.match(edge, /admin\.rpc\("pt650_wearable_ingest_native_batch"/)
  assert.match(edge, /p_user_id: user\.id/)
})
