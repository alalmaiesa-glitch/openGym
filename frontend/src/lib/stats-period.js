// Compact labels for Stats filters.
// Arabic uses readable words instead of English-only abbreviations such as 30d / 1Y,
// while every other locale keeps the compact upstream labels.
const AR = {
  '30d': '30 يوم',
  '90d': '90 يوم',
  '1y': 'سنة',
  '1m': 'شهر',
  '3m': '3 أشهر',
}

const DEFAULT = {
  '30d': '30d',
  '90d': '90d',
  '1y': '1Y',
  '1m': '1M',
  '3m': '3M',
}

export function statsPeriodLabel(key, lang = 'en') {
  return (lang === 'ar' ? AR : DEFAULT)[key] || key
}
