import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { platformApi } from '../lib/platform-api.js'
import { getLang } from '../lib/i18n-core.js'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'

const km = m => {
  const n = Number(m) || 0
  return n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 1 : 2) + ' km' : Math.round(n) + ' m'
}

const duration = sec => {
  const n = Math.max(0, Number(sec) || 0)
  const h = Math.floor(n / 3600)
  const m = Math.round((n % 3600) / 60)
  if (h) return `${h}h ${m}m`
  return `${m} min`
}

const METRICS = {
  steps: { ar: 'الخطوات', en: 'Steps', unit: '' },
  sleep_duration_min: { ar: 'النوم', en: 'Sleep', unit: 'min' },
  weight_kg: { ar: 'الوزن', en: 'Weight', unit: 'kg' },
  body_fat_pct: { ar: 'دهون الجسم', en: 'Body fat', unit: '%' },
  hydration_ml: { ar: 'السوائل', en: 'Hydration', unit: 'ml' },
  fasting_minutes: { ar: 'الصيام', en: 'Fasting', unit: 'min' },
  resting_hr_bpm: { ar: 'نبض الراحة', en: 'Resting HR', unit: 'bpm' },
  hrv_rmssd_ms: { ar: 'HRV', en: 'HRV', unit: 'ms' },
  spo2_pct: { ar: 'الأكسجين', en: 'SpO₂', unit: '%' },
  respiratory_rate: { ar: 'التنفس', en: 'Respiratory rate', unit: '/min' },
  body_temp_c: { ar: 'الحرارة', en: 'Temperature', unit: '°C' },
  active_energy_kcal: { ar: 'الطاقة النشطة', en: 'Active energy', unit: 'kcal' }
}

const COPY = ar => ar ? {
  title: 'PT650 Health',
  subtitle: 'سجل صحي ورياضي موحد للتدريب، الحركة، النوم، التعافي والأجهزة القابلة للارتداء.',
  last30: 'آخر 30 يومًا',
  activities: 'الأنشطة',
  distance: 'المسافة',
  duration: 'المدة',
  latest: 'أحدث المؤشرات',
  noMetrics: 'لا توجد قياسات صحية مستوردة بعد. ستظهر هنا بعد ربط مصدر صحي.',
  recent: 'الأنشطة الحديثة',
  noActivities: 'لا توجد أنشطة بعد. جلسات PT650 Move الموثقة ستظهر هنا تلقائيًا.',
  sources: 'مصادر البيانات',
  active: 'متصل',
  planned: 'قادم',
  disabled: 'متوقف',
  openMove: 'ابدأ PT650 Move',
  loading: 'جارٍ تحميل بياناتك…',
  unavailable: 'تعذر تحميل PT650 Health الآن.',
  back: 'رجوع',
  verified: 'موثق',
  review: 'مراجعة',
  sourceAttested: 'من المصدر',
  privacy: 'الموقع الخام لا يُخزن داخل سجل Health. مسارات GPS الحساسة تُعامل كبيانات منفصلة محمية.',
  medical: 'هذه المؤشرات مخصصة للتدريب والمتابعة وليست تشخيصًا طبيًا.',
  adaptersNote: 'Active يعني أن البيانات تتدفق فعليًا الآن. Planned يعني أن الـAdapter لم يُفعّل بعد.'
} : {
  title: 'PT650 Health',
  subtitle: 'One health and endurance record for training, movement, sleep, recovery and wearables.',
  last30: 'Last 30 days',
  activities: 'Activities',
  distance: 'Distance',
  duration: 'Duration',
  latest: 'Latest metrics',
  noMetrics: 'No imported health metrics yet. They will appear here after a health source is connected.',
  recent: 'Recent activities',
  noActivities: 'No activities yet. Verified PT650 Move sessions will appear here automatically.',
  sources: 'Data sources',
  active: 'Connected',
  planned: 'Planned',
  disabled: 'Disabled',
  openMove: 'Start PT650 Move',
  loading: 'Loading your health record…',
  unavailable: 'PT650 Health is unavailable right now.',
  back: 'Back',
  verified: 'Verified',
  review: 'Review',
  sourceAttested: 'Source-attested',
  privacy: 'Raw location is not stored inside the Health record. Sensitive GPS routes remain separate protected data.',
  medical: 'These signals support training and tracking; they are not medical diagnoses.',
  adaptersNote: 'Active means data can flow today. Planned means that adapter is not enabled yet.'
}

function MetricCard({ metric, payload, ar }) {
  const meta = METRICS[metric] || { ar: metric.replaceAll('_', ' '), en: metric.replaceAll('_', ' '), unit: payload?.unit || '' }
  const raw = payload?.value ?? payload?.valueJson
  const value = typeof raw === 'number' ? raw.toLocaleString(ar ? 'ar-SA' : 'en-US', { maximumFractionDigits: 2 }) : '—'
  return (
    <div className="health-metric">
      <span>{ar ? meta.ar : meta.en}</span>
      <strong>{value}{(payload?.unit || meta.unit) ? ' ' + (payload?.unit || meta.unit) : ''}</strong>
      <small>{payload?.provider || ''}</small>
    </div>
  )
}

export default function Health() {
  const nav = useNavigate()
  const ar = String(getLang()).toLowerCase().startsWith('ar')
  const C = COPY(ar)
  const [summary, setSummary] = useState(null)
  const [activities, setActivities] = useState([])
  const [adapters, setAdapters] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = async () => {
    setLoading(true)
    setError('')
    try {
      const [s, a, x] = await Promise.all([
        platformApi('health-summary'),
        platformApi('health-activities'),
        platformApi('health-adapters')
      ])
      setSummary(s || {})
      setActivities(a.activities || [])
      setAdapters(x.adapters || [])
    } catch (e) {
      setError(e?.message || C.unavailable)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const metricEntries = useMemo(() => Object.entries(summary?.latest || {}), [summary])
  const activeSources = adapters.filter(x => x.status === 'active')
  const plannedSources = adapters.filter(x => x.status === 'planned')
  const totals = summary?.activity30d || {}

  return (
    <div className="health-page">
      <header className="health-head">
        <button className="iconbtn" onClick={() => nav('/home')} aria-label={C.back}><Icon name="chevronLeft" /></button>
        <div>
          <div className="health-kicker">PT650 · Athlete Health Layer</div>
          <h1>{C.title}</h1>
          <p>{C.subtitle}</p>
        </div>
      </header>

      {loading && <div className="health-notice"><Icon name="timer" /><span>{C.loading}</span></div>}
      {!!error && <div className="health-notice error"><Icon name="warning" /><span>{error}</span></div>}

      <section className="health-summary-card">
        <div className="health-section-head">
          <span className="health-icon"><Icon name="heart" /></span>
          <div><h2>{C.last30}</h2><p>Health & Endurance</p></div>
        </div>
        <div className="health-summary-grid">
          <div><strong>{Number(totals.count || 0).toLocaleString(ar ? 'ar-SA' : 'en-US')}</strong><span>{C.activities}</span></div>
          <div><strong>{km(totals.distanceM || 0)}</strong><span>{C.distance}</span></div>
          <div><strong>{duration(totals.durationSec || 0)}</strong><span>{C.duration}</span></div>
        </div>
      </section>

      <section className="health-card">
        <div className="health-section-head">
          <span className="health-icon"><Icon name="activity" /></span>
          <div><h2>{C.latest}</h2></div>
        </div>
        {metricEntries.length ? (
          <div className="health-metrics-grid">
            {metricEntries.map(([metric, payload]) => <MetricCard key={metric} metric={metric} payload={payload} ar={ar} />)}
          </div>
        ) : <div className="health-empty">{C.noMetrics}</div>}
      </section>

      <section className="health-card">
        <div className="health-section-head">
          <span className="health-icon"><Icon name="calendar" /></span>
          <div><h2>{C.recent}</h2></div>
        </div>
        {activities.length ? (
          <div className="health-activity-list">
            {activities.map(a => (
              <div className="health-activity-row" key={a.activity_id}>
                <span className="health-activity-glyph"><Icon name="heart" /></span>
                <div className="grow">
                  <strong>{a.title || a.activity_type}</strong>
                  <span>{new Date(a.started_at).toLocaleString(ar ? 'ar-SA' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
                <div className="health-activity-stats">
                  <strong>{a.distance_m != null ? km(a.distance_m) : duration(a.duration_sec)}</strong>
                  <span>{a.verification === 'pt650_verified' ? C.verified : a.verification === 'review' ? C.review : C.sourceAttested}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="health-empty">
            <p>{C.noActivities}</p>
            <Button size="sm" variant="tinted" icon="play" onClick={() => nav('/move')}>{C.openMove}</Button>
          </div>
        )}
      </section>

      <section className="health-card">
        <div className="health-section-head">
          <span className="health-icon"><Icon name="link" /></span>
          <div><h2>{C.sources}</h2><p>{C.adaptersNote}</p></div>
        </div>

        <div className="health-source-group">
          {activeSources.map(x => (
            <div className="health-source-row" key={x.provider}>
              <div><strong>{x.display_name}</strong><span>{(x.capabilities || []).join(' · ')}</span></div>
              <span className="health-source-state active">{C.active}</span>
            </div>
          ))}
          {plannedSources.map(x => (
            <div className="health-source-row" key={x.provider}>
              <div><strong>{x.display_name}</strong><span>{(x.capabilities || []).join(' · ')}</span></div>
              <span className="health-source-state planned">{C.planned}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="health-footnote"><Icon name="lock" /><span>{C.privacy}</span></div>
      <div className="health-footnote"><Icon name="info" /><span>{C.medical}</span></div>
    </div>
  )
}
