import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const sql = readFileSync(resolve(process.cwd(), 'platform/sql/001_platform_core.sql'), 'utf8')
const readme = readFileSync(resolve(process.cwd(), 'platform/README.md'), 'utf8')
const expectSql = (source, pattern) => assert.match(source, pattern)

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


test('V2 RPCs avoid PLpgSQL output-column conflicts and keep the terms hash contract stable', () => {
  const atomic = readFileSync(resolve(process.cwd(), 'platform/sql/002_atomic_ingest_and_jobs.sql'), 'utf8')
  const progress = readFileSync(resolve(process.cwd(), 'platform/sql/003_verified_progress_and_settlement.sql'), 'utf8')
  expectSql(atomic, /on conflict on constraint challenge_progress_pkey do nothing/i)
  expectSql(atomic, /terms_hash::text/i)
  expectSql(progress, /on conflict on constraint challenge_progress_events_pkey do nothing/i)
  expectSql(progress, /on conflict on constraint challenge_progress_pkey do update/i)
})

test('V2 hardening covers rollup row identity and foreign-key access paths', () => {
  const hardening = readFileSync(resolve(process.cwd(), 'platform/sql/006_linter_hardening.sql'), 'utf8')
  expectSql(hardening, /primary key using index equipment_usage_rollups_scope_uidx/i)
  expectSql(hardening, /challenge_enrollments_challenge_idx/i)
  expectSql(hardening, /challenges_sponsor_idx/i)
  expectSql(hardening, /equipment_feedback_instance_idx/i)
  expectSql(hardening, /venues_operator_idx/i)
})


test('unified PT650 profiles are auth-linked and server-only', () => {
  const account = readFileSync(resolve(process.cwd(), 'platform/sql/011_unified_account.sql'), 'utf8')
  expectSql(account, /user_id uuid primary key references auth\.users\(id\) on delete cascade/i)
  expectSql(account, /alter table pt650\.profiles enable row level security/i)
  expectSql(account, /revoke all on table pt650\.profiles from public, anon, authenticated/i)
  expectSql(account, /pt650_account_bootstrap/)
  expectSql(account, /pt650_account_update_profile/)
  expectSql(account, /grant execute[\s\S]*to service_role/i)
})


test('PT650 workout cloud state is revisioned, auth-linked and server-only', () => {
  const training = readFileSync(resolve(process.cwd(), 'platform/sql/012_training_cloud_sync.sql'), 'utf8')
  expectSql(training, /create table if not exists pt650\.training_states/i)
  expectSql(training, /user_id uuid primary key references auth\.users\(id\) on delete cascade/i)
  expectSql(training, /revision bigint not null default 1/i)
  expectSql(training, /state jsonb not null/i)
  expectSql(training, /alter table pt650\.training_states enable row level security/i)
  expectSql(training, /revoke all on table pt650\.training_states from public, anon, authenticated/i)
  expectSql(training, /for update/i)
  expectSql(training, /p_base_revision is null or p_base_revision <> v_current\.revision/i)
  expectSql(training, /'conflict'::text/)
  expectSql(training, /octet_length\(p_state::text\)/i)
  expectSql(training, /2500000/)
  expectSql(training, /grant execute[\s\S]*to service_role/i)
})


test('Health & Endurance Core separates canonical observations, activities, laps and chunked streams', () => {
  const health = readFileSync(resolve(process.cwd(), 'platform/sql/013_health_endurance_core.sql'), 'utf8')
  expectSql(health, /create table if not exists pt650\.health_observations/i)
  expectSql(health, /create table if not exists pt650\.endurance_activities/i)
  expectSql(health, /create table if not exists pt650\.activity_laps/i)
  expectSql(health, /create table if not exists pt650\.activity_stream_chunks/i)
  expectSql(health, /sample_count integer not null check \(sample_count >= 0 and sample_count <= 4096\)/i)
})

test('Health imports are idempotent and preserve source/device provenance', () => {
  const health = readFileSync(resolve(process.cwd(), 'platform/sql/013_health_endurance_core.sql'), 'utf8')
  expectSql(health, /create table if not exists pt650\.health_sources/i)
  expectSql(health, /create table if not exists pt650\.health_devices/i)
  expectSql(health, /create table if not exists pt650\.health_import_keys/i)
  expectSql(health, /primary key \(user_id, source_id, object_kind, external_key\)/i)
  expectSql(health, /on conflict \(user_id, source_id, object_kind, external_key\) do nothing/i)
})

test('Health location streams cannot store coordinates inline', () => {
  const health = readFileSync(resolve(process.cwd(), 'platform/sql/013_health_endurance_core.sql'), 'utf8')
  expectSql(health, /stream_type not in \('latlng','location','gps'\)[\s\S]*or encoding = 'artifact'/i)
  expectSql(health, /encoding in \('json_array','delta_json','artifact'\)/i)
})

test('Health adapter matrix marks only implemented bridges active on a fresh install', () => {
  const health = readFileSync(resolve(process.cwd(), 'platform/sql/013_health_endurance_core.sql'), 'utf8')
  expectSql(health, /'pt650_move','PT650 Move','first_party','active'/i)
  expectSql(health, /'pt650_workout','PT650 Workout','first_party','active',array\['strength_training','body_weight'\]/i)
  expectSql(health, /'apple_health','Apple Health','native_bridge','planned'/i)
  expectSql(health, /'health_connect','Android Health Connect','native_bridge','planned'/i)
  expectSql(health, /'huawei_health','Huawei Health','native_bridge','planned'/i)
  expectSql(health, /'garmin','Garmin Connect','oauth','planned'/i)
  expectSql(health, /'strava','Strava','oauth','planned'/i)
})

test('Generic endurance adapter contract supports summary, laps and bounded stream chunks', () => {
  const adapter = readFileSync(resolve(process.cwd(), 'platform/sql/014_endurance_adapter_contract.sql'), 'utf8')
  expectSql(adapter, /pt650_endurance_ingest_activity/i)
  expectSql(adapter, /pt650_endurance_replace_laps/i)
  expectSql(adapter, /v_count := jsonb_array_length\(p_laps\)/i)
  expectSql(adapter, /if v_count > 1000/i)
  expectSql(adapter, /pt650_endurance_put_stream_chunk/i)
  expectSql(adapter, /p_sample_count > 4096/i)
  expectSql(adapter, /location stream must use protected artifact/i)
})

test('Workout weigh-ins bridge into canonical kg observations idempotently', () => {
  const bridge = readFileSync(resolve(process.cwd(), 'platform/sql/016_workout_health_bridge.sql'), 'utf8')
  expectSql(bridge, /pt650_health_ingest_bodyweight_batch/i)
  expectSql(bridge, /v_weight \* 0\.45359237/i)
  expectSql(bridge, /'weight_kg'/i)
  expectSql(bridge, /'self_reported'/i)
  expectSql(bridge, /bodyweight:[^']*/i)
  expectSql(bridge, /on conflict \(user_id, source_id, object_kind, external_key\) do nothing/i)
})


test('Health reindex backfills old workout cloud weights without rewriting training state', () => {
  const reindex = readFileSync(resolve(process.cwd(), 'platform/sql/017_health_workout_reindex.sql'), 'utf8')
  expectSql(reindex, /from pt650\.training_states/i)
  expectSql(reindex, /v_state->'bodyweight'/i)
  expectSql(reindex, /pt650_health_ingest_bodyweight_batch/i)
  expectSql(reindex, /revoke all on function public\.pt650_health_reindex_workout\(uuid\)/i)
  expectSql(reindex, /grant execute on function public\.pt650_health_reindex_workout\(uuid\)[\s\S]*to service_role/i)
})


test('Health Core hardening covers foreign-key access paths and activates implemented workout bridge', () => {
  const hardening = readFileSync(resolve(process.cwd(), 'platform/sql/018_health_core_hardening.sql'), 'utf8')
  expectSql(hardening, /where provider = 'pt650_workout'/i)
  expectSql(hardening, /set status = 'active'/i)
  expectSql(hardening, /health_sources_provider_idx/i)
  expectSql(hardening, /health_import_keys_source_idx/i)
  expectSql(hardening, /health_observations_device_idx/i)
  expectSql(hardening, /endurance_activities_device_idx/i)
})


test('Wearable Adapter Framework declares registry auth/sync metadata and source precedence', () => {
  const framework = readFileSync(resolve(process.cwd(), 'platform/sql/019_wearable_adapter_framework.sql'), 'utf8')
  expectSql(framework, /auth_strategy text not null/i)
  expectSql(framework, /sync_strategy text not null/i)
  expectSql(framework, /default_priority smallint not null/i)
  expectSql(framework, /requires_native boolean not null/i)
  expectSql(framework, /uses_token_vault boolean not null/i)
  expectSql(framework, /when 'pt650_move' then 1000/i)
  expectSql(framework, /when 'apple_health' then 850/i)
  expectSql(framework, /when 'garmin' then 820/i)
})

test('Wearable OAuth secrets are referenced through Supabase Vault, never stored as token plaintext columns', () => {
  const framework = readFileSync(resolve(process.cwd(), 'platform/sql/019_wearable_adapter_framework.sql'), 'utf8')
  expectSql(framework, /create table if not exists pt650\.health_connection_token_refs/i)
  expectSql(framework, /secret_id uuid not null unique/i)
  expectSql(framework, /vault\.create_secret/i)
  expectSql(framework, /vault\.update_secret/i)
  expectSql(framework, /vault\.decrypted_secrets/i)
  assert.doesNotMatch(framework, /access_token\s+text/i)
  assert.doesNotMatch(framework, /refresh_token\s+text/i)
})

test('Wearable sync uses durable cursors, deduped jobs and multi-worker SKIP LOCKED claims', () => {
  const framework = readFileSync(resolve(process.cwd(), 'platform/sql/019_wearable_adapter_framework.sql'), 'utf8')
  expectSql(framework, /create table if not exists pt650\.health_sync_cursors/i)
  expectSql(framework, /create table if not exists pt650\.health_sync_jobs/i)
  expectSql(framework, /unique index if not exists health_sync_jobs_dedupe_uidx/i)
  expectSql(framework, /for update skip locked/i)
  expectSql(framework, /max_attempts integer not null default 8/i)
})

test('Wearable sync leases are reclaimable and cannot be completed by the wrong worker', () => {
  const lease = readFileSync(resolve(process.cwd(), 'platform/sql/021_wearable_sync_lease_recovery.sql'), 'utf8')
  expectSql(lease, /lease_expires_at timestamptz/i)
  expectSql(lease, /lease_expires_at <= now\(\)/i)
  expectSql(lease, /interval '5 minutes'/i)
  expectSql(lease, /locked_by is distinct from p_worker_id/i)
  expectSql(lease, /sync job lease expired/i)
})

test('Cross-source dedupe is non-destructive and selects a primary by effective priority plus quality', () => {
  const framework = readFileSync(resolve(process.cwd(), 'platform/sql/019_wearable_adapter_framework.sql'), 'utf8')
  expectSql(framework, /create table if not exists pt650\.health_dedupe_groups/i)
  expectSql(framework, /create table if not exists pt650\.health_dedupe_members/i)
  expectSql(framework, /pt650_health_effective_priority/i)
  expectSql(framework, /v_priority > v_group\.primary_priority/i)
  expectSql(framework, /v_priority = v_group\.primary_priority and p_quality > v_group\.primary_quality/i)
  assert.doesNotMatch(framework, /delete from pt650\.health_observations/i)
  assert.doesNotMatch(framework, /delete from pt650\.endurance_activities/i)
})

test('Wearable account-facing control plane exposes metadata but not decrypted tokens or raw cursors', () => {
  const control = readFileSync(resolve(process.cwd(), 'platform/sql/020_wearable_framework_control_plane.sql'), 'utf8')
  expectSql(control, /pt650_wearable_framework/i)
  expectSql(control, /'tokenStored'/i)
  expectSql(control, /'sync'/i)
  assert.doesNotMatch(control, /decrypted_secret/i)
  assert.doesNotMatch(control, /'cursor'/i)
})

test('Wearable framework hardening covers provider foreign keys and fixed helper search path', () => {
  const hardening = readFileSync(resolve(process.cwd(), 'platform/sql/022_wearable_framework_hardening.sql'), 'utf8')
  expectSql(hardening, /health_connections_provider_idx/i)
  expectSql(hardening, /health_dedupe_groups_primary_provider_idx/i)
  expectSql(hardening, /health_dedupe_members_provider_idx/i)
  expectSql(hardening, /health_dedupe_members_user_idx/i)
  expectSql(hardening, /health_source_preferences_provider_idx/i)
  expectSql(hardening, /health_sync_jobs_provider_idx/i)
  expectSql(hardening, /set search_path = pg_catalog/i)
})
