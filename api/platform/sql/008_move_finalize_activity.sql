-- PT650 Move V1 — trusted activity finalization bridge
-- Called only by the server after it has validated raw GPS evidence.

create or replace function public.pt650_finalize_activity(
  p_received_at timestamptz,
  p_event_id uuid,
  p_verification_status text,
  p_risk_status text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pt650
as $$
declare
  v_marked boolean;
  v_results jsonb := '[]'::jsonb;
begin
  v_marked := pt650.mark_activity_verification(
    p_received_at,
    p_event_id,
    p_verification_status,
    p_risk_status
  );

  if p_verification_status = 'verified' and p_risk_status = 'clear' then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'enrollmentId', x.enrollment_id,
          'delta', x.delta,
          'progress', x.progress,
          'settlement', x.settlement
        )
      ),
      '[]'::jsonb
    )
    into v_results
    from pt650.apply_verified_activity(p_received_at, p_event_id) x;
  end if;

  -- If this request has synchronously completed the work, retire the matching async jobs.
  -- A later worker retry remains harmless because event/progress/reward operations are idempotent.
  update pt650.outbox
  set completed_at = coalesce(completed_at, now()),
      locked_at = null,
      locked_by = null,
      last_error = null
  where dedupe_key in (
    'activity.verify:' || p_event_id::text,
    'activity.verified:' || p_event_id::text
  );

  return jsonb_build_object(
    'marked', v_marked,
    'verification', p_verification_status,
    'risk', p_risk_status,
    'applications', v_results
  );
end;
$$;

revoke all on function public.pt650_finalize_activity(
  timestamptz, uuid, text, text
) from public, anon, authenticated;

grant execute on function public.pt650_finalize_activity(
  timestamptz, uuid, text, text
) to service_role;

comment on function public.pt650_finalize_activity is
  'Server-only synchronous finalization for already-verified PT650 activity.';
