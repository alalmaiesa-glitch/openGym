-- Health adapter status correction: active means data can flow today.
update pt650.health_adapter_registry
set status = case when provider = 'pt650_move' then 'active' else 'planned' end,
    updated_at = now()
where provider in ('pt650_move','pt650_workout','manual');
