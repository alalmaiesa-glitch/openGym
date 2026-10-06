-- PT650 Platform Core V2
-- Atomic ingest, funded challenge enrollment and durable worker leases.
-- Requires 001_platform_core.sql.

-- Outbox operations need a stable dedupe key so retries cannot publish the same logical task twice.
alter table pt650.outbox
  add column if not exists dedupe_key text;

create unique index if not exists outbox_dedupe_key_uidx
  on pt650.outbox (dedupe_key)
  where dedupe_key is not null;

-- V1's rollup primary key made venue_id implicitly NOT NULL, which prevented country/city/global
-- aggregates. Move to an explicit scope key so one table can safely carry all privacy-filtered
-- dashboard grains.
alter table pt650.equipment_usage_rollups_daily
  drop constraint if exists equipment_usage_rollups_daily_pkey;

alter table pt650.equipment_usage_rollups_daily
  alter column venue_id drop not null;

alter table pt650.equipment_usage_rollups_daily
  add column if not exists scope_type text not null default 'venue'
    check (scope_type in ('venue','city','country','global')),
  add column if not exists scope_key text not null default '';

drop index if exists pt650.equipment_usage_rollups_scope_uidx;
create unique index equipment_usage_rollups_scope_uidx
  on pt650.equipment_usage_rollups_daily (day, equipment_model_id, scope_type, scope_key);

-- Reward budget reservation must match the funded unit. A sponsor cannot fund ACCESS_DAY and have
-- an enrollment silently reserve PTC (or vice versa).
create or replace function pt650.reserve_challenge_reward(
  p_enrollment_id uuid,
  p_challenge_id text,
  p_challenge_version integer,
  p_amount bigint,
  p_currency text
)
returns boolean
language plpgsql
as $$
declare
  b pt650.challenge_budgets%rowtype;
begin
  if p_amount <= 0 then
    raise exception 'reward amount must be positive';
  end if;

  select * into b
  from pt650.challenge_budgets
  where challenge_id = p_challenge_id
    and challenge_version = p_challenge_version
  for update;

  if not found or b.currency <> p_currency then
    return false;
  end if;

  if b.total_amount - b.reserved_amount - b.settled_amount < p_amount then
    return false;
  end if;

  insert into pt650.challenge_reward_reservations
    (enrollment_id, amount, currency)
  values
    (p_enrollment_id, p_amount, p_currency)
  on conflict (enrollment_id) do nothing;

  if not found then
    return true;
  end if;

  update pt650.challenge_budgets
  set reserved_amount = reserved_amount + p_amount,
      updated_at = now()
  where challenge_id = p_challenge_id
    and challenge_version = p_challenge_version;

  return true;
end;
$$;

-- One database transaction accepts an event exactly once and emits its verification job.
-- A mobile retry with the same (user_id, idempotency_key) returns the original event_id and does
-- not create a second activity row or second reward path.
create or replace function pt650.ingest_activity_event(
  p_user_id text,
  p_idempotency_key text,
  p_event_id uuid,
  p_event_type text,
  p_source text,
  p_occurred_at timestamptz,
  p_payload jsonb,
  p_evidence_artifact_id uuid default null,
  p_evidence_sha256 text default null,
  p_venue_id text default null,
  p_equipment_model_id text default null,
  p_equipment_instance_id text default null
)
returns table (
  event_id uuid,
  duplicate boolean,
  received_at timestamptz
)
language plpgsql
security definer
set search_path = pt650, public
as $$
declare
  v_event_id uuid := coalesce(p_event_id, gen_random_uuid());
  v_received_at timestamptz := clock_timestamp();
  v_existing_id uuid;
  v_existing_received_at timestamptz;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then
    raise exception 'user_id required';
  end if;
  if p_idempotency_key is null or length(p_idempotency_key) < 16 or length(p_idempotency_key) > 128 then
    raise exception 'invalid idempotency key';
  end if;
  if p_occurred_at is null then
    raise exception 'occurred_at required';
  end if;

  insert into pt650.ingest_idempotency(user_id, idempotency_key, event_id, received_at)
  values (p_user_id, p_idempotency_key, v_event_id, v_received_at)
  on conflict (user_id, idempotency_key) do nothing;

  if not found then
    select i.event_id, i.received_at
      into v_existing_id, v_existing_received_at
    from pt650.ingest_idempotency i
    where i.user_id = p_user_id
      and i.idempotency_key = p_idempotency_key;

    return query select v_existing_id, true, v_existing_received_at;
    return;
  end if;

  insert into pt650.activity_events(
    event_id,
    user_id,
    event_type,
    source,
    occurred_at,
    received_at,
    verification_status,
    risk_status,
    evidence_artifact_id,
    evidence_sha256,
    venue_id,
    equipment_model_id,
    equipment_instance_id,
    payload
  ) values (
    v_event_id,
    p_user_id,
    p_event_type,
    p_source,
    p_occurred_at,
    v_received_at,
    'pending',
    'pending',
    p_evidence_artifact_id,
    case
      when p_evidence_sha256 ~ '^[A-Fa-f0-9]{64}$' then lower(p_evidence_sha256)
      else null
    end,
    p_venue_id,
    p_equipment_model_id,
    p_equipment_instance_id,
    coalesce(p_payload, '{}'::jsonb)
  );

  insert into pt650.outbox(id, topic, aggregate_key, dedupe_key, payload)
  values (
    gen_random_uuid(),
    'activity.verify',
    p_user_id,
    'activity.verify:' || v_event_id::text,
    jsonb_build_object(
      'eventId', v_event_id,
      'receivedAt', v_received_at,
      'userId', p_user_id,
      'eventType', p_event_type,
      'source', p_source
    )
  )
  on conflict (dedupe_key) where dedupe_key is not null do nothing;

  return query select v_event_id, false, v_received_at;
end;
$$;

-- Workers transition verification once. Only a verified + clear event is allowed to feed progress.
create or replace function pt650.mark_activity_verification(
  p_received_at timestamptz,
  p_event_id uuid,
  p_verification_status text,
  p_risk_status text
)
returns boolean
language plpgsql
security definer
set search_path = pt650, public
as $$
declare
  v_user_id text;
  v_type text;
begin
  if p_verification_status not in ('verified','rejected','review') then
    raise exception 'invalid verification status';
  end if;
  if p_risk_status not in ('clear','review','rejected') then
    raise exception 'invalid risk status';
  end if;

  update pt650.activity_events
  set verification_status = p_verification_status,
      risk_status = p_risk_status
  where received_at = p_received_at
    and event_id = p_event_id
    and verification_status = 'pending'
  returning user_id, event_type into v_user_id, v_type;

  if not found then
    return false;
  end if;

  if p_verification_status = 'verified' and p_risk_status = 'clear' then
    insert into pt650.outbox(id, topic, aggregate_key, dedupe_key, payload)
    values (
      gen_random_uuid(),
      'activity.verified',
      v_user_id,
      'activity.verified:' || p_event_id::text,
      jsonb_build_object(
        'eventId', p_event_id,
        'receivedAt', p_received_at,
        'userId', v_user_id,
        'eventType', v_type
      )
    )
    on conflict (dedupe_key) where dedupe_key is not null do nothing;
  end if;

  return true;
end;
$$;

-- Enrollment freezes the terms the athlete saw and reserves the exact funded reward atomically.
-- If funding is exhausted, the row is removed in the same transaction and the caller gets
-- 'sold_out' before doing any work.
create or replace function pt650.enroll_challenge(
  p_user_id text,
  p_challenge_id text,
  p_challenge_version integer
)
returns table (
  enrollment_id uuid,
  outcome text,
  terms_hash text,
  reward_snapshot jsonb
)
language plpgsql
security definer
set search_path = pt650, public
as $$
declare
  c pt650.challenges%rowtype;
  v_id uuid := gen_random_uuid();
  v_existing pt650.challenge_enrollments%rowtype;
  v_reward jsonb;
  v_currency text;
  v_reserved boolean;
begin
  select * into c
  from pt650.challenges
  where challenge_id = p_challenge_id
    and version = p_challenge_version
  for share;

  if not found
     or c.status not in ('scheduled','active')
     or c.ends_at <= now() then
    return query select null::uuid, 'unavailable'::text, null::text, null::jsonb;
    return;
  end if;

  select * into v_existing
  from pt650.challenge_enrollments
  where user_id = p_user_id
    and challenge_id = p_challenge_id
    and challenge_version = p_challenge_version;

  if found then
    return query
      select v_existing.id,
             'existing'::text,
             v_existing.terms_hash,
             v_existing.reward_snapshot;
    return;
  end if;

  v_currency := case c.reward_kind
    when 'pt650_credit' then 'PTC'
    when 'access_days' then 'ACCESS_DAY'
    when 'coupon' then 'COUPON_UNIT'
    when 'partner_benefit' then 'BENEFIT_UNIT'
  end;

  v_reward := jsonb_build_object(
    'kind', c.reward_kind,
    'value', c.reward_value,
    'display', c.reward_display,
    'sponsorId', c.sponsor_org_id
  );

  insert into pt650.challenge_enrollments(
    id,
    user_id,
    challenge_id,
    challenge_version,
    terms_hash,
    reward_snapshot,
    verification_snapshot,
    status
  ) values (
    v_id,
    p_user_id,
    p_challenge_id,
    p_challenge_version,
    c.terms_hash,
    v_reward,
    c.verification_disclosure,
    'active'
  )
  on conflict (user_id, challenge_id, challenge_version) do nothing
  returning id into v_id;

  if not found then
    select * into v_existing
    from pt650.challenge_enrollments
    where user_id = p_user_id
      and challenge_id = p_challenge_id
      and challenge_version = p_challenge_version;

    return query
      select v_existing.id,
             'existing'::text,
             v_existing.terms_hash,
             v_existing.reward_snapshot;
    return;
  end if;

  v_reserved := pt650.reserve_challenge_reward(
    v_id,
    p_challenge_id,
    p_challenge_version,
    c.reward_value,
    v_currency
  );

  if not v_reserved then
    delete from pt650.challenge_enrollments where id = v_id;
    return query select null::uuid, 'sold_out'::text, c.terms_hash, v_reward;
    return;
  end if;

  insert into pt650.challenge_progress(enrollment_id)
  values (v_id)
  on conflict (enrollment_id) do nothing;

  return query select v_id, 'enrolled'::text, c.terms_hash, v_reward;
end;
$$;

-- Internal PT650 rewards settle in the same database transaction. External coupons/partner
-- benefits become durable outbox jobs and remain reserved until the integration confirms issue.
create or replace function pt650.settle_challenge_reward(
  p_enrollment_id uuid
)
returns text
language plpgsql
security definer
set search_path = pt650, public
as $$
declare
  e pt650.challenge_enrollments%rowtype;
  r pt650.challenge_reward_reservations%rowtype;
  p pt650.challenge_progress%rowtype;
  c pt650.challenges%rowtype;
  v_key text;
  v_entitlement_id uuid;
begin
  select * into e
  from pt650.challenge_enrollments
  where id = p_enrollment_id
  for update;

  if not found then return 'missing'; end if;
  if e.status = 'settled' then return 'already_settled'; end if;
  if e.status in ('review','rejected','expired') then return e.status; end if;

  select * into r
  from pt650.challenge_reward_reservations
  where enrollment_id = p_enrollment_id
  for update;

  if not found or r.state <> 'reserved' then
    return 'no_reservation';
  end if;

  select * into p
  from pt650.challenge_progress
  where enrollment_id = p_enrollment_id
  for update;

  select * into c
  from pt650.challenges
  where challenge_id = e.challenge_id
    and version = e.challenge_version;

  if not found or p.value < c.target then
    return 'incomplete';
  end if;

  v_key := 'challenge:' || e.challenge_id || ':v' || e.challenge_version::text || ':' || e.id::text;

  if c.reward_kind = 'pt650_credit' then
    insert into pt650.reward_ledger(
      id, user_id, currency, amount, reason, source_type, source_id, idempotency_key, metadata
    ) values (
      gen_random_uuid(),
      e.user_id,
      r.currency,
      r.amount,
      'Verified challenge reward',
      'challenge',
      e.challenge_id,
      v_key,
      jsonb_build_object('enrollmentId', e.id, 'termsHash', e.terms_hash)
    )
    on conflict (user_id, idempotency_key) do nothing;

  elsif c.reward_kind = 'access_days' then
    v_entitlement_id := gen_random_uuid();
    insert into pt650.entitlement_grants(
      id, user_id, entitlement, starts_at, ends_at, source_type, source_id, idempotency_key
    ) values (
      v_entitlement_id,
      e.user_id,
      'advanced_access',
      now(),
      now() + make_interval(days => r.amount::integer),
      'challenge',
      e.challenge_id,
      v_key
    )
    on conflict (user_id, idempotency_key) do nothing;

  else
    insert into pt650.outbox(id, topic, aggregate_key, dedupe_key, payload)
    values (
      gen_random_uuid(),
      'reward.partner.issue',
      e.user_id,
      'reward.partner.issue:' || e.id::text,
      jsonb_build_object(
        'enrollmentId', e.id,
        'userId', e.user_id,
        'challengeId', e.challenge_id,
        'reward', e.reward_snapshot
      )
    )
    on conflict (dedupe_key) where dedupe_key is not null do nothing;

    update pt650.challenge_enrollments
    set status = 'completed',
        completed_at = coalesce(completed_at, now())
    where id = e.id;

    return 'queued_partner';
  end if;

  update pt650.challenge_reward_reservations
  set state = 'settled',
      settled_at = now()
  where enrollment_id = e.id;

  update pt650.challenge_budgets
  set reserved_amount = reserved_amount - r.amount,
      settled_amount = settled_amount + r.amount,
      updated_at = now()
  where challenge_id = e.challenge_id
    and challenge_version = e.challenge_version;

  update pt650.challenge_enrollments
  set status = 'settled',
      completed_at = coalesce(completed_at, now()),
      settled_at = now()
  where id = e.id;

  return 'settled';
end;
$$;

-- Queue lease primitives. SKIP LOCKED lets many workers drain the same outbox without a global
-- coordinator. A crashed lease is reclaimable after five minutes.
create or replace function pt650.claim_outbox(
  p_worker_id text,
  p_limit integer default 100
)
returns setof pt650.outbox
language plpgsql
security definer
set search_path = pt650, public
as $$
begin
  if p_worker_id is null or length(trim(p_worker_id)) = 0 then
    raise exception 'worker id required';
  end if;

  return query
  with picked as (
    select o.id
    from pt650.outbox o
    where o.completed_at is null
      and o.available_at <= now()
      and (o.locked_at is null or o.locked_at < now() - interval '5 minutes')
    order by o.available_at, o.created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 100), 500))
  )
  update pt650.outbox o
  set locked_at = now(),
      locked_by = p_worker_id,
      attempts = o.attempts + 1
  from picked
  where o.id = picked.id
  returning o.*;
end;
$$;

create or replace function pt650.complete_outbox(
  p_id uuid,
  p_worker_id text
)
returns boolean
language sql
security definer
set search_path = pt650, public
as $$
  update pt650.outbox
  set completed_at = now(),
      locked_at = null,
      locked_by = null,
      last_error = null
  where id = p_id
    and completed_at is null
    and locked_by = p_worker_id
  returning true;
$$;

create or replace function pt650.fail_outbox(
  p_id uuid,
  p_worker_id text,
  p_error text,
  p_retry_seconds integer
)
returns boolean
language sql
security definer
set search_path = pt650, public
as $$
  update pt650.outbox
  set available_at = now() + make_interval(secs => greatest(1, least(coalesce(p_retry_seconds, 30), 3600))),
      locked_at = null,
      locked_by = null,
      last_error = left(coalesce(p_error, 'worker failure'), 1000)
  where id = p_id
    and completed_at is null
    and locked_by = p_worker_id
  returning true;
$$;

comment on function pt650.ingest_activity_event is
  'Atomic exactly-once logical ingest: idempotency guard + event + verification outbox.';
comment on function pt650.enroll_challenge is
  'Freezes challenge terms and reserves sponsor funding before the athlete starts.';
comment on function pt650.settle_challenge_reward is
  'Idempotently settles internal rewards or queues external partner issuance.';
