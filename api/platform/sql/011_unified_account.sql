-- PT650 Unified Account V1
-- One Supabase Auth identity becomes the stable owner for connected PT650 services.
-- Workout history remains device-local in this phase; connected products key off auth.users.id.

create table if not exists pt650.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 80),
  locale text not null default 'ar' check (char_length(locale) between 2 and 12),
  onboarding_version integer not null default 1 check (onboarding_version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table pt650.profiles enable row level security;
revoke all on table pt650.profiles from public, anon, authenticated;
grant all on table pt650.profiles to service_role;

create or replace function public.pt650_account_bootstrap(
  p_user_id uuid,
  p_locale text default 'ar'
)
returns table (
  user_id uuid,
  display_name text,
  locale text,
  onboarding_version integer,
  created_at timestamptz,
  updated_at timestamptz,
  last_seen_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, pt650
as $$
begin
  if p_user_id is null then
    raise exception 'user required';
  end if;

  insert into pt650.profiles(user_id, locale, last_seen_at)
  values (
    p_user_id,
    case when p_locale ~ '^[A-Za-z]{2,3}([_-][A-Za-z0-9]{2,8})?$' then lower(replace(p_locale, '_', '-')) else 'ar' end,
    now()
  )
  on conflict (user_id) do update
  set last_seen_at = now();

  return query
  select p.user_id, p.display_name, p.locale, p.onboarding_version,
         p.created_at, p.updated_at, p.last_seen_at
  from pt650.profiles p
  where p.user_id = p_user_id;
end;
$$;

create or replace function public.pt650_account_update_profile(
  p_user_id uuid,
  p_display_name text,
  p_locale text
)
returns table (
  user_id uuid,
  display_name text,
  locale text,
  onboarding_version integer,
  created_at timestamptz,
  updated_at timestamptz,
  last_seen_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, pt650
as $$
declare
  v_name text := nullif(trim(coalesce(p_display_name, '')), '');
  v_locale text := lower(replace(coalesce(p_locale, 'ar'), '_', '-'));
begin
  if p_user_id is null then raise exception 'user required'; end if;
  if v_name is not null and char_length(v_name) > 80 then raise exception 'display name too long'; end if;
  if v_locale !~ '^[a-z]{2,3}(-[a-z0-9]{2,8})?$' then raise exception 'invalid locale'; end if;

  insert into pt650.profiles(user_id, display_name, locale, last_seen_at)
  values (p_user_id, v_name, v_locale, now())
  on conflict (user_id) do update
  set display_name = excluded.display_name,
      locale = excluded.locale,
      updated_at = now(),
      last_seen_at = now();

  return query
  select p.user_id, p.display_name, p.locale, p.onboarding_version,
         p.created_at, p.updated_at, p.last_seen_at
  from pt650.profiles p
  where p.user_id = p_user_id;
end;
$$;

revoke all on function public.pt650_account_bootstrap(uuid,text)
  from public, anon, authenticated;
revoke all on function public.pt650_account_update_profile(uuid,text,text)
  from public, anon, authenticated;

grant execute on function public.pt650_account_bootstrap(uuid,text)
  to service_role;
grant execute on function public.pt650_account_update_profile(uuid,text,text)
  to service_role;
