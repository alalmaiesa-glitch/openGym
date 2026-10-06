-- PT650 Platform Core V3 — server-only boundary
-- The browser/mobile client never talks to PT650 reward/activity tables directly.
-- All access goes through the trusted PT650 backend.

do $pt650_rls$
declare
  r record;
begin
  for r in
    select c.oid::regclass as rel
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'pt650'
      and c.relkind in ('r','p')
  loop
    execute format('alter table %s enable row level security', r.rel);
  end loop;
end;
$pt650_rls$;

-- Remove direct Data API access for browser roles.
revoke all on schema pt650 from public, anon, authenticated;
revoke all on all tables in schema pt650 from public, anon, authenticated;
revoke all on all sequences in schema pt650 from public, anon, authenticated;
revoke all on all functions in schema pt650 from public, anon, authenticated;

-- The server-side Supabase service role is the only API role allowed into this schema.
grant usage on schema pt650 to service_role;
grant all on all tables in schema pt650 to service_role;
grant all on all sequences in schema pt650 to service_role;
grant execute on all functions in schema pt650 to service_role;

-- Make future objects server-only by default as well.
alter default privileges in schema pt650
  revoke all on tables from public, anon, authenticated;
alter default privileges in schema pt650
  revoke all on sequences from public, anon, authenticated;
alter default privileges in schema pt650
  revoke execute on functions from public, anon, authenticated;

alter default privileges in schema pt650
  grant all on tables to service_role;
alter default privileges in schema pt650
  grant all on sequences to service_role;
alter default privileges in schema pt650
  grant execute on functions to service_role;

-- Narrow public-schema RPC bridge for the PT650 backend. These are exposed by PostgREST but
-- executable only by service_role. The client cannot forge user_id because only the backend owns
-- the service-role credential and derives the user from the existing PT650 session.

create or replace function public.pt650_ingest_activity(
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
language sql
security definer
set search_path = pg_catalog, public, pt650
as $$
  select *
  from pt650.ingest_activity_event(
    p_user_id,
    p_idempotency_key,
    p_event_id,
    p_event_type,
    p_source,
    p_occurred_at,
    p_payload,
    p_evidence_artifact_id,
    p_evidence_sha256,
    p_venue_id,
    p_equipment_model_id,
    p_equipment_instance_id
  );
$$;

create or replace function public.pt650_enroll_challenge(
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
language sql
security definer
set search_path = pg_catalog, public, pt650
as $$
  select *
  from pt650.enroll_challenge(
    p_user_id,
    p_challenge_id,
    p_challenge_version
  );
$$;

create or replace function public.pt650_move_challenges(
  p_user_id text
)
returns table (
  challenge_id text,
  version integer,
  title text,
  metric text,
  target numeric,
  starts_at timestamptz,
  ends_at timestamptz,
  reward_kind text,
  reward_value bigint,
  reward_display text,
  verification_disclosure text,
  sponsor_id text,
  sponsor_name text,
  enrollment_status text,
  progress numeric,
  reward_reserved boolean
)
language sql
security definer
set search_path = pg_catalog, public, pt650
as $$
  select
    c.challenge_id,
    c.version,
    c.title,
    c.metric,
    c.target,
    c.starts_at,
    c.ends_at,
    c.reward_kind,
    c.reward_value,
    c.reward_display,
    c.verification_disclosure,
    c.sponsor_org_id,
    o.name,
    e.status,
    coalesce(cp.value, 0),
    (rr.state = 'reserved')
  from pt650.challenges c
  join pt650.organizations o
    on o.id = c.sponsor_org_id
  left join pt650.challenge_enrollments e
    on e.challenge_id = c.challenge_id
   and e.challenge_version = c.version
   and e.user_id = p_user_id
  left join pt650.challenge_progress cp
    on cp.enrollment_id = e.id
  left join pt650.challenge_reward_reservations rr
    on rr.enrollment_id = e.id
  where c.status in ('scheduled','active')
    and c.ends_at > now()
  order by c.starts_at, c.created_at;
$$;

create or replace function public.pt650_reward_summary(
  p_user_id text
)
returns table (
  ptc_balance bigint,
  active_access_until timestamptz,
  settled_rewards bigint
)
language sql
security definer
set search_path = pg_catalog, public, pt650
as $$
  select
    coalesce((
      select sum(l.amount)
      from pt650.reward_ledger l
      where l.user_id = p_user_id
        and l.currency = 'PTC'
    ), 0)::bigint,
    (
      select max(g.ends_at)
      from pt650.entitlement_grants g
      where g.user_id = p_user_id
        and g.entitlement = 'advanced_access'
        and g.ends_at > now()
    ),
    (
      select count(*)
      from pt650.challenge_enrollments e
      where e.user_id = p_user_id
        and e.status = 'settled'
    )::bigint;
$$;

-- PostgREST grants function EXECUTE to PUBLIC by default unless revoked.
revoke all on function public.pt650_ingest_activity(
  text,text,uuid,text,text,timestamptz,jsonb,uuid,text,text,text,text
) from public, anon, authenticated;
revoke all on function public.pt650_enroll_challenge(text,text,integer)
  from public, anon, authenticated;
revoke all on function public.pt650_move_challenges(text)
  from public, anon, authenticated;
revoke all on function public.pt650_reward_summary(text)
  from public, anon, authenticated;

grant execute on function public.pt650_ingest_activity(
  text,text,uuid,text,text,timestamptz,jsonb,uuid,text,text,text,text
) to service_role;
grant execute on function public.pt650_enroll_challenge(text,text,integer)
  to service_role;
grant execute on function public.pt650_move_challenges(text)
  to service_role;
grant execute on function public.pt650_reward_summary(text)
  to service_role;

comment on function public.pt650_ingest_activity is
  'Server-only PostgREST bridge. Browser roles have no EXECUTE privilege.';
comment on function public.pt650_enroll_challenge is
  'Server-only challenge enrollment bridge with pre-funded reward reservation.';
