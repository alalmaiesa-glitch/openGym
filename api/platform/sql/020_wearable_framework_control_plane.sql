-- PT650 Wearable Adapter Framework V1 — safe account-facing control plane.
-- Returns metadata/status only. Vault secret ids, decrypted tokens, raw cursors and job payloads stay server-only.

create or replace function public.pt650_wearable_framework(p_user_id uuid)
returns jsonb
language sql
security definer
stable
set search_path = pg_catalog, public, pt650
as $$
  select jsonb_build_object(
    'adapters', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'provider', r.provider,
          'displayName', r.display_name,
          'transport', r.transport,
          'status', r.status,
          'capabilities', r.capabilities,
          'adapterVersion', r.adapter_version,
          'authStrategy', r.auth_strategy,
          'syncStrategy', r.sync_strategy,
          'defaultPriority', r.default_priority,
          'backfillDays', r.backfill_days,
          'requiresNative', r.requires_native,
          'usesTokenVault', r.uses_token_vault,
          'priority', coalesce((
            select p.priority
            from pt650.health_source_preferences p
            where p.user_id = p_user_id
              and p.provider = r.provider
              and p.scope_key = '*'
            limit 1
          ), r.default_priority),
          'enabled', coalesce((
            select p.enabled
            from pt650.health_source_preferences p
            where p.user_id = p_user_id
              and p.provider = r.provider
              and p.scope_key = '*'
            limit 1
          ), true)
        )
        order by
          case r.status when 'active' then 0 when 'planned' then 1 else 2 end,
          r.default_priority desc,
          r.display_name
      )
      from pt650.health_adapter_registry r
    ), '[]'::jsonb),
    'connections', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'connectionId', c.id,
          'provider', c.provider,
          'displayName', r.display_name,
          'connectionMode', c.connection_mode,
          'status', c.status,
          'scopes', c.scopes,
          'permissionState', c.permission_state,
          'priority', coalesce(
            c.priority_override,
            public.pt650_health_effective_priority(c.user_id, c.provider, '*')
          ),
          'tokenStored', exists (
            select 1 from pt650.health_connection_token_refs tr
            where tr.connection_id = c.id
          ),
          'tokenExpiresAt', c.token_expires_at,
          'lastSyncAt', c.last_sync_at,
          'nextSyncAt', c.next_sync_at,
          'lastErrorCode', c.last_error_code
        )
        order by r.default_priority desc, c.created_at
      )
      from pt650.health_connections c
      join pt650.health_adapter_registry r on r.provider = c.provider
      where c.user_id = p_user_id
    ), '[]'::jsonb),
    'sync', jsonb_build_object(
      'queued', (
        select count(*) from pt650.health_sync_jobs j
        where j.user_id = p_user_id and j.status in ('queued','retry')
      ),
      'leased', (
        select count(*) from pt650.health_sync_jobs j
        where j.user_id = p_user_id and j.status = 'leased'
      ),
      'dead', (
        select count(*) from pt650.health_sync_jobs j
        where j.user_id = p_user_id and j.status = 'dead'
      )
    )
  );
$$;

revoke all on function public.pt650_wearable_framework(uuid)
  from public, anon, authenticated;
grant execute on function public.pt650_wearable_framework(uuid)
  to service_role;
