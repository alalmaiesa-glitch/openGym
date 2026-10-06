-- PT650 Platform Core V2.1
-- Exactly-once challenge progress from verified activity.

-- A verified event may apply to several active challenges, but only once to each enrollment.
-- Partition by the event's received_at so old dedupe rows can age with old event partitions.
create table if not exists pt650.challenge_progress_events (
  received_at timestamptz not null,
  event_id uuid not null,
  enrollment_id uuid not null references pt650.challenge_enrollments(id) on delete cascade,
  delta numeric(20,3) not null check (delta >= 0),
  applied_at timestamptz not null default now(),
  primary key (received_at, event_id, enrollment_id)
) partition by range (received_at);

create table if not exists pt650.challenge_progress_events_default
  partition of pt650.challenge_progress_events default;

create index if not exists challenge_progress_events_enrollment_idx
  on pt650.challenge_progress_events (enrollment_id, applied_at desc);

create or replace function pt650.activity_metric_delta(
  p_metric text,
  p_event_type text,
  p_payload jsonb
)
returns numeric
language sql
immutable
parallel safe
as $$
  select case
    when p_metric = 'steps'
      and p_event_type in ('walk','run')
      and jsonb_typeof(p_payload -> 'steps') = 'number'
      then greatest(0, (p_payload ->> 'steps')::numeric)

    when p_metric = 'distance_m'
      and p_event_type in ('walk','run')
      and jsonb_typeof(p_payload -> 'distanceM') = 'number'
      then greatest(0, (p_payload ->> 'distanceM')::numeric)

    when p_metric = 'active_minutes'
      and p_event_type in ('walk','run')
      and jsonb_typeof(p_payload -> 'durationSec') = 'number'
      then floor(greatest(0, (p_payload ->> 'durationSec')::numeric) / 60)

    when p_metric = 'verified_machine_uses'
      and p_event_type = 'gym_machine_use'
      then 1

    when p_metric = 'verified_contributions'
      and p_event_type in ('equipment_contribution','equipment_feedback')
      then 1

    else 0
  end;
$$;

-- Called by an activity.verified worker. The per-enrollment application table makes this safe
-- when the worker completes the transaction but crashes before acknowledging the outbox lease.
create or replace function pt650.apply_verified_activity(
  p_received_at timestamptz,
  p_event_id uuid
)
returns table (
  enrollment_id uuid,
  delta numeric,
  progress numeric,
  settlement text
)
language plpgsql
security definer
set search_path = pt650, public
as $$
declare
  ev pt650.activity_events%rowtype;
  rec record;
  v_delta numeric;
  v_progress numeric;
  v_settlement text;
begin
  select * into ev
  from pt650.activity_events
  where received_at = p_received_at
    and event_id = p_event_id;

  if not found
     or ev.verification_status <> 'verified'
     or ev.risk_status <> 'clear' then
    return;
  end if;

  for rec in
    select
      e.id,
      c.metric,
      c.starts_at,
      c.ends_at
    from pt650.challenge_enrollments e
    join pt650.challenges c
      on c.challenge_id = e.challenge_id
     and c.version = e.challenge_version
    where e.user_id = ev.user_id
      and e.status in ('active','completed')
      and ev.occurred_at >= c.starts_at
      and ev.occurred_at <= c.ends_at
  loop
    v_delta := pt650.activity_metric_delta(rec.metric, ev.event_type, ev.payload);
    if v_delta <= 0 then
      continue;
    end if;

    insert into pt650.challenge_progress_events(
      received_at, event_id, enrollment_id, delta
    ) values (
      ev.received_at, ev.event_id, rec.id, v_delta
    )
    on conflict (received_at, event_id, enrollment_id) do nothing;

    if not found then
      select p.value into v_progress
      from pt650.challenge_progress p
      where p.enrollment_id = rec.id;

      enrollment_id := rec.id;
      delta := 0;
      progress := coalesce(v_progress, 0);
      settlement := 'duplicate_event';
      return next;
      continue;
    end if;

    insert into pt650.challenge_progress(
      enrollment_id, value, event_count, last_event_at, updated_at
    ) values (
      rec.id, v_delta, 1, ev.occurred_at, now()
    )
    on conflict (enrollment_id) do update
      set value = pt650.challenge_progress.value + excluded.value,
          event_count = pt650.challenge_progress.event_count + 1,
          last_event_at = greatest(
            coalesce(pt650.challenge_progress.last_event_at, excluded.last_event_at),
            excluded.last_event_at
          ),
          updated_at = now()
    returning value into v_progress;

    v_settlement := pt650.settle_challenge_reward(rec.id);

    enrollment_id := rec.id;
    delta := v_delta;
    progress := v_progress;
    settlement := v_settlement;
    return next;
  end loop;
end;
$$;

-- External partner reward workers call this only after the partner confirms issuance.
create or replace function pt650.confirm_partner_reward(
  p_enrollment_id uuid,
  p_partner_reference text
)
returns text
language plpgsql
security definer
set search_path = pt650, public
as $$
declare
  e pt650.challenge_enrollments%rowtype;
  r pt650.challenge_reward_reservations%rowtype;
begin
  select * into e
  from pt650.challenge_enrollments
  where id = p_enrollment_id
  for update;

  if not found then return 'missing'; end if;
  if e.status = 'settled' then return 'already_settled'; end if;
  if e.status <> 'completed' then return 'not_ready'; end if;

  select * into r
  from pt650.challenge_reward_reservations
  where enrollment_id = e.id
  for update;

  if not found or r.state <> 'reserved' then return 'no_reservation'; end if;

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
      settled_at = now(),
      completed_at = coalesce(completed_at, now()),
      reward_snapshot = reward_snapshot ||
        jsonb_build_object('partnerReference', left(coalesce(p_partner_reference, ''), 200))
  where id = e.id;

  return 'settled';
end;
$$;

comment on function pt650.apply_verified_activity is
  'Exactly-once application of a verified activity event to all matching enrolled challenges.';
