-- PT650 Platform V4 — durable per-user API throttling for Edge Functions.
-- One row per user/route keeps the hot path compact and avoids an ever-growing request log.

create table if not exists pt650.api_rate_buckets (
  user_id text not null,
  route text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, route)
);

alter table pt650.api_rate_buckets enable row level security;
revoke all on table pt650.api_rate_buckets from public, anon, authenticated;
grant all on table pt650.api_rate_buckets to service_role;

create or replace function pt650.consume_api_rate_limit(
  p_user_id text,
  p_route text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  remaining integer,
  retry_after integer
)
language plpgsql
security definer
set search_path = pg_catalog, pt650
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_count integer;
  v_started timestamptz;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then
    raise exception 'user required';
  end if;
  if p_route is null or length(trim(p_route)) = 0 or length(p_route) > 80 then
    raise exception 'route required';
  end if;
  if p_limit < 1 or p_limit > 10000 or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid rate limit';
  end if;

  insert into pt650.api_rate_buckets(user_id, route, window_started_at, request_count, updated_at)
  values (p_user_id, p_route, v_now, 1, v_now)
  on conflict (user_id, route) do update
  set window_started_at = case
        when pt650.api_rate_buckets.window_started_at + make_interval(secs => p_window_seconds) <= v_now
          then v_now
        else pt650.api_rate_buckets.window_started_at
      end,
      request_count = case
        when pt650.api_rate_buckets.window_started_at + make_interval(secs => p_window_seconds) <= v_now
          then 1
        else pt650.api_rate_buckets.request_count + 1
      end,
      updated_at = v_now
  returning request_count, window_started_at
    into v_count, v_started;

  allowed := v_count <= p_limit;
  remaining := greatest(0, p_limit - v_count);
  retry_after := case
    when allowed then 0
    else greatest(1, ceil(extract(epoch from (v_started + make_interval(secs => p_window_seconds) - v_now)))::integer)
  end;
  return next;
end;
$$;

revoke all on function pt650.consume_api_rate_limit(text,text,integer,integer)
  from public, anon, authenticated;
grant execute on function pt650.consume_api_rate_limit(text,text,integer,integer)
  to service_role;

create or replace function public.pt650_rate_limit(
  p_user_id text,
  p_route text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  remaining integer,
  retry_after integer
)
language sql
security definer
set search_path = pg_catalog, public, pt650
as $$
  select *
  from pt650.consume_api_rate_limit(
    p_user_id,
    p_route,
    p_limit,
    p_window_seconds
  );
$$;

revoke all on function public.pt650_rate_limit(text,text,integer,integer)
  from public, anon, authenticated;
grant execute on function public.pt650_rate_limit(text,text,integer,integer)
  to service_role;
