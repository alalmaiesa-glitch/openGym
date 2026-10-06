-- PT650 Health Core V1 production hardening.
update pt650.health_adapter_registry
set status = 'active',
    capabilities = array['strength_training','body_weight'],
    updated_at = now()
where provider = 'pt650_workout';

create index if not exists health_sources_provider_idx
  on pt650.health_sources (provider);

create index if not exists health_import_keys_source_idx
  on pt650.health_import_keys (source_id);

create index if not exists health_observations_device_idx
  on pt650.health_observations (device_id)
  where device_id is not null;

create index if not exists endurance_activities_device_idx
  on pt650.endurance_activities (device_id)
  where device_id is not null;
