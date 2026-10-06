-- PT650 Android Health Connect Adapter V1
-- Native Android bridge. Keep history at the platform-default 30-day read window in V1;
-- no background/history/route permissions are requested.

update pt650.health_adapter_registry
set status = 'active',
    adapter_version = 1,
    auth_strategy = 'native_permission',
    sync_strategy = 'native_pull',
    requires_native = true,
    uses_token_vault = false,
    backfill_days = 30,
    capabilities = array[
      'body_weight','body_fat','resting_heart_rate','hrv_rmssd',
      'oxygen_saturation','respiratory_rate','body_temperature','sleep','workouts'
    ]::text[],
    updated_at = now()
where provider = 'health_connect';
