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
