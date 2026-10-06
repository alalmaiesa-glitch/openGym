-- PT650 Health Core V1 — backfill canonical health metrics from an existing workout cloud state.
create or replace function public.pt650_health_reindex_workout(
  p_user_id uuid
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, pt650
as $pt650$
declare
  v_state jsonb;
  v_unit text;
  v_entries jsonb;
begin
  select t.state into v_state
  from pt650.training_states t
  where t.user_id = p_user_id;

  if not found or v_state is null then
    return 0;
  end if;

  v_unit := case when v_state->>'unit' = 'lb' then 'lb' else 'kg' end;
  v_entries := coalesce(v_state->'bodyweight', '[]'::jsonb);

  if jsonb_typeof(v_entries) <> 'array' then
    return 0;
  end if;

  return public.pt650_health_ingest_bodyweight_batch(
    p_user_id,
    v_unit,
    v_entries
  );
end;
$pt650$;

revoke all on function public.pt650_health_reindex_workout(uuid)
  from public, anon, authenticated;
grant execute on function public.pt650_health_reindex_workout(uuid)
  to service_role;
