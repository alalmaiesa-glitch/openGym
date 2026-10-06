-- PT650 Move V1 — first transparent internal challenge.
-- This is funded with PT650 access days, not cash or a third-party promotion.

insert into pt650.organizations(id, kind, name, country_code, status)
values ('pt650','sponsor','PT650','SA','active')
on conflict (id) do update
set name = excluded.name,
    status = excluded.status;

insert into pt650.challenges(
  challenge_id,
  version,
  sponsor_org_id,
  title,
  metric,
  target,
  starts_at,
  ends_at,
  reward_kind,
  reward_value,
  reward_display,
  verification_disclosure,
  terms_hash,
  budget_limit,
  status
) values (
  'pt650-founding-walk-2k',
  1,
  'pt650',
  'تحدي PT650 التأسيسي — امشِ 2 كم',
  'distance_m',
  2000,
  '2026-10-06T00:00:00Z',
  '2027-01-31T23:59:59Z',
  'access_days',
  7,
  '7 أيام من الوصول المتقدم',
  'يتحقق PT650 من نقاط GPS على الخادم: مدة الجلسة 5 دقائق على الأقل، دقة GPS المقبولة، وترفض أو تراجع السرعات غير المتوافقة مع المشي. لا يحتفظ PT650 بمسار GPS الخام بعد التحقق؛ يحفظ الملخص والبصمة فقط.',
  '0d77313ad050b291d2d95d9ca134df9d0743aec5108e03c6eb1956d93df8c977',
  7000000,
  'active'
)
on conflict (challenge_id, version) do nothing;

insert into pt650.challenge_budgets(
  challenge_id,
  challenge_version,
  currency,
  total_amount
) values (
  'pt650-founding-walk-2k',
  1,
  'ACCESS_DAY',
  7000000
)
on conflict (challenge_id, challenge_version) do nothing;
