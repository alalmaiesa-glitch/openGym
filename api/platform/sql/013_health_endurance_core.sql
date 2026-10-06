-- PT650 Health & Endurance Core V1
-- Clean-room canonical health/activity model inspired by public fitness-domain patterns.
-- No Endurain source code is copied. All browser roles remain blocked; only service_role RPCs
-- may write/read these tables through the authenticated pt650-platform Edge Function.

create table if not exists pt650.health_adapter_registry (
  provider text primary key,
  display_name text not null,
  transport text not null
    check (transport in ('first_party','native_bridge','oauth','file_import','manual')),
  status text not null
    check (status in ('active','planned','disabled')),
  capabilities text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (provider ~ '^[a-z0-9][a-z0-9_-]{1,63}$')
);

insert into pt650.health_adapter_registry(provider, display_name, transport, status, capabilities)
values
  ('pt650_move','PT650 Move','first_party','active',array['activity','gps_summary','verified_activity']),
  ('pt650_workout','PT650 Workout','first_party','active',array['strength_training']),
  ('apple_health','Apple Health','native_bridge','planned',array['health','activity','sleep','body','heart']),
  ('health_connect','Android Health Connect','native_bridge','planned',array['health','activity','sleep','body','heart']),
  ('huawei_health','Huawei Health','native_bridge','planned',array['health','activity','sleep','body','heart']),
  ('garmin','Garmin Connect','oauth','planned',array['activity','sleep','body','heart','gear']),
  ('strava','Strava','oauth','planned',array['activity','route']),
  ('fit','FIT file','file_import','planned',array['activity','streams','laps']),
  ('gpx','GPX file','file_import','planned',array['activity','route']),
  ('tcx','TCX file','file_import','planned',array['activity','streams','laps']),
  ('manual','Manual entry','manual','active',array['body','hydration'])
on conflict (provider) do update
set display_name = excluded.display_name,
    transport = excluded.transport,
    capabilities = excluded.capabilities,
    updated_at = now();

create table if not exists pt650.health_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null references pt650.health_adapter_registry(provider),
  source_kind text not null
    check (source_kind in ('first_party','wearable','platform','file','manual')),
  label text,
  external_account_key text,
  status text not null default 'active'
    check (status in ('active','paused','revoked','error')),
  capabilities text[] not null default '{}',
  sync_cursor jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists health_sources_identity_uidx
  on pt650.health_sources (
    user_id,
    provider,
    source_kind,
    coalesce(external_account_key, '')
  );

create index if not exists health_sources_user_idx
  on pt650.health_sources (user_id, status, provider);

create table if not exists pt650.health_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid not null references pt650.health_sources(id) on delete cascade,
  external_device_key text,
  manufacturer text,
  model text,
  device_type text,
  software_version text,
  metadata jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create unique index if not exists health_devices_source_key_uidx
  on pt650.health_devices (source_id, coalesce(external_device_key, ''))
  where external_device_key is not null;

create index if not exists health_devices_user_idx
  on pt650.health_devices (user_id, source_id, last_seen_at desc);

-- Durable import idempotency. Each connector/file object claims one target id once.
create table if not exists pt650.health_import_keys (
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid not null references pt650.health_sources(id) on delete cascade,
  object_kind text not null check (object_kind in ('observation','activity')),
  external_key text not null,
  target_id uuid not null,
  imported_at timestamptz not null default now(),
  primary key (user_id, source_id, object_kind, external_key)
);

create index if not exists health_import_keys_target_idx
  on pt650.health_import_keys (target_id);

-- Health observations are summaries/samples, not high-frequency streams. High-frequency
-- heart-rate/power/cadence/GPS series belong in activity_stream_chunks below.
create table if not exists pt650.health_observations (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid not null references pt650.health_sources(id) on delete cascade,
  device_id uuid references pt650.health_devices(id) on delete set null,
  metric text not null
    check (metric ~ '^[a-z][a-z0-9_]{1,63}$'),
  value_num numeric,
  value_json jsonb,
  unit text,
  started_at timestamptz not null,
  ended_at timestamptz,
  aggregation text not null default 'sample'
    check (aggregation in ('sample','average','minimum','maximum','sum','daily','session')),
  verification text not null default 'source_attested'
    check (verification in ('self_reported','source_attested','pt650_verified','review','rejected')),
  confidence numeric(5,4) not null default 1
    check (confidence >= 0 and confidence <= 1),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at),
  check (value_num is not null or value_json is not null)
);

create index if not exists health_observations_user_metric_time_idx
  on pt650.health_observations (user_id, metric, started_at desc);
create index if not exists health_observations_source_time_idx
  on pt650.health_observations (source_id, started_at desc);

create table if not exists pt650.health_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  metric text not null check (metric ~ '^[a-z][a-z0-9_]{1,63}$'),
  target_value numeric not null,
  unit text not null,
  period text not null check (period in ('daily','weekly','monthly','rolling_7d','rolling_30d')),
  starts_on date not null default current_date,
  ends_on date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);

create index if not exists health_targets_user_active_idx
  on pt650.health_targets (user_id, active, metric);

create table if not exists pt650.endurance_activities (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid not null references pt650.health_sources(id) on delete cascade,
  device_id uuid references pt650.health_devices(id) on delete set null,
  activity_type text not null
    check (activity_type ~ '^[a-z][a-z0-9_]{1,63}$'),
  title text,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_sec integer not null check (duration_sec >= 0),
  moving_time_sec integer check (moving_time_sec is null or moving_time_sec >= 0),
  distance_m numeric(14,3) check (distance_m is null or distance_m >= 0),
  elevation_gain_m numeric(12,3) check (elevation_gain_m is null or elevation_gain_m >= 0),
  energy_kcal numeric(12,3) check (energy_kcal is null or energy_kcal >= 0),
  avg_hr_bpm numeric(8,3) check (avg_hr_bpm is null or avg_hr_bpm >= 0),
  max_hr_bpm numeric(8,3) check (max_hr_bpm is null or max_hr_bpm >= 0),
  avg_power_w numeric(12,3) check (avg_power_w is null or avg_power_w >= 0),
  max_power_w numeric(12,3) check (max_power_w is null or max_power_w >= 0),
  avg_cadence numeric(12,3) check (avg_cadence is null or avg_cadence >= 0),
  route_fingerprint char(64),
  route_artifact_id uuid,
  verification text not null default 'source_attested'
    check (verification in ('self_reported','source_attested','pt650_verified','review','rejected')),
  confidence numeric(5,4) not null default 1
    check (confidence >= 0 and confidence <= 1),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_at >= started_at)
);

create index if not exists endurance_activities_user_time_idx
  on pt650.endurance_activities (user_id, started_at desc);
create index if not exists endurance_activities_source_time_idx
  on pt650.endurance_activities (source_id, started_at desc);
create index if not exists endurance_activities_type_time_idx
  on pt650.endurance_activities (user_id, activity_type, started_at desc);

create table if not exists pt650.activity_laps (
  activity_id uuid not null references pt650.endurance_activities(id) on delete cascade,
  lap_index integer not null check (lap_index >= 0),
  started_at timestamptz,
  ended_at timestamptz,
  duration_sec numeric(12,3) check (duration_sec is null or duration_sec >= 0),
  distance_m numeric(14,3) check (distance_m is null or distance_m >= 0),
  avg_hr_bpm numeric(8,3),
  max_hr_bpm numeric(8,3),
  avg_power_w numeric(12,3),
  avg_cadence numeric(12,3),
  metadata jsonb not null default '{}'::jsonb,
  primary key (activity_id, lap_index),
  check (ended_at is null or started_at is null or ended_at >= started_at)
);

-- Chunked streams avoid a row per second while keeping heart rate/power/cadence portable.
-- Location coordinates are never stored inline here: latlng/location streams must use a
-- protected artifact reference so health queries do not accidentally expose a route.
create table if not exists pt650.activity_stream_chunks (
  activity_id uuid not null references pt650.endurance_activities(id) on delete cascade,
  stream_type text not null check (stream_type ~ '^[a-z][a-z0-9_]{1,63}$'),
  chunk_index integer not null check (chunk_index >= 0),
  start_offset_ms bigint not null default 0 check (start_offset_ms >= 0),
  sample_interval_ms integer check (sample_interval_ms is null or sample_interval_ms > 0),
  sample_count integer not null check (sample_count >= 0 and sample_count <= 4096),
  unit text,
  encoding text not null default 'json_array'
    check (encoding in ('json_array','delta_json','artifact')),
  values_json jsonb,
  artifact_key text,
  min_value numeric,
  max_value numeric,
  metadata jsonb not null default '{}'::jsonb,
  primary key (activity_id, stream_type, chunk_index),
  check (
    (encoding in ('json_array','delta_json') and values_json is not null and artifact_key is null)
    or (encoding = 'artifact' and values_json is null and artifact_key is not null)
  ),
  check (
    stream_type not in ('latlng','location','gps')
    or encoding = 'artifact'
  )
);

create index if not exists activity_stream_chunks_activity_idx
  on pt650.activity_stream_chunks (activity_id, stream_type, chunk_index);

-- Ensure a canonical source row without exposing connector credentials/tokens in this schema.
create or replace function pt650.ensure_health_source(
  p_user_id uuid,
  p_provider text,
  p_source_kind text,
  p_label text default null,
  p_external_account_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, pt650
as $pt650$
declare
  v_id uuid;
begin
  if p_user_id is null then raise exception 'user required'; end if;
  if not exists (select 1 from pt650.health_adapter_registry r where r.provider = p_provider) then
    raise exception 'unknown health provider';
  end if;
  if p_source_kind not in ('first_party','wearable','platform','file','manual') then
    raise exception 'invalid health source kind';
  end if;

  insert into pt650.health_sources(
    user_id, provider, source_kind, label, external_account_key, status
  ) values (
    p_user_id, p_provider, p_source_kind, nullif(trim(coalesce(p_label,'')), ''),
    nullif(trim(coalesce(p_external_account_key,'')), ''), 'active'
  )
  on conflict (
    user_id, provider, source_kind, (coalesce(external_account_key, ''))
  ) do update
  set label = coalesce(excluded.label, pt650.health_sources.label),
      status = 'active',
      updated_at = now()
  returning id into v_id;

  return v_id;
end;
$pt650$;

-- Idempotent normalized health observation ingest for future adapters/importers.
create or replace function public.pt650_health_ingest_observation(
  p_user_id uuid,
  p_provider text,
  p_source_kind text,
  p_external_key text,
  p_metric text,
  p_value_num numeric,
  p_value_json jsonb,
  p_unit text,
  p_started_at timestamptz,
  p_ended_at timestamptz,
  p_aggregation text,
  p_verification text,
  p_confidence numeric,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  observation_id uuid,
  duplicate boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public, pt650
as $pt650$
declare
  v_source uuid;
  v_id uuid := gen_random_uuid();
  v_target uuid;
begin
  if p_external_key is null or length(trim(p_external_key)) = 0 or length(p_external_key) > 256 then
    raise exception 'external key required';
  end if;
  if p_metric !~ '^[a-z][a-z0-9_]{1,63}$' then raise exception 'invalid metric'; end if;
  if p_started_at is null then raise exception 'started_at required'; end if;
  if p_ended_at is not null and p_ended_at < p_started_at then raise exception 'invalid time range'; end if;
  if p_value_num is null and p_value_json is null then raise exception 'value required'; end if;
  if p_aggregation not in ('sample','average','minimum','maximum','sum','daily','session') then
    raise exception 'invalid aggregation';
  end if;
  if p_verification not in ('self_reported','source_attested','pt650_verified','review','rejected') then
    raise exception 'invalid verification';
  end if;
  if p_confidence < 0 or p_confidence > 1 then raise exception 'invalid confidence'; end if;

  v_source := pt650.ensure_health_source(p_user_id, p_provider, p_source_kind, p_provider, null);

  insert into pt650.health_import_keys(user_id, source_id, object_kind, external_key, target_id)
  values (p_user_id, v_source, 'observation', p_external_key, v_id)
  on conflict (user_id, source_id, object_kind, external_key) do nothing
  returning target_id into v_target;

  if not found then
    select k.target_id into v_target
    from pt650.health_import_keys k
    where k.user_id = p_user_id
      and k.source_id = v_source
      and k.object_kind = 'observation'
      and k.external_key = p_external_key;

    return query select v_target, true;
    return;
  end if;

  insert into pt650.health_observations(
    id, user_id, source_id, metric, value_num, value_json, unit,
    started_at, ended_at, aggregation, verification, confidence, metadata
  ) values (
    v_id, p_user_id, v_source, p_metric, p_value_num, p_value_json, nullif(trim(coalesce(p_unit,'')), ''),
    p_started_at, p_ended_at, p_aggregation, p_verification, p_confidence, coalesce(p_metadata, '{}'::jsonb)
  );

  return query select v_id, false;
end;
$pt650$;

-- PT650 Move is the first live producer of canonical endurance activities.
create or replace function public.pt650_record_move_activity(
  p_user_id uuid,
  p_external_key text,
  p_started_at timestamptz,
  p_ended_at timestamptz,
  p_duration_sec integer,
  p_distance_m numeric,
  p_route_fingerprint text,
  p_verification text
)
returns table (
  activity_id uuid,
  duplicate boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public, pt650
as $pt650$
declare
  v_source uuid;
  v_id uuid := gen_random_uuid();
  v_target uuid;
begin
  if p_user_id is null then raise exception 'user required'; end if;
  if p_external_key is null or length(trim(p_external_key)) = 0 or length(p_external_key) > 256 then
    raise exception 'external key required';
  end if;
  if p_started_at is null or p_ended_at is null or p_ended_at < p_started_at then
    raise exception 'invalid activity time range';
  end if;
  if p_duration_sec < 0 or p_distance_m < 0 then raise exception 'invalid activity totals'; end if;
  if p_route_fingerprint is not null and p_route_fingerprint !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid route fingerprint';
  end if;
  if p_verification not in ('pt650_verified','review','rejected') then
    raise exception 'invalid move verification';
  end if;

  v_source := pt650.ensure_health_source(p_user_id, 'pt650_move', 'first_party', 'PT650 Move', null);

  insert into pt650.health_import_keys(user_id, source_id, object_kind, external_key, target_id)
  values (p_user_id, v_source, 'activity', p_external_key, v_id)
  on conflict (user_id, source_id, object_kind, external_key) do nothing
  returning target_id into v_target;

  if not found then
    select k.target_id into v_target
    from pt650.health_import_keys k
    where k.user_id = p_user_id
      and k.source_id = v_source
      and k.object_kind = 'activity'
      and k.external_key = p_external_key;

    return query select v_target, true;
    return;
  end if;

  insert into pt650.endurance_activities(
    id, user_id, source_id, activity_type, title, started_at, ended_at,
    duration_sec, moving_time_sec, distance_m, route_fingerprint,
    verification, confidence, metadata
  ) values (
    v_id, p_user_id, v_source, 'walk', 'PT650 Move',
    p_started_at, p_ended_at, p_duration_sec, p_duration_sec, p_distance_m,
    p_route_fingerprint,
    p_verification,
    case when p_verification = 'pt650_verified' then 1 else 0.5 end,
    jsonb_build_object('origin','pt650_move')
  );

  return query select v_id, false;
end;
$pt650$;

create or replace function public.pt650_health_summary(p_user_id uuid)
returns jsonb
language sql
security definer
stable
set search_path = pg_catalog, public, pt650
as $pt650$
  select jsonb_build_object(
    'latest', coalesce((
      select jsonb_object_agg(x.metric, x.payload)
      from (
        select distinct on (o.metric)
          o.metric,
          jsonb_build_object(
            'value', o.value_num,
            'valueJson', o.value_json,
            'unit', o.unit,
            'startedAt', o.started_at,
            'verification', o.verification,
            'confidence', o.confidence,
            'provider', s.provider
          ) as payload
        from pt650.health_observations o
        join pt650.health_sources s on s.id = o.source_id
        where o.user_id = p_user_id
          and o.verification <> 'rejected'
        order by o.metric, o.started_at desc, o.created_at desc
      ) x
    ), '{}'::jsonb),
    'activity30d', jsonb_build_object(
      'count', (
        select count(*)
        from pt650.endurance_activities a
        where a.user_id = p_user_id
          and a.started_at >= now() - interval '30 days'
          and a.verification <> 'rejected'
      ),
      'distanceM', coalesce((
        select sum(a.distance_m)
        from pt650.endurance_activities a
        where a.user_id = p_user_id
          and a.started_at >= now() - interval '30 days'
          and a.verification <> 'rejected'
      ), 0),
      'durationSec', coalesce((
        select sum(a.duration_sec)
        from pt650.endurance_activities a
        where a.user_id = p_user_id
          and a.started_at >= now() - interval '30 days'
          and a.verification <> 'rejected'
      ), 0)
    ),
    'sources', coalesce((
      select jsonb_agg(jsonb_build_object(
        'provider', s.provider,
        'label', s.label,
        'status', s.status,
        'lastSyncedAt', s.last_synced_at
      ) order by s.created_at)
      from pt650.health_sources s
      where s.user_id = p_user_id
    ), '[]'::jsonb)
  );
$pt650$;

create or replace function public.pt650_health_recent_activities(
  p_user_id uuid,
  p_limit integer default 20
)
returns table (
  activity_id uuid,
  activity_type text,
  title text,
  started_at timestamptz,
  duration_sec integer,
  distance_m numeric,
  verification text,
  confidence numeric,
  provider text
)
language sql
security definer
stable
set search_path = pg_catalog, public, pt650
as $pt650$
  select
    a.id, a.activity_type, a.title, a.started_at, a.duration_sec,
    a.distance_m, a.verification, a.confidence, s.provider
  from pt650.endurance_activities a
  join pt650.health_sources s on s.id = a.source_id
  where a.user_id = p_user_id
    and a.verification <> 'rejected'
  order by a.started_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$pt650$;

create or replace function public.pt650_health_adapter_status()
returns table (
  provider text,
  display_name text,
  transport text,
  status text,
  capabilities text[]
)
language sql
security definer
stable
set search_path = pg_catalog, public, pt650
as $pt650$
  select r.provider, r.display_name, r.transport, r.status, r.capabilities
  from pt650.health_adapter_registry r
  order by case r.status when 'active' then 0 when 'planned' then 1 else 2 end, r.display_name;
$pt650$;

-- Entire Health/Endurance domain remains server-only.
do $pt650_rls$
declare
  r record;
begin
  for r in
    select c.oid::regclass as rel
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'pt650'
      and c.relname in (
        'health_adapter_registry','health_sources','health_devices','health_import_keys',
        'health_observations','health_targets','endurance_activities',
        'activity_laps','activity_stream_chunks'
      )
  loop
    execute format('alter table %s enable row level security', r.rel);
    execute format('revoke all on table %s from public, anon, authenticated', r.rel);
    execute format('grant all on table %s to service_role', r.rel);
  end loop;
end;
$pt650_rls$;

revoke all on function pt650.ensure_health_source(uuid,text,text,text,text)
  from public, anon, authenticated;
grant execute on function pt650.ensure_health_source(uuid,text,text,text,text)
  to service_role;

revoke all on function public.pt650_health_ingest_observation(
  uuid,text,text,text,text,numeric,jsonb,text,timestamptz,timestamptz,text,text,numeric,jsonb
) from public, anon, authenticated;
revoke all on function public.pt650_record_move_activity(
  uuid,text,timestamptz,timestamptz,integer,numeric,text,text
) from public, anon, authenticated;
revoke all on function public.pt650_health_summary(uuid)
  from public, anon, authenticated;
revoke all on function public.pt650_health_recent_activities(uuid,integer)
  from public, anon, authenticated;
revoke all on function public.pt650_health_adapter_status()
  from public, anon, authenticated;

grant execute on function public.pt650_health_ingest_observation(
  uuid,text,text,text,text,numeric,jsonb,text,timestamptz,timestamptz,text,text,numeric,jsonb
) to service_role;
grant execute on function public.pt650_record_move_activity(
  uuid,text,timestamptz,timestamptz,integer,numeric,text,text
) to service_role;
grant execute on function public.pt650_health_summary(uuid)
  to service_role;
grant execute on function public.pt650_health_recent_activities(uuid,integer)
  to service_role;
grant execute on function public.pt650_health_adapter_status()
  to service_role;
