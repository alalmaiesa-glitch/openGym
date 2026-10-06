-- PT650 Platform Core V2 corrective migration
-- Aligns enroll_challenge's fixed-length terms hash storage with its text RPC contract.

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
             v_existing.terms_hash::text,
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
    return query select null::uuid, 'sold_out'::text, c.terms_hash::text, v_reward;
    return;
  end if;

  insert into pt650.challenge_progress(enrollment_id)
  values (v_id)
  on conflict on constraint challenge_progress_pkey do nothing;

  return query select v_id, 'enrolled'::text, c.terms_hash::text, v_reward;
end;
$$;
