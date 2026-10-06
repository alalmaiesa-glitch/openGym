-- PT650 Health & Endurance Core V1.1
-- Generic clean-room adapter write contracts for activity summaries, laps and stream chunks.

create or replace function public.pt650_endurance_ingest_activity(
  p_user_id uuid,
  p_provider text,
  p_source_kind text,
  p_external_key text,
  p_activity jsonb
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
  v_type text := nullif(trim(coalesce(p_activity->>'activityType','')), '');
  v_started timestamptz;
  v_ended timestamptz;
  v_duration integer;
  v_verification text := coalesce(nullif(p_activity->>'verification',''), 'source_attested');
  v_confidence numeric := coalesce((p_activity->>'confidence')::numeric, 1);
begin
  if p_external_key is null or length(trim(p_external_key)) = 0 or length(p_external_key) > 256 then
    raise exception 'external key required';
  end if;
  if v_type is null or v_type !~ '^[a-z][a-z0-9_]{1,63}$' then raise exception 'invalid activity type'; end if;

  begin
    v_started := (p_activity->>'startedAt')::timestamptz;
    v_ended := (p_activity->>'endedAt')::timestamptz;
    v_duration := (p_activity->>'durationSec')::integer;
  exception when others then
    raise exception 'invalid activity time values';
  end;

  if v_started is null or v_ended is null or v_ended < v_started or v_duration < 0 then
    raise exception 'invalid activity time range';
  end if;
  if v_verification not in ('self_reported','source_attested','pt650_verified','review','rejected') then
    raise exception 'invalid verification';
  end if;
  if v_confidence < 0 or v_confidence > 1 then raise exception 'invalid confidence'; end if;

  v_source := pt650.ensure_health_source(
    p_user_id, p_provider, p_source_kind, p_provider,
    nullif(trim(coalesce(p_activity->>'externalAccountKey','')), '')
  );

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
    duration_sec, moving_time_sec, distance_m, elevation_gain_m, energy_kcal,
    avg_hr_bpm, max_hr_bpm, avg_power_w, max_power_w, avg_cadence,
    route_fingerprint, verification, confidence, metadata
  ) values (
    v_id, p_user_id, v_source, v_type, nullif(trim(coalesce(p_activity->>'title','')), ''),
    v_started, v_ended, v_duration,
    nullif(p_activity->>'movingTimeSec','')::integer,
    nullif(p_activity->>'distanceM','')::numeric,
    nullif(p_activity->>'elevationGainM','')::numeric,
    nullif(p_activity->>'energyKcal','')::numeric,
    nullif(p_activity->>'avgHrBpm','')::numeric,
    nullif(p_activity->>'maxHrBpm','')::numeric,
    nullif(p_activity->>'avgPowerW','')::numeric,
    nullif(p_activity->>'maxPowerW','')::numeric,
    nullif(p_activity->>'avgCadence','')::numeric,
    nullif(p_activity->>'routeFingerprint',''),
    v_verification, v_confidence,
    coalesce(p_activity->'metadata', '{}'::jsonb)
  );

  update pt650.health_sources
  set last_synced_at = now(), updated_at = now()
  where id = v_source;

  return query select v_id, false;
end;
$pt650$;

create or replace function public.pt650_endurance_replace_laps(
  p_user_id uuid,
  p_activity_id uuid,
  p_laps jsonb
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, pt650
as $pt650$
declare
  v_count integer;
begin
  if not exists (
    select 1 from pt650.endurance_activities a
    where a.id = p_activity_id and a.user_id = p_user_id
  ) then raise exception 'activity not found'; end if;

  if p_laps is null or jsonb_typeof(p_laps) <> 'array' then raise exception 'laps must be an array'; end if;
  v_count := jsonb_array_length(p_laps);
  if v_count > 1000 then raise exception 'too many laps'; end if;

  delete from pt650.activity_laps where activity_id = p_activity_id;

  insert into pt650.activity_laps(
    activity_id, lap_index, started_at, ended_at, duration_sec, distance_m,
    avg_hr_bpm, max_hr_bpm, avg_power_w, avg_cadence, metadata
  )
  select
    p_activity_id,
    ordinality::integer - 1,
    nullif(x->>'startedAt','')::timestamptz,
    nullif(x->>'endedAt','')::timestamptz,
    nullif(x->>'durationSec','')::numeric,
    nullif(x->>'distanceM','')::numeric,
    nullif(x->>'avgHrBpm','')::numeric,
    nullif(x->>'maxHrBpm','')::numeric,
    nullif(x->>'avgPowerW','')::numeric,
    nullif(x->>'avgCadence','')::numeric,
    coalesce(x->'metadata','{}'::jsonb)
  from jsonb_array_elements(p_laps) with ordinality as e(x, ordinality);

  return v_count;
end;
$pt650$;

create or replace function public.pt650_endurance_put_stream_chunk(
  p_user_id uuid,
  p_activity_id uuid,
  p_stream_type text,
  p_chunk_index integer,
  p_start_offset_ms bigint,
  p_sample_interval_ms integer,
  p_unit text,
  p_encoding text,
  p_values_json jsonb,
  p_artifact_key text,
  p_sample_count integer,
  p_min_value numeric,
  p_max_value numeric,
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, pt650
as $pt650$
begin
  if not exists (
    select 1 from pt650.endurance_activities a
    where a.id = p_activity_id and a.user_id = p_user_id
  ) then raise exception 'activity not found'; end if;
  if p_stream_type !~ '^[a-z][a-z0-9_]{1,63}$' then raise exception 'invalid stream type'; end if;
  if p_chunk_index < 0 or p_start_offset_ms < 0 or p_sample_count < 0 or p_sample_count > 4096 then
    raise exception 'invalid stream chunk';
  end if;
  if p_encoding not in ('json_array','delta_json','artifact') then raise exception 'invalid stream encoding'; end if;
  if p_stream_type in ('latlng','location','gps') and p_encoding <> 'artifact' then
    raise exception 'location stream must use protected artifact';
  end if;

  insert into pt650.activity_stream_chunks(
    activity_id, stream_type, chunk_index, start_offset_ms, sample_interval_ms,
    sample_count, unit, encoding, values_json, artifact_key, min_value, max_value, metadata
  ) values (
    p_activity_id, p_stream_type, p_chunk_index, p_start_offset_ms, p_sample_interval_ms,
    p_sample_count, nullif(trim(coalesce(p_unit,'')), ''), p_encoding, p_values_json,
    nullif(trim(coalesce(p_artifact_key,'')), ''), p_min_value, p_max_value,
    coalesce(p_metadata,'{}'::jsonb)
  )
  on conflict (activity_id, stream_type, chunk_index) do update
  set start_offset_ms = excluded.start_offset_ms,
      sample_interval_ms = excluded.sample_interval_ms,
      sample_count = excluded.sample_count,
      unit = excluded.unit,
      encoding = excluded.encoding,
      values_json = excluded.values_json,
      artifact_key = excluded.artifact_key,
      min_value = excluded.min_value,
      max_value = excluded.max_value,
      metadata = excluded.metadata;

  return true;
end;
$pt650$;

revoke all on function public.pt650_endurance_ingest_activity(uuid,text,text,text,jsonb)
  from public, anon, authenticated;
revoke all on function public.pt650_endurance_replace_laps(uuid,uuid,jsonb)
  from public, anon, authenticated;
revoke all on function public.pt650_endurance_put_stream_chunk(
  uuid,uuid,text,integer,bigint,integer,text,text,jsonb,text,integer,numeric,numeric,jsonb
) from public, anon, authenticated;

grant execute on function public.pt650_endurance_ingest_activity(uuid,text,text,text,jsonb)
  to service_role;
grant execute on function public.pt650_endurance_replace_laps(uuid,uuid,jsonb)
  to service_role;
grant execute on function public.pt650_endurance_put_stream_chunk(
  uuid,uuid,text,integer,bigint,integer,text,text,jsonb,text,integer,numeric,numeric,jsonb
) to service_role;
