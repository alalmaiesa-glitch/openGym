-- PT650 Wearable Adapter Framework V1
-- Registry + Vault token references + sync cursors/jobs + cross-source dedupe + user source priority.
-- No provider credential is stored in ordinary PT650 tables. OAuth secrets live only in Supabase Vault.

alter table pt650.health_adapter_registry
  add column if not exists adapter_version integer not null default 1 check (adapter_version >= 1),
  add column if not exists auth_strategy text not null default 'none'
    check (auth_strategy in ('none','native_permission','oauth2','file')),
  add column if not exists sync_strategy text not null default 'push'
    check (sync_strategy in ('push','native_pull','cloud_pull','file_import','manual')),
  add column if not exists default_priority smallint not null default 500
    check (default_priority between 0 and 1000),
  add column if not exists backfill_days integer not null default 0
    check (backfill_days between 0 and 3650),
  add column if not exists requires_native boolean not null default false,
  add column if not exists uses_token_vault boolean not null default false;

update pt650.health_adapter_registry
set
  adapter_version = 1,
  auth_strategy = case provider
    when 'apple_health' then 'native_permission'
    when 'health_connect' then 'native_permission'
    when 'huawei_health' then 'native_permission'
    when 'garmin' then 'oauth2'
    when 'strava' then 'oauth2'
    when 'fit' then 'file'
    when 'gpx' then 'file'
    when 'tcx' then 'file'
    else 'none'
  end,
  sync_strategy = case provider
    when 'apple_health' then 'native_pull'
    when 'health_connect' then 'native_pull'
    when 'huawei_health' then 'native_pull'
    when 'garmin' then 'cloud_pull'
    when 'strava' then 'cloud_pull'
    when 'fit' then 'file_import'
    when 'gpx' then 'file_import'
    when 'tcx' then 'file_import'
    when 'manual' then 'manual'
    else 'push'
  end,
  default_priority = case provider
    when 'pt650_move' then 1000
    when 'pt650_workout' then 950
    when 'apple_health' then 850
    when 'health_connect' then 850
    when 'huawei_health' then 840
    when 'garmin' then 820
    when 'strava' then 760
    when 'fit' then 720
    when 'tcx' then 700
    when 'gpx' then 650
    when 'manual' then 400
    else 500
  end,
  backfill_days = case provider
    when 'garmin' then 365
    when 'strava' then 365
    when 'apple_health' then 90
    when 'health_connect' then 90
    when 'huawei_health' then 90
    when 'fit' then 3650
    when 'gpx' then 3650
    when 'tcx' then 3650
    else 0
  end,
  requires_native = provider in ('apple_health','health_connect','huawei_health'),
  uses_token_vault = provider in ('garmin','strava'),
  updated_at = now();

create table if not exists pt650.health_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null references pt650.health_adapter_registry(provider),
  source_id uuid references pt650.health_sources(id) on delete set null,
  connection_mode text not null
    check (connection_mode in ('first_party','native','oauth','file','manual')),
  external_account_key text,
  label text,
  status text not null default 'pending'
    check (status in ('pending','active','paused','revoked','error')),
  scopes text[] not null default '{}',
  permission_state jsonb not null default '{}'::jsonb,
  priority_override smallint check (priority_override is null or priority_override between 0 and 1000),
  token_expires_at timestamptz,
  last_sync_at timestamptz,
  next_sync_at timestamptz,
  last_error_code text,
  last_error_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists health_connections_identity_uidx
  on pt650.health_connections (
    user_id, provider, connection_mode, coalesce(external_account_key, '')
  );

create index if not exists health_connections_user_idx
  on pt650.health_connections (user_id, status, provider);

create index if not exists health_connections_source_idx
  on pt650.health_connections (source_id)
  where source_id is not null;

create table if not exists pt650.health_connection_token_refs (
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null references pt650.health_connections(id) on delete cascade,
  token_kind text not null check (token_kind in ('access','refresh','id_token','webhook_secret')),
  secret_id uuid not null unique,
  expires_at timestamptz,
  rotated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (connection_id, token_kind)
);

create index if not exists health_connection_token_refs_user_idx
  on pt650.health_connection_token_refs (user_id, connection_id);

create table if not exists pt650.health_sync_cursors (
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null references pt650.health_connections(id) on delete cascade,
  cursor_key text not null,
  cursor jsonb not null default '{}'::jsonb,
  high_watermark timestamptz,
  last_success_at timestamptz,
  consecutive_failures integer not null default 0 check (consecutive_failures >= 0),
  retry_after timestamptz,
  updated_at timestamptz not null default now(),
  primary key (connection_id, cursor_key),
  check (cursor_key ~ '^[a-z][a-z0-9_.:-]{0,79}$')
);

create index if not exists health_sync_cursors_user_idx
  on pt650.health_sync_cursors (user_id, connection_id);

create table if not exists pt650.health_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null references pt650.health_connections(id) on delete cascade,
  provider text not null references pt650.health_adapter_registry(provider),
  job_kind text not null
    check (job_kind in ('incremental','backfill','webhook','manual','reconcile')),
  status text not null default 'queued'
    check (status in ('queued','leased','retry','done','dead')),
  dedupe_key text not null,
  window_start timestamptz,
  window_end timestamptz,
  payload jsonb not null default '{}'::jsonb,
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 8 check (max_attempts between 1 and 32),
  not_before timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error_code text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  check (length(dedupe_key) between 1 and 180),
  check (window_end is null or window_start is null or window_end >= window_start)
);

create unique index if not exists health_sync_jobs_dedupe_uidx
  on pt650.health_sync_jobs (connection_id, dedupe_key);

create index if not exists health_sync_jobs_ready_idx
  on pt650.health_sync_jobs (not_before, created_at)
  where status in ('queued','retry');

create index if not exists health_sync_jobs_user_idx
  on pt650.health_sync_jobs (user_id, connection_id, status);

create table if not exists pt650.health_source_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null references pt650.health_adapter_registry(provider),
  scope_key text not null default '*',
  priority smallint not null check (priority between 0 and 1000),
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, provider, scope_key),
  check (scope_key ~ '^[a-z*][a-z0-9_*.:+-]{0,79}$')
);

create index if not exists health_source_preferences_user_idx
  on pt650.health_source_preferences (user_id, scope_key, priority desc);

create table if not exists pt650.health_dedupe_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  object_kind text not null check (object_kind in ('observation','activity')),
  fingerprint char(64) not null check (fingerprint ~ '^[a-f0-9]{64}$'),
  scope_key text not null,
  primary_target_id uuid not null,
  primary_source_id uuid not null references pt650.health_sources(id) on delete cascade,
  primary_provider text not null references pt650.health_adapter_registry(provider),
  primary_priority smallint not null check (primary_priority between 0 and 1000),
  primary_quality numeric(5,4) not null check (primary_quality between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, object_kind, fingerprint)
);

create index if not exists health_dedupe_groups_primary_source_idx
  on pt650.health_dedupe_groups (primary_source_id);

create table if not exists pt650.health_dedupe_members (
  group_id uuid not null references pt650.health_dedupe_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  object_kind text not null check (object_kind in ('observation','activity')),
  source_id uuid not null references pt650.health_sources(id) on delete cascade,
  provider text not null references pt650.health_adapter_registry(provider),
  target_id uuid not null,
  effective_priority smallint not null check (effective_priority between 0 and 1000),
  quality numeric(5,4) not null check (quality between 0 and 1),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (group_id, target_id)
);

create index if not exists health_dedupe_members_target_idx
  on pt650.health_dedupe_members (object_kind, target_id);

create index if not exists health_dedupe_members_source_idx
  on pt650.health_dedupe_members (source_id, is_primary);

create or replace function pt650.health_connection_mode(p_transport text)
returns text
language sql
immutable
as $$
  select case p_transport
    when 'first_party' then 'first_party'
    when 'native_bridge' then 'native'
    when 'oauth' then 'oauth'
    when 'file_import' then 'file'
    when 'manual' then 'manual'
    else 'manual'
  end
$$;

create or replace function public.pt650_health_effective_priority(
  p_user_id uuid,
  p_provider text,
  p_scope_key text default '*'
)
returns integer
language plpgsql
security definer
stable
set search_path = pg_catalog, public, pt650
as $$
declare
  v_default integer;
  v_priority integer;
  v_enabled boolean;
begin
  select r.default_priority
  into v_default
  from pt650.health_adapter_registry r
  where r.provider = p_provider;

  if not found then raise exception 'unknown health provider'; end if;

  select p.priority, p.enabled
  into v_priority, v_enabled
  from pt650.health_source_preferences p
  where p.user_id = p_user_id
    and p.provider = p_provider
    and p.scope_key in (coalesce(nullif(p_scope_key,''),'*'), '*')
  order by case when p.scope_key = coalesce(nullif(p_scope_key,''),'*') then 0 else 1 end
  limit 1;

  if found then
    return case when v_enabled then v_priority else 0 end;
  end if;

  return v_default;
end;
$$;

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
as $$
declare
  v_transport text;
  v_mode text;
  v_source_kind text;
  v_source uuid;
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

  v_source := pt650.ensure_health_source(
    p_user_id,
    p_provider,
    v_source_kind,
    coalesce(nullif(trim(coalesce(p_label,'')), ''), p_provider),
    nullif(trim(coalesce(p_external_account_key,'')), '')
  );

  insert into pt650.health_connections(
    user_id, provider, source_id, connection_mode, external_account_key,
    label, status, scopes, permission_state, updated_at
  ) values (
    p_user_id, p_provider, v_source, v_mode,
    nullif(trim(coalesce(p_external_account_key,'')), ''),
    nullif(trim(coalesce(p_label,'')), ''),
    p_status, coalesce(p_scopes,'{}'), coalesce(p_permission_state,'{}'::jsonb), now()
  )
  on conflict (
    user_id, provider, connection_mode, (coalesce(external_account_key, ''))
  ) do update
  set source_id = excluded.source_id,
      label = coalesce(excluded.label, pt650.health_connections.label),
      status = excluded.status,
      scopes = excluded.scopes,
      permission_state = excluded.permission_state,
      updated_at = now()
  returning * into v_connection;

  return query
  select v_connection.id, v_source, v_connection.status, v_connection.provider, v_connection.connection_mode;
end;
$$;

create or replace function public.pt650_wearable_connections(p_user_id uuid)
returns table (
  connection_id uuid,
  provider text,
  display_name text,
  connection_mode text,
  status text,
  scopes text[],
  priority integer,
  permission_state jsonb,
  token_expires_at timestamptz,
  last_sync_at timestamptz,
  next_sync_at timestamptz,
  last_error_code text,
  requires_native boolean,
  uses_token_vault boolean,
  sync_strategy text,
  backfill_days integer
)
language sql
security definer
stable
set search_path = pg_catalog, public, pt650
as $$
  select
    c.id,
    c.provider,
    r.display_name,
    c.connection_mode,
    c.status,
    c.scopes,
    coalesce(c.priority_override, public.pt650_health_effective_priority(c.user_id, c.provider, '*')),
    c.permission_state,
    c.token_expires_at,
    c.last_sync_at,
    c.next_sync_at,
    c.last_error_code,
    r.requires_native,
    r.uses_token_vault,
    r.sync_strategy,
    r.backfill_days
  from pt650.health_connections c
  join pt650.health_adapter_registry r on r.provider = c.provider
  where c.user_id = p_user_id
  order by r.default_priority desc, c.created_at;
$$;

create or replace function public.pt650_wearable_set_priority(
  p_user_id uuid,
  p_provider text,
  p_scope_key text,
  p_priority integer,
  p_enabled boolean default true
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, pt650
as $$
declare
  v_scope text := coalesce(nullif(trim(coalesce(p_scope_key,'')), ''), '*');
begin
  if p_priority < 0 or p_priority > 1000 then raise exception 'invalid priority'; end if;
  if v_scope !~ '^[a-z*][a-z0-9_*.:+-]{0,79}$' then raise exception 'invalid scope'; end if;
  if not exists (select 1 from pt650.health_adapter_registry r where r.provider = p_provider) then
    raise exception 'unknown health provider';
  end if;

  insert into pt650.health_source_preferences(user_id, provider, scope_key, priority, enabled, updated_at)
  values (p_user_id, p_provider, v_scope, p_priority, coalesce(p_enabled,true), now())
  on conflict (user_id, provider, scope_key) do update
  set priority = excluded.priority,
      enabled = excluded.enabled,
      updated_at = now();

  return p_priority;
end;
$$;

create or replace function public.pt650_wearable_store_token(
  p_user_id uuid,
  p_connection_id uuid,
  p_token_kind text,
  p_secret text,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, pt650, vault
as $$
declare
  v_secret_id uuid;
  v_name text;
begin
  if p_token_kind not in ('access','refresh','id_token','webhook_secret') then
    raise exception 'invalid token kind';
  end if;
  if p_secret is null or length(p_secret) < 1 or length(p_secret) > 20000 then
    raise exception 'invalid secret';
  end if;
  if not exists (
    select 1 from pt650.health_connections c
    where c.id = p_connection_id and c.user_id = p_user_id
  ) then raise exception 'connection not found'; end if;

  v_name := 'pt650-wearable-' || p_connection_id::text || '-' || p_token_kind;

  select t.secret_id into v_secret_id
  from pt650.health_connection_token_refs t
  where t.connection_id = p_connection_id
    and t.token_kind = p_token_kind
  for update;

  if found then
    perform vault.update_secret(
      v_secret_id, p_secret, v_name,
      'PT650 wearable connector secret', null
    );
  else
    v_secret_id := vault.create_secret(
      p_secret, v_name, 'PT650 wearable connector secret', null
    );

    insert into pt650.health_connection_token_refs(
      user_id, connection_id, token_kind, secret_id, expires_at, rotated_at
    ) values (
      p_user_id, p_connection_id, p_token_kind, v_secret_id, p_expires_at, now()
    );
  end if;

  update pt650.health_connection_token_refs
  set expires_at = p_expires_at,
      rotated_at = now()
  where connection_id = p_connection_id
    and token_kind = p_token_kind;

  if p_token_kind = 'access' then
    update pt650.health_connections
    set token_expires_at = p_expires_at, updated_at = now()
    where id = p_connection_id and user_id = p_user_id;
  end if;

  return v_secret_id;
end;
$$;

create or replace function public.pt650_wearable_get_token(
  p_user_id uuid,
  p_connection_id uuid,
  p_token_kind text
)
returns text
language plpgsql
security definer
stable
set search_path = pg_catalog, public, pt650, vault
as $$
declare
  v_secret_id uuid;
  v_secret text;
begin
  if not exists (
    select 1 from pt650.health_connections c
    where c.id = p_connection_id and c.user_id = p_user_id
  ) then raise exception 'connection not found'; end if;

  select t.secret_id into v_secret_id
  from pt650.health_connection_token_refs t
  where t.connection_id = p_connection_id
    and t.token_kind = p_token_kind;

  if v_secret_id is null then return null; end if;

  select d.decrypted_secret into v_secret
  from vault.decrypted_secrets d
  where d.id = v_secret_id;

  return v_secret;
end;
$$;

create or replace function public.pt650_wearable_revoke_tokens(
  p_user_id uuid,
  p_connection_id uuid
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, pt650, vault
as $$
declare
  v_count integer;
begin
  if not exists (
    select 1 from pt650.health_connections c
    where c.id = p_connection_id and c.user_id = p_user_id
  ) then raise exception 'connection not found'; end if;

  delete from vault.secrets s
  using pt650.health_connection_token_refs t
  where t.connection_id = p_connection_id
    and t.user_id = p_user_id
    and s.id = t.secret_id;

  get diagnostics v_count = row_count;

  delete from pt650.health_connection_token_refs
  where connection_id = p_connection_id and user_id = p_user_id;

  update pt650.health_connections
  set token_expires_at = null, updated_at = now()
  where id = p_connection_id and user_id = p_user_id;

  return v_count;
end;
$$;

create or replace function public.pt650_wearable_commit_cursor(
  p_user_id uuid,
  p_connection_id uuid,
  p_cursor_key text,
  p_cursor jsonb,
  p_high_watermark timestamptz default null
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, pt650
as $$
begin
  if not exists (
    select 1 from pt650.health_connections c
    where c.id = p_connection_id and c.user_id = p_user_id
  ) then raise exception 'connection not found'; end if;
  if p_cursor_key !~ '^[a-z][a-z0-9_.:-]{0,79}$' then raise exception 'invalid cursor key'; end if;

  insert into pt650.health_sync_cursors(
    user_id, connection_id, cursor_key, cursor, high_watermark,
    last_success_at, consecutive_failures, retry_after, updated_at
  ) values (
    p_user_id, p_connection_id, p_cursor_key, coalesce(p_cursor,'{}'::jsonb),
    p_high_watermark, now(), 0, null, now()
  )
  on conflict (connection_id, cursor_key) do update
  set cursor = excluded.cursor,
      high_watermark = excluded.high_watermark,
      last_success_at = now(),
      consecutive_failures = 0,
      retry_after = null,
      updated_at = now();

  update pt650.health_connections
  set last_sync_at = now(), last_error_code = null, updated_at = now()
  where id = p_connection_id and user_id = p_user_id;

  return true;
end;
$$;

create or replace function public.pt650_wearable_enqueue_sync(
  p_user_id uuid,
  p_connection_id uuid,
  p_job_kind text,
  p_dedupe_key text,
  p_window_start timestamptz default null,
  p_window_end timestamptz default null,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, pt650
as $$
declare
  v_provider text;
  v_id uuid;
begin
  select c.provider into v_provider
  from pt650.health_connections c
  where c.id = p_connection_id and c.user_id = p_user_id;

  if not found then raise exception 'connection not found'; end if;
  if p_job_kind not in ('incremental','backfill','webhook','manual','reconcile') then
    raise exception 'invalid sync job kind';
  end if;
  if p_dedupe_key is null or length(p_dedupe_key) < 1 or length(p_dedupe_key) > 180 then
    raise exception 'invalid dedupe key';
  end if;

  insert into pt650.health_sync_jobs(
    user_id, connection_id, provider, job_kind, dedupe_key,
    window_start, window_end, payload
  ) values (
    p_user_id, p_connection_id, v_provider, p_job_kind, p_dedupe_key,
    p_window_start, p_window_end, coalesce(p_payload,'{}'::jsonb)
  )
  on conflict (connection_id, dedupe_key) do update
  set not_before = least(pt650.health_sync_jobs.not_before, now()),
      updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

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
    where j.status in ('queued','retry')
      and j.not_before <= now()
      and j.attempts < j.max_attempts
    order by j.not_before, j.created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit,10),100))
  ),
  leased as (
    update pt650.health_sync_jobs j
    set status = 'leased',
        attempts = j.attempts + 1,
        locked_at = now(),
        locked_by = p_worker_id,
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

  if p_success then
    update pt650.health_sync_jobs
    set status = 'done',
        completed_at = now(),
        locked_at = null,
        locked_by = null,
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

create or replace function public.pt650_health_claim_dedupe(
  p_user_id uuid,
  p_source_id uuid,
  p_object_kind text,
  p_target_id uuid,
  p_fingerprint text,
  p_scope_key text,
  p_quality numeric
)
returns table (
  group_id uuid,
  is_primary boolean,
  primary_target_id uuid,
  primary_provider text,
  effective_priority integer
)
language plpgsql
security definer
set search_path = pg_catalog, public, pt650
as $$
declare
  v_provider text;
  v_priority integer;
  v_group pt650.health_dedupe_groups%rowtype;
  v_wins boolean := false;
  v_scope text := coalesce(nullif(trim(coalesce(p_scope_key,'')), ''), p_object_kind);
begin
  if p_object_kind not in ('observation','activity') then raise exception 'invalid object kind'; end if;
  if p_fingerprint !~ '^[a-f0-9]{64}$' then raise exception 'invalid fingerprint'; end if;
  if p_quality < 0 or p_quality > 1 then raise exception 'invalid quality'; end if;

  select s.provider into v_provider
  from pt650.health_sources s
  where s.id = p_source_id and s.user_id = p_user_id;

  if not found then raise exception 'health source not found'; end if;

  v_priority := public.pt650_health_effective_priority(p_user_id, v_provider, v_scope);

  insert into pt650.health_dedupe_groups(
    user_id, object_kind, fingerprint, scope_key,
    primary_target_id, primary_source_id, primary_provider,
    primary_priority, primary_quality
  ) values (
    p_user_id, p_object_kind, p_fingerprint, v_scope,
    p_target_id, p_source_id, v_provider, v_priority, p_quality
  )
  on conflict (user_id, object_kind, fingerprint) do nothing;

  select * into v_group
  from pt650.health_dedupe_groups g
  where g.user_id = p_user_id
    and g.object_kind = p_object_kind
    and g.fingerprint = p_fingerprint
  for update;

  if not found then raise exception 'dedupe group unavailable'; end if;

  if v_group.primary_target_id = p_target_id then
    v_wins := true;
  elsif v_priority > v_group.primary_priority
     or (v_priority = v_group.primary_priority and p_quality > v_group.primary_quality) then
    v_wins := true;

    update pt650.health_dedupe_members
    set is_primary = false
    where group_id = v_group.id;

    update pt650.health_dedupe_groups
    set primary_target_id = p_target_id,
        primary_source_id = p_source_id,
        primary_provider = v_provider,
        primary_priority = v_priority,
        primary_quality = p_quality,
        scope_key = v_scope,
        updated_at = now()
    where id = v_group.id;

    v_group.primary_target_id := p_target_id;
    v_group.primary_provider := v_provider;
    v_group.primary_priority := v_priority;
  end if;

  insert into pt650.health_dedupe_members(
    group_id, user_id, object_kind, source_id, provider, target_id,
    effective_priority, quality, is_primary
  ) values (
    v_group.id, p_user_id, p_object_kind, p_source_id, v_provider, p_target_id,
    v_priority, p_quality, v_wins
  )
  on conflict (group_id, target_id) do update
  set source_id = excluded.source_id,
      provider = excluded.provider,
      effective_priority = excluded.effective_priority,
      quality = excluded.quality,
      is_primary = excluded.is_primary;

  if v_wins then
    update pt650.health_dedupe_members
    set is_primary = (target_id = p_target_id)
    where group_id = v_group.id;
  end if;

  return query
  select v_group.id, v_wins, v_group.primary_target_id, v_group.primary_provider, v_priority;
end;
$$;

-- Dedupe groups never delete source records. Read models hide non-primary candidates only.
create or replace function public.pt650_health_summary(p_user_id uuid)
returns jsonb
language sql
security definer
stable
set search_path = pg_catalog, public, pt650
as $$
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
          and not exists (
            select 1
            from pt650.health_dedupe_members m
            where m.user_id = p_user_id
              and m.object_kind = 'observation'
              and m.target_id = o.id
              and m.is_primary = false
          )
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
          and not exists (
            select 1 from pt650.health_dedupe_members m
            where m.user_id = p_user_id and m.object_kind='activity'
              and m.target_id=a.id and m.is_primary=false
          )
      ),
      'distanceM', coalesce((
        select sum(a.distance_m)
        from pt650.endurance_activities a
        where a.user_id = p_user_id
          and a.started_at >= now() - interval '30 days'
          and a.verification <> 'rejected'
          and not exists (
            select 1 from pt650.health_dedupe_members m
            where m.user_id = p_user_id and m.object_kind='activity'
              and m.target_id=a.id and m.is_primary=false
          )
      ), 0),
      'durationSec', coalesce((
        select sum(a.duration_sec)
        from pt650.endurance_activities a
        where a.user_id = p_user_id
          and a.started_at >= now() - interval '30 days'
          and a.verification <> 'rejected'
          and not exists (
            select 1 from pt650.health_dedupe_members m
            where m.user_id = p_user_id and m.object_kind='activity'
              and m.target_id=a.id and m.is_primary=false
          )
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
$$;

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
as $$
  select
    a.id, a.activity_type, a.title, a.started_at, a.duration_sec,
    a.distance_m, a.verification, a.confidence, s.provider
  from pt650.endurance_activities a
  join pt650.health_sources s on s.id = a.source_id
  where a.user_id = p_user_id
    and a.verification <> 'rejected'
    and not exists (
      select 1 from pt650.health_dedupe_members m
      where m.user_id = p_user_id
        and m.object_kind = 'activity'
        and m.target_id = a.id
        and m.is_primary = false
    )
  order by a.started_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;

-- New framework tables are server-only.
do $$
declare
  r record;
begin
  for r in
    select c.oid::regclass as rel
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'pt650'
      and c.relname in (
        'health_connections','health_connection_token_refs','health_sync_cursors',
        'health_sync_jobs','health_source_preferences','health_dedupe_groups',
        'health_dedupe_members'
      )
  loop
    execute format('alter table %s enable row level security', r.rel);
    execute format('revoke all on table %s from public, anon, authenticated', r.rel);
    execute format('grant all on table %s to service_role', r.rel);
  end loop;
end;
$$;

revoke all on function public.pt650_health_effective_priority(uuid,text,text)
  from public, anon, authenticated;
revoke all on function public.pt650_wearable_upsert_connection(uuid,text,text,text,text,text[],jsonb)
  from public, anon, authenticated;
revoke all on function public.pt650_wearable_connections(uuid)
  from public, anon, authenticated;
revoke all on function public.pt650_wearable_set_priority(uuid,text,text,integer,boolean)
  from public, anon, authenticated;
revoke all on function public.pt650_wearable_store_token(uuid,uuid,text,text,timestamptz)
  from public, anon, authenticated;
revoke all on function public.pt650_wearable_get_token(uuid,uuid,text)
  from public, anon, authenticated;
revoke all on function public.pt650_wearable_revoke_tokens(uuid,uuid)
  from public, anon, authenticated;
revoke all on function public.pt650_wearable_commit_cursor(uuid,uuid,text,jsonb,timestamptz)
  from public, anon, authenticated;
revoke all on function public.pt650_wearable_enqueue_sync(uuid,uuid,text,text,timestamptz,timestamptz,jsonb)
  from public, anon, authenticated;
revoke all on function public.pt650_wearable_claim_sync_jobs(text,integer)
  from public, anon, authenticated;
revoke all on function public.pt650_wearable_finish_sync_job(uuid,text,boolean,text,text,integer)
  from public, anon, authenticated;
revoke all on function public.pt650_health_claim_dedupe(uuid,uuid,text,uuid,text,text,numeric)
  from public, anon, authenticated;

grant execute on function public.pt650_health_effective_priority(uuid,text,text)
  to service_role;
grant execute on function public.pt650_wearable_upsert_connection(uuid,text,text,text,text,text[],jsonb)
  to service_role;
grant execute on function public.pt650_wearable_connections(uuid)
  to service_role;
grant execute on function public.pt650_wearable_set_priority(uuid,text,text,integer,boolean)
  to service_role;
grant execute on function public.pt650_wearable_store_token(uuid,uuid,text,text,timestamptz)
  to service_role;
grant execute on function public.pt650_wearable_get_token(uuid,uuid,text)
  to service_role;
grant execute on function public.pt650_wearable_revoke_tokens(uuid,uuid)
  to service_role;
grant execute on function public.pt650_wearable_commit_cursor(uuid,uuid,text,jsonb,timestamptz)
  to service_role;
grant execute on function public.pt650_wearable_enqueue_sync(uuid,uuid,text,text,timestamptz,timestamptz,jsonb)
  to service_role;
grant execute on function public.pt650_wearable_claim_sync_jobs(text,integer)
  to service_role;
grant execute on function public.pt650_wearable_finish_sync_job(uuid,text,boolean,text,text,integer)
  to service_role;
grant execute on function public.pt650_health_claim_dedupe(uuid,uuid,text,uuid,text,text,numeric)
  to service_role;
