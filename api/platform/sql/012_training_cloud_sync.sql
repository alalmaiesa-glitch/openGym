-- PT650 Workout Cloud Sync V1
-- One revisioned training document per authenticated athlete.
-- The browser never reads this table directly; the JWT-protected Edge Function is the only path.

create table if not exists pt650.training_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 1 check (revision >= 1),
  state jsonb not null,
  state_ts bigint not null default 0 check (state_ts >= 0),
  updated_at timestamptz not null default now()
);

alter table pt650.training_states enable row level security;
revoke all on table pt650.training_states from public, anon, authenticated;
grant all on table pt650.training_states to service_role;

create or replace function public.pt650_training_get(p_user_id uuid)
returns table (
  rev bigint,
  state jsonb,
  state_ts bigint,
  updated_at timestamptz
)
language sql
security definer
stable
set search_path = pg_catalog, public, pt650
as $$
  select t.revision, t.state, t.state_ts, t.updated_at
  from pt650.training_states t
  where t.user_id = p_user_id;
$$;

create or replace function public.pt650_training_revision(p_user_id uuid)
returns table (
  rev bigint,
  state_ts bigint,
  updated_at timestamptz
)
language sql
security definer
stable
set search_path = pg_catalog, public, pt650
as $$
  select coalesce(t.revision, 0::bigint), coalesce(t.state_ts, 0::bigint), t.updated_at
  from (select 1) seed
  left join pt650.training_states t on t.user_id = p_user_id;
$$;

create or replace function public.pt650_training_put(
  p_user_id uuid,
  p_base_revision bigint,
  p_state jsonb,
  p_state_ts bigint
)
returns table (
  outcome text,
  rev bigint,
  state jsonb,
  state_ts bigint,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, pt650
as $$
declare
  v_current pt650.training_states%rowtype;
  v_updated pt650.training_states%rowtype;
  v_size integer;
begin
  if p_user_id is null then raise exception 'user required'; end if;
  if p_state is null or jsonb_typeof(p_state) <> 'object' then raise exception 'state must be an object'; end if;
  if p_state_ts is null or p_state_ts < 0 then raise exception 'invalid state timestamp'; end if;

  v_size := octet_length(p_state::text);
  if v_size > 2500000 then
    raise exception 'training state too large' using errcode = '22001';
  end if;

  select *
  into v_current
  from pt650.training_states
  where user_id = p_user_id
  for update;

  if not found then
    if coalesce(p_base_revision, 0) <> 0 then
      return query select 'conflict'::text, 0::bigint, null::jsonb, 0::bigint, null::timestamptz;
      return;
    end if;

    insert into pt650.training_states(user_id, revision, state, state_ts, updated_at)
    values (p_user_id, 1, p_state, p_state_ts, now())
    returning * into v_updated;

    return query
    select 'written'::text, v_updated.revision, null::jsonb, v_updated.state_ts, v_updated.updated_at;
    return;
  end if;

  if p_base_revision is null or p_base_revision <> v_current.revision then
    return query
    select 'conflict'::text, v_current.revision, v_current.state, v_current.state_ts, v_current.updated_at;
    return;
  end if;

  update pt650.training_states
  set revision = v_current.revision + 1,
      state = p_state,
      state_ts = p_state_ts,
      updated_at = now()
  where user_id = p_user_id
  returning * into v_updated;

  return query
  select 'written'::text, v_updated.revision, null::jsonb, v_updated.state_ts, v_updated.updated_at;
end;
$$;

revoke all on function public.pt650_training_get(uuid) from public, anon, authenticated;
revoke all on function public.pt650_training_revision(uuid) from public, anon, authenticated;
revoke all on function public.pt650_training_put(uuid,bigint,jsonb,bigint) from public, anon, authenticated;

grant execute on function public.pt650_training_get(uuid) to service_role;
grant execute on function public.pt650_training_revision(uuid) to service_role;
grant execute on function public.pt650_training_put(uuid,bigint,jsonb,bigint) to service_role;
