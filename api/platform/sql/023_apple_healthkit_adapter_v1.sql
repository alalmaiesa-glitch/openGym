-- PT650 Apple HealthKit Adapter V1
-- Native iOS read bridge + exact-provider idempotency + atomic server cursor commit.
-- Permission request alone never creates an active Health source.

update pt650.health_adapter_registry
set status = 'active',
    adapter_version = 1,
    auth_strategy = 'native_permission',
    sync_strategy = 'native_pull',
    requires_native = true,
    uses_token_vault = false,
    backfill_days = 90,
    capabilities = array[
      'body_weight','body_fat','resting_heart_rate','hrv_sdnn',
      'oxygen_saturation','respiratory_rate','body_temperature','sleep','workouts'
    ]::text[],
    updated_at = now()
where provider = 'apple_health';

create or replace function public.pt650_wearable_upsert_connection(
  p_user_id uuid,
  p_provider text,
  p_external_account_key text,
  p_label text,
  p_status text,
  p_scopes text[],
  p_permission_state jsonb
)
returns table (
  connection_id uuid,
  source_id uuid,
  status text,
  provider text,
  connection_mode text
)
language plpgsql
security definer
set search_path = pg_catalog, public, pt650
as $pt650$
declare
  v_transport text;
  v_mode text;
  v_source_kind text;
  v_source uuid;
  v_existing_source uuid;
  v_existing_status text;
  v_effective_status text := p_status;
  v_connection pt650.health_connections%rowtype;
begin
  if p_user_id is null then raise exception 'user required'; end if;
  if p_status not in ('pending','active','paused','revoked','error') then
    raise exception 'invalid connection status';
  end if;

  select r.transport into v_transport
  from pt650.health_adapter_registry r
  where r.provider = p_provider
    and r.status <> 'disabled';

  if not found then raise exception 'health adapter unavailable'; end if;

  v_mode := pt650.health_connection_mode(v_transport);
  v_source_kind := case v_mode
    when 'first_party' then 'first_party'
    when 'native' then 'wearable'
    when 'oauth' then 'platform'
    when 'file' then 'file'
    else 'manual'
  end;

  select c.source_id, c.status
  into v_existing_source, v_existing_status
  from pt650.health_connections c
  where c.user_id = p_user_id
    and c.provider = p_provider
    and c.connection_mode = v_mode
    and coalesce(c.external_account_key, '') = coalesce(nullif(trim(coalesce(p_external_account_key,'')), ''), '')
  for update;

  if found and v_existing_status = 'active' and p_status = 'pending' then
    v_effective_status := 'active';
  end if;

  if v_effective_status = 'active' then
    v_source := pt650.ensure_health_source(
      p_user_id,
      p_provider,
      v_source_kind,
      coalesce(nullif(trim(coalesce(p_label,'')), ''), p_provider),
      nullif(trim(coalesce(p_external_account_key,'')), '')
    );
  else
    v_source := v_existing_source;
  end if;

  insert into pt650.health_connections(
    user_id, provider, source_id, connection_mode, external_account_key,
    label, status, scopes, permission_state, updated_at
  ) values (
    p_user_id, p_provider, v_source, v_mode,
    nullif(trim(coalesce(p_external_account_key,'')), ''),
    nullif(trim(coalesce(p_label,'')), ''),
    v_effective_status, coalesce(p_scopes,'{}'), coalesce(p_permission_state,'{}'::jsonb), now()
  )
  on conflict (
    user_id, provider, connection_mode, (coalesce(external_account_key, ''))
  ) do update
  set source_id = coalesce(excluded.source_id, pt650.health_connections.source_id),
      label = coalesce(excluded.label, pt650.health_connections.label),
      status = excluded.status,
      scopes = excluded.scopes,
      permission_state = excluded.permission_state,
      updated_at = now()
  returning * into v_connection;

  return query
  select v_connection.id, v_connection.source_id, v_connection.status,
         v_connection.provider, v_connection.connection_mode;
end;
$pt650$;

create or replace function public.pt650_wearable_ingest_native_batch(
  p_user_id uuid,
  p_provider text,
  p_permission_state jsonb,
  p_cursor_key text,
  p_cursor jsonb,
  p_high_watermark timestamptz,
  p_observations jsonb,
  p_activities jsonb,
  p_deletions jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pt650
as $pt650$
declare
  v_connection_id uuid;
  v_source_id uuid;
  v_status text;
  v_item jsonb;
  v_observation_id uuid;
  v_activity_id uuid;
  v_duplicate boolean;
  v_observations integer;
  v_activities integer;
  v_deletions integer;
  v_ingested_observations integer := 0;
  v_ingested_activities integer := 0;
  v_deleted integer := 0;
  v_target uuid;
  v_kind text;
  v_external text;
  v_fingerprint text;
  v_scope text;
  v_quality numeric;
begin
  if p_user_id is null then raise exception 'user required'; end if;
  if p_provider is null or not exists (
    select 1
    from pt650.health_adapter_registry r
    where r.provider = p_provider
      and r.transport = 'native_bridge'
      and r.auth_strategy = 'native_permission'
      and r.status = 'active'
  ) then raise exception 'native adapter unavailable'; end if;

  if p_cursor_key !~ '^[a-z][a-z0-9_.:-]{0,79}$' then raise exception 'invalid cursor key'; end if;
  if p_cursor is null or jsonb_typeof(p_cursor) <> 'object' then raise exception 'cursor must be an object'; end if;
  if p_permission_state is null or jsonb_typeof(p_permission_state) <> 'object' then
    raise exception 'permission state must be an object';
  end if;
  if p_observations is null or jsonb_typeof(p_observations) <> 'array' then raise exception 'observations must be an array'; end if;
  if p_activities is null or jsonb_typeof(p_activities) <> 'array' then raise exception 'activities must be an array'; end if;
  if p_deletions is null or jsonb_typeof(p_deletions) <> 'array' then raise exception 'deletions must be an array'; end if;

  v_observations := jsonb_array_length(p_observations);
  v_activities := jsonb_array_length(p_activities);
  v_deletions := jsonb_array_length(p_deletions);

  if v_observations > 1000 or v_activities > 250 or v_deletions > 1000
     or v_observations + v_activities + v_deletions > 1500 then
    raise exception 'native batch too large';
  end if;

  select x.connection_id, x.source_id, x.status
  into v_connection_id, v_source_id, v_status
  from public.pt650_wearable_upsert_connection(
    p_user_id, p_provider, null, p_provider,
    case when v_observations + v_activities > 0 then 'active' else 'pending' end,
    array['read'], p_permission_state
  ) x
  limit 1;

  if v_source_id is null then
    select s.id into v_source_id
    from pt650.health_sources s
    where s.user_id = p_user_id
      and s.provider = p_provider
      and s.source_kind = 'wearable'
      and s.external_account_key is null
    order by s.created_at
    limit 1;
  end if;

  for v_item in select value from jsonb_array_elements(p_observations)
  loop
    select x.observation_id, x.duplicate
    into v_observation_id, v_duplicate
    from public.pt650_health_ingest_observation(
      p_user_id,
      p_provider,
      'wearable',
      v_item->>'externalKey',
      v_item->>'metric',
      nullif(v_item->>'valueNum','')::numeric,
      v_item->'valueJson',
      v_item->>'unit',
      (v_item->>'startedAt')::timestamptz,
      nullif(v_item->>'endedAt','')::timestamptz,
      coalesce(nullif(v_item->>'aggregation',''), 'sample'),
      'source_attested',
      coalesce(nullif(v_item->>'confidence','')::numeric, 0.95),
      coalesce(v_item->'metadata','{}'::jsonb) ||
        jsonb_build_object('nativeProvider', p_provider)
    ) x
    limit 1;

    if not v_duplicate then v_ingested_observations := v_ingested_observations + 1; end if;

    v_fingerprint := nullif(v_item->>'dedupeFingerprint','');
    if v_fingerprint is not null then
      v_scope := coalesce(nullif(v_item->>'scopeKey',''), 'metric:' || (v_item->>'metric'));
      v_quality := coalesce(nullif(v_item->>'quality','')::numeric, 0.95);
      perform public.pt650_health_claim_dedupe(
        p_user_id, v_source_id, 'observation', v_observation_id,
        v_fingerprint, v_scope, v_quality
      );
    end if;
  end loop;

  for v_item in select value from jsonb_array_elements(p_activities)
  loop
    select x.activity_id, x.duplicate
    into v_activity_id, v_duplicate
    from public.pt650_endurance_ingest_activity(
      p_user_id,
      p_provider,
      'wearable',
      v_item->>'externalKey',
      v_item - 'externalKey'
    ) x
    limit 1;

    if not v_duplicate then v_ingested_activities := v_ingested_activities + 1; end if;

    v_fingerprint := nullif(v_item->>'dedupeFingerprint','');
    if v_fingerprint is not null then
      v_scope := coalesce(nullif(v_item->>'scopeKey',''), 'activity:' || coalesce(v_item->>'activityType','other'));
      v_quality := coalesce(nullif(v_item->>'quality','')::numeric, 0.95);
      perform public.pt650_health_claim_dedupe(
        p_user_id, v_source_id, 'activity', v_activity_id,
        v_fingerprint, v_scope, v_quality
      );
    end if;
  end loop;

  if v_source_id is not null then
    for v_item in select value from jsonb_array_elements(p_deletions)
    loop
      v_kind := v_item->>'objectKind';
      v_external := v_item->>'externalKey';
      if v_kind not in ('observation','activity') or v_external is null or length(v_external) > 256 then
        raise exception 'invalid native deletion';
      end if;

      select k.target_id into v_target
      from pt650.health_import_keys k
      where k.user_id = p_user_id
        and k.source_id = v_source_id
        and k.object_kind = v_kind
        and k.external_key = v_external;

      if v_target is not null then
        if v_kind = 'observation' then
          update pt650.health_observations
          set verification = 'rejected',
              metadata = metadata || jsonb_build_object('providerDeletedAt', now(), 'nativeProvider', p_provider)
          where id = v_target and user_id = p_user_id;
        else
          update pt650.endurance_activities
          set verification = 'rejected',
              metadata = metadata || jsonb_build_object('providerDeletedAt', now(), 'nativeProvider', p_provider),
              updated_at = now()
          where id = v_target and user_id = p_user_id;
        end if;
        v_deleted := v_deleted + 1;
      end if;
      v_target := null;
    end loop;
  end if;

  -- Cursor is deliberately last. Any earlier failure rolls back both ingest and progress.
  perform public.pt650_wearable_commit_cursor(
    p_user_id, v_connection_id, p_cursor_key, p_cursor, p_high_watermark
  );

  select c.status into v_status
  from pt650.health_connections c
  where c.id = v_connection_id;

  return jsonb_build_object(
    'connectionId', v_connection_id,
    'status', v_status,
    'received', jsonb_build_object(
      'observations', v_observations,
      'activities', v_activities,
      'deletions', v_deletions
    ),
    'inserted', jsonb_build_object(
      'observations', v_ingested_observations,
      'activities', v_ingested_activities
    ),
    'providerDeletionsApplied', v_deleted,
    'cursorCommitted', true
  );
end;
$pt650$;

revoke all on function public.pt650_wearable_upsert_connection(uuid,text,text,text,text,text[],jsonb)
  from public, anon, authenticated;
revoke all on function public.pt650_wearable_ingest_native_batch(
  uuid,text,jsonb,text,jsonb,timestamptz,jsonb,jsonb,jsonb
) from public, anon, authenticated;

grant execute on function public.pt650_wearable_upsert_connection(uuid,text,text,text,text,text[],jsonb)
  to service_role;
grant execute on function public.pt650_wearable_ingest_native_batch(
  uuid,text,jsonb,text,jsonb,timestamptz,jsonb,jsonb,jsonb
) to service_role;
