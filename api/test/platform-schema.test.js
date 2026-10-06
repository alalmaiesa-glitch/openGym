import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const sql = readFileSync(resolve(process.cwd(), 'platform/sql/001_platform_core.sql'), 'utf8')
const readme = readFileSync(resolve(process.cwd(), 'platform/README.md'), 'utf8')

test('platform schema keeps high-volume activity separate and partition-ready', () => {
  assert.match(sql, /create table if not exists pt650\.activity_events[\s\S]*partition by range \(received_at\)/i)
  assert.match(sql, /activity_events_default[\s\S]*partition of pt650\.activity_events default/i)
  assert.match(sql, /create table if not exists pt650\.ingest_idempotency/i)
  assert.match(sql, /primary key \(user_id, idempotency_key\)/i)
})

test('platform schema makes rewards append-only and idempotent', () => {
  assert.match(sql, /create table if not exists pt650\.reward_ledger/i)
  assert.match(sql, /unique \(user_id, idempotency_key\)/i)
  assert.match(sql, /reward_ledger is append-only/i)
  assert.match(sql, /before update or delete on pt650\.reward_ledger/i)
})

test('sponsored challenge funding is reserved before work begins', () => {
  assert.match(sql, /create table if not exists pt650\.challenge_budgets/i)
  assert.match(sql, /create table if not exists pt650\.challenge_reward_reservations/i)
  assert.match(sql, /create or replace function pt650\.reserve_challenge_reward/i)
  assert.match(sql, /for update/i)
  assert.match(sql, /return false/i)
})

test('raw evidence has independent expiry and async work uses an outbox', () => {
  assert.match(sql, /create table if not exists pt650\.evidence_artifacts/i)
  assert.match(sql, /expire_at timestamptz not null/i)
  assert.match(sql, /create table if not exists pt650\.outbox/i)
  assert.match(sql, /outbox_ready_idx/i)
})

test('manufacturer analytics are separated into rollups rather than reading hot events', () => {
  assert.match(sql, /create table if not exists pt650\.equipment_usage_rollups_daily/i)
  assert.match(readme, /Manufacturer dashboards never query raw activity rows/i)
  assert.match(readme, /10 million activity events\/day/i)
  assert.match(readme, /5,000 ingest requests\/second/i)
  assert.match(readme, /not yet capacity-certified/i)
})
