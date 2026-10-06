import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const server = readFileSync(resolve(process.cwd(), 'server.js'), 'utf8')
const docker = readFileSync(resolve(process.cwd(), 'Dockerfile'), 'utf8')
const routes = readFileSync(resolve(process.cwd(), 'platform/routes.js'), 'utf8')
const security = readFileSync(resolve(process.cwd(), 'platform/sql/007_server_only_boundary.sql'), 'utf8')
const finalize = readFileSync(resolve(process.cwd(), 'platform/sql/008_move_finalize_activity.sql'), 'utf8')
const seed = readFileSync(resolve(process.cwd(), 'platform/sql/009_move_founding_challenge.sql'), 'utf8')

test('PT650 platform routes are registered and shipped in the API image', () => {
  assert.match(server, /platformRoutes\(\{ json, readBody, readSession \}\)/)
  assert.match(docker, /COPY platform \.\/platform/)
  assert.match(routes, /POST \/api\/move\/session/)
  assert.match(routes, /GET \/api\/move\/challenges/)
  assert.match(routes, /GET \/api\/rewards\/summary/)
})

test('server-only migration blocks browser roles from PT650 data and RPCs', () => {
  assert.match(security, /enable row level security/i)
  assert.match(security, /revoke all on schema pt650 from public, anon, authenticated/i)
  assert.match(security, /grant usage on schema pt650 to service_role/i)
  assert.match(security, /revoke all on function public\.pt650_ingest_activity[\s\S]*from public, anon, authenticated/i)
  assert.match(security, /grant execute on function public\.pt650_ingest_activity[\s\S]*to service_role/i)
})

test('Move finalization is service-role only and retires synchronous outbox work', () => {
  assert.match(finalize, /pt650_finalize_activity/)
  assert.match(finalize, /revoke all on function public\.pt650_finalize_activity[\s\S]*from public, anon, authenticated/i)
  assert.match(finalize, /activity\.verify:/)
  assert.match(finalize, /activity\.verified:/)
})

test('the first PT650 challenge states an exact GPS goal and exact access reward', () => {
  assert.match(seed, /pt650-founding-walk-2k/)
  assert.match(seed, /'distance_m'/)
  assert.match(seed, /2000/)
  assert.match(seed, /'access_days'/)
  assert.match(seed, /7,/)
  assert.match(seed, /7 أيام من الوصول المتقدم/)
})
