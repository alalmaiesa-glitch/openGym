-- PT650 Platform Core V2 hardening
-- Safe database-linter remediations that do not change client access policy.

-- Pin search_path so function name resolution cannot be influenced by caller role settings.
alter function pt650.reserve_challenge_reward(uuid, text, integer, bigint, text)
  set search_path = pt650, public;

alter function pt650.reject_reward_ledger_mutation()
  set search_path = pt650, public;

alter function pt650.activity_metric_delta(text, text, jsonb)
  set search_path = pg_catalog;

-- Cover foreign keys used by deletes, joins and sponsor/equipment lookups.
create index if not exists challenge_enrollments_challenge_idx
  on pt650.challenge_enrollments (challenge_id, challenge_version);

create index if not exists challenges_sponsor_idx
  on pt650.challenges (sponsor_org_id);

create index if not exists equipment_feedback_instance_idx
  on pt650.equipment_feedback (equipment_instance_id)
  where equipment_instance_id is not null;

create index if not exists venues_operator_idx
  on pt650.venues (operator_org_id)
  where operator_org_id is not null;

-- V2 replaced the venue-only rollup key with a general scope key. Promote that unique index to
-- the table primary key so replication/tooling has a stable row identity at scale.
alter table pt650.equipment_usage_rollups_daily
  add constraint equipment_usage_rollups_daily_pkey
  primary key using index equipment_usage_rollups_scope_uidx;
