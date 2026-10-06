-- PT650 Health Core V1 — bridge existing workout weigh-ins into canonical health data.
create or replace function public.pt650_health_ingest_bodyweight_batch(
  p_user_id uuid,
  p_unit text,
  p_entries jsonb
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, pt650
as $pt650$
declare
  v_source uuid;
  v_entry jsonb;
  v_id uuid;
  v_target uuid;
  v_external_key text;
  v_weight numeric;
  v_kg numeric;
  v_t bigint;
  v_day date;
  v_started timestamptz;
  v_inserted integer := 0;
  v_max_weight numeric;
begin
  if p_user_id is null then raise exception 'user required'; end if;
  if p_unit not in ('kg','lb') then raise exception 'invalid weight unit'; end if;
  v_max_weight := case when p_unit = 'kg' then 500 else 1100 end;
  if p_entries is null or jsonb_typeof(p_entries) <> 'array' then raise exception 'bodyweight must be an array'; end if;
  if jsonb_array_length(p_entries) > 5000 then raise exception 'too many weigh-ins'; end if;

  v_source := pt650.ensure_health_source(p_user_id, 'pt650_workout', 'first_party', 'PT650 Workout', null);

  for v_entry in
    select e.value
    from jsonb_array_elements(p_entries) as e(value)
  loop
    begin
      v_weight := (v_entry->>'w')::numeric;
      v_day := (v_entry->>'d')::date;
      v_t := coalesce(nullif(v_entry->>'t','')::bigint, 0);
    exception when others then
      continue;
    end;

    if v_weight <= 0 or v_weight > v_max_weight then
      continue;
    end if;

    v_started := case
      when v_t > 0 then to_timestamp(v_t / 1000.0)
      else v_day::timestamptz + interval '12 hours'
    end;
    v_kg := round((case when p_unit='kg' then v_weight else v_weight * 0.45359237 end)::numeric, 3);
    v_external_key := 'bodyweight:' || v_day::text || ':' || v_t::text || ':' || v_weight::text;
    v_id := gen_random_uuid();

    insert into pt650.health_import_keys(user_id, source_id, object_kind, external_key, target_id)
    values (p_user_id, v_source, 'observation', v_external_key, v_id)
    on conflict (user_id, source_id, object_kind, external_key) do nothing
    returning target_id into v_target;

    if not found then
      continue;
    end if;

    insert into pt650.health_observations(
      id, user_id, source_id, metric, value_num, unit, started_at,
      aggregation, verification, confidence, metadata
    ) values (
      v_id, p_user_id, v_source, 'weight_kg', v_kg, 'kg', v_started,
      'sample', 'self_reported', 1,
      jsonb_build_object('origin','pt650_workout','originalUnit',p_unit,'entryDate',v_day)
    );
    v_inserted := v_inserted + 1;
  end loop;

  update pt650.health_sources
  set last_synced_at = now(), updated_at = now()
  where id = v_source;

  update pt650.health_adapter_registry
  set status = 'active',
      capabilities = array['strength_training','body_weight'],
      updated_at = now()
  where provider = 'pt650_workout';

  return v_inserted;
end;
$pt650$;

revoke all on function public.pt650_health_ingest_bodyweight_batch(uuid,text,jsonb)
  from public, anon, authenticated;
grant execute on function public.pt650_health_ingest_bodyweight_batch(uuid,text,jsonb)
  to service_role;
