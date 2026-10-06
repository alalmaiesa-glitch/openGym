-- PT650 Platform Core V1
-- PostgreSQL schema for high-volume verified activity, rewards and equipment intelligence.
-- This is intentionally separate from the legacy JSON profile store.
--
-- Scale principles:
-- 1) append activity/reward facts, do not rewrite history;
-- 2) global idempotency lives outside partitioned event tables;
-- 3) heavy analytics read from rollups, never from the hot ingest table;
-- 4) async work leaves through an outbox so HTTP requests stay short;
-- 5) raw GPS/images live in short-retention object storage, not in rows.

create schema if not exists pt650;

create table if not exists pt650.organizations (
  id text primary key,
  kind text not null check (kind in ('manufacturer','gym_operator','coach_business','recovery','retailer','sponsor','corporate')),
  name text not null,
  country_code char(2),
  status text not null default 'active' check (status in ('active','paused','disabled')),
  created_at timestamptz not null default now()
);

create table if not exists pt650.equipment_models (
  id text primary key,
  manufacturer_org_id text references pt650.organizations(id),
  brand text not null,
  model_name text not null,
  model_code text,
  machine_type text not null,
  resistance_type text,
  public_specs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists equipment_models_manufacturer_idx
  on pt650.equipment_models (manufacturer_org_id, machine_type);

create table if not exists pt650.venues (
  id text primary key,
  operator_org_id text references pt650.organizations(id),
  name text not null,
  country_code char(2) not null,
  city text,
  -- Venue coordinates describe a public/business location, never a user's live position.
  lat_e6 integer,
  lon_e6 integer,
  timezone text,
  status text not null default 'active' check (status in ('active','paused','closed')),
  created_at timestamptz not null default now()
);

create index if not exists venues_country_city_idx
  on pt650.venues (country_code, city);

create table if not exists pt650.equipment_instances (
  id text primary key,
  equipment_model_id text not null references pt650.equipment_models(id),
  venue_id text references pt650.venues(id),
  manufacturer_serial_hash text,
  qr_namespace text,
  qr_external_id_hash text,
  status text not null default 'active' check (status in ('active','maintenance','retired','unknown')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists equipment_instances_model_idx
  on pt650.equipment_instances (equipment_model_id, last_seen_at desc);
create index if not exists equipment_instances_venue_idx
  on pt650.equipment_instances (venue_id, status);

-- Global duplicate guard. Keep this compact and retain at least as long as clients may backfill.
-- Ingest writes here and to activity_events in ONE transaction.
create table if not exists pt650.ingest_idempotency (
  user_id text not null,
  idempotency_key text not null,
  event_id uuid not null,
  received_at timestamptz not null default now(),
  primary key (user_id, idempotency_key)
);

create index if not exists ingest_idempotency_received_idx
  on pt650.ingest_idempotency (received_at);

-- Raw high-volume facts. Monthly partitions keep retention, vacuuming and analytics bounded.
-- The application creates future partitions ahead of time; the DEFAULT partition prevents loss
-- if an ops job is late.
create table if not exists pt650.activity_events (
  event_id uuid not null,
  user_id text not null,
  event_type text not null,
  source text not null,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  verification_status text not null default 'pending'
    check (verification_status in ('pending','verified','rejected','review')),
  risk_status text not null default 'pending'
    check (risk_status in ('pending','clear','review','rejected')),
  evidence_artifact_id uuid,
  evidence_sha256 char(64),
  venue_id text,
  equipment_model_id text,
  equipment_instance_id text,
  payload jsonb not null,
  primary key (received_at, event_id)
) partition by range (received_at);

create table if not exists pt650.activity_events_default
  partition of pt650.activity_events default;

create index if not exists activity_events_user_time_idx
  on pt650.activity_events (user_id, occurred_at desc);
create index if not exists activity_events_type_time_idx
  on pt650.activity_events (event_type, occurred_at desc);
create index if not exists activity_events_equipment_time_idx
  on pt650.activity_events (equipment_model_id, occurred_at desc)
  where equipment_model_id is not null;
create index if not exists activity_events_pending_idx
  on pt650.activity_events (received_at)
  where verification_status = 'pending' or risk_status = 'pending';

-- Raw route/image evidence belongs in object storage. This table stores only a locator + hash.
-- expire_at makes deletion enforceable and keeps GPS/photo retention separate from durable metrics.
create table if not exists pt650.evidence_artifacts (
  id uuid primary key,
  user_id text not null,
  kind text not null check (kind in ('gps_route','machine_photo','manufacturer_label','qr_capture','wearable_proof')),
  object_key text not null,
  sha256 char(64) not null,
  bytes bigint not null check (bytes > 0),
  created_at timestamptz not null default now(),
  expire_at timestamptz not null,
  deleted_at timestamptz
);

create index if not exists evidence_artifacts_expiry_idx
  on pt650.evidence_artifacts (expire_at)
  where deleted_at is null;

create table if not exists pt650.challenges (
  challenge_id text not null,
  version integer not null check (version > 0),
  sponsor_org_id text not null references pt650.organizations(id),
  title text not null,
  metric text not null check (metric in ('steps','distance_m','active_minutes','verified_machine_uses','verified_contributions')),
  target numeric(20,3) not null check (target > 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reward_kind text not null check (reward_kind in ('pt650_credit','access_days','coupon','partner_benefit')),
  reward_value bigint not null check (reward_value > 0),
  reward_display text not null,
  verification_disclosure text not null,
  terms_hash char(64) not null,
  budget_limit bigint,
  status text not null default 'draft' check (status in ('draft','scheduled','active','paused','ended','cancelled')),
  created_at timestamptz not null default now(),
  primary key (challenge_id, version),
  check (ends_at > starts_at)
);

create index if not exists challenges_active_window_idx
  on pt650.challenges (status, starts_at, ends_at);

-- Enrollment freezes the exact challenge/reward terms shown before the athlete starts.
-- Later sponsor edits create a new challenge version; they do not rewrite this snapshot.
create table if not exists pt650.challenge_enrollments (
  id uuid primary key,
  user_id text not null,
  challenge_id text not null,
  challenge_version integer not null,
  terms_hash char(64) not null,
  reward_snapshot jsonb not null,
  verification_snapshot text not null,
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  settled_at timestamptz,
  status text not null default 'active'
    check (status in ('active','completed','settled','expired','review','rejected')),
  unique (user_id, challenge_id, challenge_version),
  foreign key (challenge_id, challenge_version)
    references pt650.challenges(challenge_id, version)
);

create index if not exists challenge_enrollments_user_idx
  on pt650.challenge_enrollments (user_id, status, enrolled_at desc);

-- The sponsor's reward pool is reserved at enrollment time, not after the athlete finishes.
-- This is the fairness guarantee behind "achieve the goal, receive the reward": if budget is
-- exhausted the athlete cannot join, rather than discovering that only after doing the work.
create table if not exists pt650.challenge_budgets (
  challenge_id text not null,
  challenge_version integer not null,
  currency text not null,
  total_amount bigint not null check (total_amount >= 0),
  reserved_amount bigint not null default 0 check (reserved_amount >= 0),
  settled_amount bigint not null default 0 check (settled_amount >= 0),
  updated_at timestamptz not null default now(),
  primary key (challenge_id, challenge_version),
  foreign key (challenge_id, challenge_version)
    references pt650.challenges(challenge_id, version),
  check (reserved_amount + settled_amount <= total_amount)
);

create table if not exists pt650.challenge_reward_reservations (
  enrollment_id uuid primary key references pt650.challenge_enrollments(id) on delete restrict,
  amount bigint not null check (amount > 0),
  currency text not null,
  state text not null default 'reserved'
    check (state in ('reserved','settled','released')),
  reserved_at timestamptz not null default now(),
  settled_at timestamptz,
  released_at timestamptz
);

-- One transaction locks the budget row, checks capacity and creates the reservation.
-- Call this from the enrollment transaction; a false result means "sold out" BEFORE activity.
create or replace function pt650.reserve_challenge_reward(
  p_enrollment_id uuid,
  p_challenge_id text,
  p_challenge_version integer,
  p_amount bigint,
  p_currency text
)
returns boolean
language plpgsql
as $pt650$
declare
  b pt650.challenge_budgets%rowtype;
begin
  if p_amount <= 0 then
    raise exception 'reward amount must be positive';
  end if;

  select * into b
  from pt650.challenge_budgets
  where challenge_id = p_challenge_id and challenge_version = p_challenge_version
  for update;

  if not found then
    return false;
  end if;

  if b.total_amount - b.reserved_amount - b.settled_amount < p_amount then
    return false;
  end if;

  insert into pt650.challenge_reward_reservations
    (enrollment_id, amount, currency)
  values
    (p_enrollment_id, p_amount, p_currency);

  update pt650.challenge_budgets
  set reserved_amount = reserved_amount + p_amount,
      updated_at = now()
  where challenge_id = p_challenge_id and challenge_version = p_challenge_version;

  return true;
end;
$pt650$;

-- Sharded-by-user counters are updated asynchronously from verified events.
create table if not exists pt650.challenge_progress (
  enrollment_id uuid primary key references pt650.challenge_enrollments(id) on delete cascade,
  value numeric(20,3) not null default 0,
  event_count bigint not null default 0,
  last_event_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Append-only accounting. Never UPDATE a mistake: append a reversal entry.
create table if not exists pt650.reward_ledger (
  id uuid primary key,
  user_id text not null,
  currency text not null default 'PTC',
  amount bigint not null check (amount <> 0),
  reason text not null,
  source_type text not null,
  source_id text,
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index if not exists reward_ledger_user_time_idx
  on pt650.reward_ledger (user_id, currency, created_at desc);

create table if not exists pt650.entitlement_grants (
  id uuid primary key,
  user_id text not null,
  entitlement text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  source_type text not null,
  source_id text,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key),
  check (ends_at > starts_at)
);

create index if not exists entitlement_grants_user_idx
  on pt650.entitlement_grants (user_id, entitlement, ends_at desc);

-- Feedback reward eligibility is based on verification/completeness, never whether the user
-- praised or criticised the equipment.
create table if not exists pt650.equipment_feedback (
  id uuid primary key,
  user_id text not null,
  equipment_model_id text references pt650.equipment_models(id),
  equipment_instance_id text references pt650.equipment_instances(id),
  rating smallint check (rating between 1 and 5),
  note text,
  issue_codes text[] not null default '{}',
  verification_status text not null default 'pending'
    check (verification_status in ('pending','verified','rejected','review')),
  created_at timestamptz not null default now(),
  check (equipment_model_id is not null or equipment_instance_id is not null)
);

create index if not exists equipment_feedback_model_idx
  on pt650.equipment_feedback (equipment_model_id, created_at desc);

-- Manufacturer dashboards consume privacy-safe daily rollups, not individual events.
-- A rollup worker suppresses cohorts below the configured privacy threshold before exposure.
create table if not exists pt650.equipment_usage_rollups_daily (
  day date not null,
  equipment_model_id text not null references pt650.equipment_models(id),
  venue_id text,
  country_code char(2),
  city text,
  verified_uses bigint not null default 0,
  distinct_users bigint not null default 0,
  returning_users bigint not null default 0,
  feedback_count bigint not null default 0,
  rating_sum bigint not null default 0,
  primary key (day, equipment_model_id, venue_id)
);

create index if not exists equipment_usage_rollups_model_day_idx
  on pt650.equipment_usage_rollups_daily (equipment_model_id, day desc);

-- Transactional outbox: API transactions commit durable work here; workers publish/process later.
-- This keeps camera scans, activity ingest and reward claims fast under burst traffic.
create table if not exists pt650.outbox (
  id uuid primary key,
  topic text not null,
  aggregate_key text not null,
  payload jsonb not null,
  available_at timestamptz not null default now(),
  attempts integer not null default 0,
  locked_at timestamptz,
  locked_by text,
  completed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create index if not exists outbox_ready_idx
  on pt650.outbox (available_at, created_at)
  where completed_at is null and locked_at is null;

-- Enforce append-only financial history at the database boundary.
create or replace function pt650.reject_reward_ledger_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'pt650.reward_ledger is append-only; create a reversal instead';
end;
$$;

drop trigger if exists reward_ledger_no_update on pt650.reward_ledger;
create trigger reward_ledger_no_update
before update or delete on pt650.reward_ledger
for each row execute function pt650.reject_reward_ledger_mutation();

comment on table pt650.activity_events is
  'High-volume verified activity facts. Raw GPS/photo evidence is external and short-lived.';
comment on table pt650.reward_ledger is
  'Immutable rewards accounting. Negative correction entries reverse mistakes; history is never rewritten.';
comment on table pt650.challenge_enrollments is
  'Freezes the reward and verification terms shown to an athlete before a sponsored challenge starts.';
