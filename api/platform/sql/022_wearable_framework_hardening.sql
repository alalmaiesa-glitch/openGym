-- PT650 Wearable Adapter Framework V1 — linter hardening.

create index if not exists health_connections_provider_idx
  on pt650.health_connections (provider);

create index if not exists health_dedupe_groups_primary_provider_idx
  on pt650.health_dedupe_groups (primary_provider);

create index if not exists health_dedupe_members_provider_idx
  on pt650.health_dedupe_members (provider);

create index if not exists health_dedupe_members_user_idx
  on pt650.health_dedupe_members (user_id);

create index if not exists health_source_preferences_provider_idx
  on pt650.health_source_preferences (provider);

create index if not exists health_sync_jobs_provider_idx
  on pt650.health_sync_jobs (provider);

create or replace function pt650.health_connection_mode(p_transport text)
returns text
language sql
immutable
set search_path = pg_catalog
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
