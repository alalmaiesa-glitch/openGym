-- PT650 Platform Core V2 corrective migration
-- Replaces two functions whose output column names collided with ON CONFLICT column targets.
-- Safe to re-run; CREATE OR REPLACE preserves the API contract.

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
  on conflict on constraint challenge_progress_pkey do nothing;

  return query select v_id, 'enrolled'::text, c.terms_hash, v_reward;
end;
$$;

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
    on conflict on constraint challenge_progress_events_pkey do nothing;

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
    on conflict on constraint challenge_progress_pkey do update
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
