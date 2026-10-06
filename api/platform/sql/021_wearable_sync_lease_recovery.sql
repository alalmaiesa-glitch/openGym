-- PT650 Wearable Adapter Framework V1 — sync job lease recovery.
alter table pt650.health_sync_jobs
  add column if not exists lease_expires_at timestamptz;

create index if not exists health_sync_jobs_claim_idx
  on pt650.health_sync_jobs (status, not_before, lease_expires_at, created_at)
  where status in ('queued','retry','leased');

create or replace function public.pt650_wearable_claim_sync_jobs(
  p_worker_id text,
  p_limit integer default 10
)
returns table (
  job_id uuid,
  user_id uuid,
  connection_id uuid,
  provider text,
  job_kind text,
  window_start timestamptz,
  window_end timestamptz,
  payload jsonb,
  attempts integer
)
language plpgsql
security definer
set search_path = pg_catalog, public, pt650
as $$
begin
  if p_worker_id is null or length(trim(p_worker_id)) < 1 or length(p_worker_id) > 120 then
    raise exception 'worker id required';
  end if;

  return query
  with picked as (
    select j.id
    from pt650.health_sync_jobs j
    where (
      (j.status in ('queued','retry') and j.not_before <= now())
      or (j.status = 'leased' and j.lease_expires_at is not null and j.lease_expires_at <= now())
    )
      and j.attempts < j.max_attempts
    order by coalesce(j.lease_expires_at, j.not_before), j.created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit,10),100))
  ),
  leased as (
    update pt650.health_sync_jobs j
    set status = 'leased',
        attempts = j.attempts + 1,
        locked_at = now(),
        locked_by = p_worker_id,
        lease_expires_at = now() + interval '5 minutes',
        updated_at = now()
    from picked
    where j.id = picked.id
    returning j.*
  )
  select
    l.id, l.user_id, l.connection_id, l.provider, l.job_kind,
    l.window_start, l.window_end, l.payload, l.attempts
  from leased l;
end;
$$;

create or replace function public.pt650_wearable_finish_sync_job(
  p_job_id uuid,
  p_worker_id text,
  p_success boolean,
  p_error_code text default null,
  p_error text default null,
  p_retry_after_seconds integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, pt650
as $$
declare
  v_job pt650.health_sync_jobs%rowtype;
begin
  select * into v_job
  from pt650.health_sync_jobs
  where id = p_job_id
  for update;

  if not found then return false; end if;
  if v_job.status <> 'leased' or v_job.locked_by is distinct from p_worker_id then
    raise exception 'sync job lease mismatch';
  end if;
  if v_job.lease_expires_at is not null and v_job.lease_expires_at < now() then
    raise exception 'sync job lease expired';
  end if;

  if p_success then
    update pt650.health_sync_jobs
    set status = 'done',
        completed_at = now(),
        locked_at = null,
        locked_by = null,
        lease_expires_at = null,
        last_error_code = null,
        last_error = null,
        updated_at = now()
    where id = p_job_id;

    update pt650.health_connections
    set last_sync_at = now(),
        last_error_code = null,
        last_error_at = null,
        updated_at = now()
    where id = v_job.connection_id;
  else
    update pt650.health_sync_jobs
    set status = case when attempts >= max_attempts then 'dead' else 'retry' end,
        not_before = case when attempts >= max_attempts then not_before
          else now() + make_interval(secs => greatest(5, least(coalesce(p_retry_after_seconds,60),86400))) end,
        locked_at = null,
        locked_by = null,
        lease_expires_at = null,
        last_error_code = left(coalesce(p_error_code,'sync-error'),120),
        last_error = left(coalesce(p_error,'sync failed'),1000),
        updated_at = now()
    where id = p_job_id;

    update pt650.health_connections
    set last_error_code = left(coalesce(p_error_code,'sync-error'),120),
        last_error_at = now(),
        updated_at = now()
    where id = v_job.connection_id;
  end if;

  return true;
end;
$$;

revoke all on function public.pt650_wearable_claim_sync_jobs(text,integer)
  from public, anon, authenticated;
revoke all on function public.pt650_wearable_finish_sync_job(uuid,text,boolean,text,text,integer)
  from public, anon, authenticated;
grant execute on function public.pt650_wearable_claim_sync_jobs(text,integer)
  to service_role;
grant execute on function public.pt650_wearable_finish_sync_job(uuid,text,boolean,text,text,integer)
  to service_role;
