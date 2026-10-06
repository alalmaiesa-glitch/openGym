import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { DEMO } from '../lib/demo.js'
import { getLang } from '../lib/i18n-core.js'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'

const rad = d => d * Math.PI / 180
const distanceBetween = (a, b) => {
  const R = 6371008.8
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

const fmtDistance = m => m >= 1000 ? (m / 1000).toFixed(m >= 10000 ? 1 : 2) + ' km' : Math.round(m) + ' m'
const fmtDuration = sec => {
  const s = Math.max(0, Math.round(sec || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
    : `${m}:${String(r).padStart(2, '0')}`
}

const previewChallenge = {
  challenge_id: 'pt650-founding-walk-2k',
  version: 1,
  title: 'تحدي PT650 التأسيسي — امشِ 2 كم',
  metric: 'distance_m',
  target: 2000,
  reward_kind: 'access_days',
  reward_value: 7,
  reward_display: '7 أيام من الوصول المتقدم',
  sponsor_name: 'PT650',
  verification_disclosure: 'جلسة مشي واحدة عبر GPS، مدة 5 دقائق على الأقل، مع فحص دقة الإشارة والسرعة. لا يُحتفظ بمسار GPS الخام بعد التحقق.',
  enrollment_status: null,
  progress: 0,
  reward_reserved: false,
  demoPreview: true
}

const copy = ar => ar ? {
  title: 'PT650 Move',
  subtitle: 'تحرّك، حقق الهدف، واستلم المكافأة المعلنة بعد التحقق.',
  reward: 'مكافآتك',
  balance: 'رصيد PT650',
  access: 'الوصول المتقدم',
  noAccess: 'لا يوجد وصول مكتسب حاليًا',
  challenges: 'التحديات',
  sponsored: 'برعاية',
  goal: 'الهدف',
  progress: 'التقدم',
  rewardLabel: 'المكافأة',
  verify: 'طريقة التحقق',
  enroll: 'اشترك في التحدي',
  enrolled: 'المكافأة محجوزة لك',
  settled: 'تم صرف المكافأة',
  soldOut: 'اكتملت المقاعد الممولة لهذا التحدي.',
  walk: 'جلسة المشي',
  start: 'ابدأ المشي',
  stop: 'إنهاء والتحقق',
  distance: 'المسافة',
  time: 'المدة',
  gps: 'نقاط GPS',
  waitingGps: 'جارٍ انتظار إشارة GPS…',
  tracking: 'يتم تتبع الجلسة الآن',
  verifying: 'جارٍ التحقق من الجلسة…',
  verified: 'تم توثيق الجلسة بنجاح.',
  review: 'تم تسجيل الجلسة وتحتاج مراجعة قبل احتساب مكافأة.',
  instant: 'تم تحقيق الهدف وصرف المكافأة فورًا.',
  locationDenied: 'لم يتم السماح بالموقع. فعّل إذن الموقع لاستخدام PT650 Move.',
  locationUnavailable: 'تعذر الحصول على GPS بدقة كافية.',
  tooShort: 'الجلسة ما زالت قصيرة. استمر في المشي حتى تتوفر نقاط ومدة كافية للتحقق.',
  privacy: 'PT650 يرسل نقاط الجلسة إلى الخادم عند الإنهاء للتحقق منها، ثم لا يحتفظ بمسار GPS الخام؛ يحفظ الملخص والبصمة فقط.',
  demo: 'هذه نسخة عرض ثابتة. التحدي ظاهر للمعاينة، لكن التسجيل والمكافآت يتطلبان حساب PT650 متصلًا بالخادم.',
  empty: 'لا توجد تحديات ممولة متاحة حاليًا.',
  loading: 'جارٍ تحميل التحديات…',
  unavailable: 'خدمة PT650 Move غير متاحة على هذا الخادم بعد.',
  back: 'رجوع',
  minRule: 'للتحقق: 5 دقائق على الأقل وإشارة GPS مستقرة.',
  complete: 'مكتمل'
} : {
  title: 'PT650 Move',
  subtitle: 'Move, hit the stated goal, and receive the published reward after verification.',
  reward: 'Your rewards',
  balance: 'PT650 balance',
  access: 'Advanced access',
  noAccess: 'No earned access right now',
  challenges: 'Challenges',
  sponsored: 'Sponsored by',
  goal: 'Goal',
  progress: 'Progress',
  rewardLabel: 'Reward',
  verify: 'Verification',
  enroll: 'Join challenge',
  enrolled: 'Your reward is reserved',
  settled: 'Reward settled',
  soldOut: 'All funded places for this challenge are taken.',
  walk: 'Walking session',
  start: 'Start walk',
  stop: 'Finish & verify',
  distance: 'Distance',
  time: 'Duration',
  gps: 'GPS points',
  waitingGps: 'Waiting for GPS…',
  tracking: 'Tracking this session now',
  verifying: 'Verifying session…',
  verified: 'Session verified successfully.',
  review: 'Session recorded and needs review before any reward is counted.',
  instant: 'Goal achieved and reward settled immediately.',
  locationDenied: 'Location permission was denied. Enable it to use PT650 Move.',
  locationUnavailable: 'A sufficiently accurate GPS signal is not available.',
  tooShort: 'This session is still too short. Keep walking until there is enough time and GPS evidence.',
  privacy: 'PT650 sends the session points to the server only when you finish, then discards the raw GPS route after verification; only the summary and fingerprint remain.',
  demo: 'This is the static demo. The challenge is shown as a preview, but enrollment and rewards require a PT650 server account.',
  empty: 'No funded challenges are available right now.',
  loading: 'Loading challenges…',
  unavailable: 'PT650 Move is not enabled on this server yet.',
  back: 'Back',
  minRule: 'Verification needs at least 5 minutes and a stable GPS signal.',
  complete: 'Complete'
}

export default function Move() {
  const nav = useNavigate()
  const ar = String(getLang()).toLowerCase().startsWith('ar')
  const C = copy(ar)
  const [challenges, setChallenges] = useState(DEMO ? [previewChallenge] : [])
  const [reward, setReward] = useState(null)
  const [loading, setLoading] = useState(!DEMO)
  const [serviceError, setServiceError] = useState('')
  const [busyChallenge, setBusyChallenge] = useState('')
  const [tracking, setTracking] = useState(false)
  const [sending, setSending] = useState(false)
  const [gpsError, setGpsError] = useState('')
  const [status, setStatus] = useState('')
  const [live, setLive] = useState({ distanceM: 0, durationSec: 0, points: 0 })
  const pointsRef = useRef([])
  const watchRef = useRef(null)
  const startedRef = useRef(0)
  const sessionRef = useRef('')
  const tickerRef = useRef(null)

  const refresh = async () => {
    if (DEMO) return
    setLoading(true)
    setServiceError('')
    try {
      const [c, r] = await Promise.all([
        api('/api/move/challenges'),
        api('/api/rewards/summary')
      ])
      setChallenges(c.challenges || [])
      setReward(r)
    } catch (e) {
      setServiceError(e?.code === 'platform-unavailable' || e?.status === 503 ? C.unavailable : (e?.message || C.unavailable))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  useEffect(() => () => {
    if (watchRef.current != null) navigator.geolocation?.clearWatch(watchRef.current)
    clearInterval(tickerRef.current)
  }, [])

  const activeAccess = useMemo(() => {
    const raw = reward?.active_access_until
    if (!raw) return null
    const d = new Date(raw)
    return Number.isFinite(d.getTime()) && d > new Date() ? d : null
  }, [reward?.active_access_until])

  const addPoint = pos => {
    const p = {
      lat: pos.coords.latitude,
      lon: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      t: pos.timestamp || Date.now()
    }
    const arr = pointsRef.current
    const last = arr.at(-1)
    if (last && p.t <= last.t) return
    arr.push(p)

    let distanceM = live.distanceM
    if (last && last.accuracy <= 100 && p.accuracy <= 100) {
      const d = distanceBetween(last, p)
      if (d < 500) distanceM += d
    }
    setLive(current => ({
      distanceM: Number.isFinite(distanceM) ? distanceM : current.distanceM,
      durationSec: Math.max(0, (Date.now() - startedRef.current) / 1000),
      points: arr.length
    }))
    setGpsError('')
  }

  const startWalk = () => {
    if (DEMO) { setStatus(C.demo); return }
    if (!navigator.geolocation) { setGpsError(C.locationUnavailable); return }

    pointsRef.current = []
    startedRef.current = Date.now()
    sessionRef.current = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID().replace(/-/g, '')
      : `move${Date.now()}${Math.random().toString(36).slice(2, 14)}`
    setLive({ distanceM: 0, durationSec: 0, points: 0 })
    setGpsError('')
    setStatus('')
    setTracking(true)

    watchRef.current = navigator.geolocation.watchPosition(
      addPoint,
      err => {
        if (err?.code === 1) setGpsError(C.locationDenied)
        else setGpsError(C.locationUnavailable)
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
    )

    tickerRef.current = setInterval(() => {
      setLive(current => ({ ...current, durationSec: Math.max(0, (Date.now() - startedRef.current) / 1000) }))
    }, 1000)
  }

  const stopWalk = async () => {
    if (watchRef.current != null) navigator.geolocation?.clearWatch(watchRef.current)
    watchRef.current = null
    clearInterval(tickerRef.current)
    tickerRef.current = null
    setTracking(false)

    const points = pointsRef.current.slice()
    if (points.length < 6 || Date.now() - startedRef.current < 5 * 60 * 1000) {
      setStatus(C.tooShort)
      return
    }

    setSending(true)
    setStatus(C.verifying)
    try {
      const result = await api('/api/move/session', {
        method: 'POST',
        timeout: 45000,
        body: JSON.stringify({ sessionId: sessionRef.current, points })
      })
      const instant = (result.rewards || []).some(x => x?.settlement === 'settled')
      setStatus(instant ? C.instant : result.verification === 'verified' ? C.verified : C.review)
      if (result.summary) setLive(current => ({ ...current, ...result.summary }))
      await refresh()
    } catch (e) {
      setStatus(e?.status === 422 ? C.tooShort : (e?.message || C.unavailable))
    } finally {
      setSending(false)
    }
  }

  const enroll = async challenge => {
    if (DEMO) { setStatus(C.demo); return }
    setBusyChallenge(challenge.challenge_id)
    setStatus('')
    try {
      const result = await api('/api/move/enroll', {
        method: 'POST',
        body: JSON.stringify({ challengeId: challenge.challenge_id, version: Number(challenge.version) })
      })
      if (result.outcome === 'sold_out') setStatus(C.soldOut)
      await refresh()
    } catch (e) {
      setStatus(e?.status === 409 ? C.soldOut : (e?.message || C.unavailable))
    } finally {
      setBusyChallenge('')
    }
  }

  return (
    <div className="move-page">
      <header className="move-head">
        <button className="iconbtn" onClick={() => nav('/home')} aria-label={C.back}><Icon name="chevronLeft" /></button>
        <div>
          <div className="move-kicker">PT650 · Verified Activity</div>
          <h1>{C.title}</h1>
          <p>{C.subtitle}</p>
        </div>
      </header>

      {DEMO && <div className="move-notice"><Icon name="info" /><span>{C.demo}</span></div>}
      {!!serviceError && <div className="move-notice"><Icon name="warning" /><span>{serviceError}</span></div>}

      <section className="move-reward-card">
        <div className="move-section-head">
          <span className="move-section-icon"><Icon name="trophy" /></span>
          <div><h2>{C.reward}</h2><p>Earned Access</p></div>
        </div>
        <div className="move-reward-grid">
          <div><strong>{reward?.ptc_balance ?? 0}</strong><span>{C.balance}</span></div>
          <div>
            <strong>{activeAccess ? activeAccess.toLocaleDateString(ar ? 'ar-SA' : 'en-US') : '—'}</strong>
            <span>{activeAccess ? C.access : C.noAccess}</span>
          </div>
        </div>
      </section>

      <section className="move-section">
        <div className="move-section-head">
          <span className="move-section-icon"><Icon name="target" /></span>
          <div><h2>{C.challenges}</h2><p>{loading ? C.loading : ''}</p></div>
        </div>

        {!loading && !challenges.length && <div className="move-empty">{C.empty}</div>}

        <div className="move-challenge-list">
          {challenges.map(ch => {
            const target = Number(ch.target) || 0
            const progress = Number(ch.progress) || 0
            const pct = target ? Math.min(100, Math.round(progress / target * 100)) : 0
            const enrolled = ['active','completed'].includes(ch.enrollment_status)
            const settled = ch.enrollment_status === 'settled'
            return (
              <article className="move-challenge-card" key={ch.challenge_id + ':' + ch.version}>
                <div className="move-challenge-top">
                  <div className="grow">
                    <span className="move-sponsor">{C.sponsored} {ch.sponsor_name || 'PT650'}</span>
                    <h3>{ch.title}</h3>
                  </div>
                  {settled ? <span className="move-state done"><Icon name="checkCircle" />{C.complete}</span>
                    : enrolled ? <span className="move-state"><Icon name="lock" />{C.enrolled}</span> : null}
                </div>

                <div className="move-contract-grid">
                  <div><span>{C.goal}</span><strong>{ch.metric === 'distance_m' ? fmtDistance(target) : target}</strong></div>
                  <div><span>{C.rewardLabel}</span><strong>{ch.reward_display}</strong></div>
                </div>

                {(enrolled || settled) && (
                  <div className="move-progress">
                    <div className="row between"><span>{C.progress}</span><strong>{fmtDistance(progress)} / {fmtDistance(target)}</strong></div>
                    <div className="move-progress-track"><i style={{ width: pct + '%' }} /></div>
                  </div>
                )}

                <details className="move-verification">
                  <summary>{C.verify}</summary>
                  <p>{ch.verification_disclosure}</p>
                </details>

                {!enrolled && !settled && (
                  <Button variant="primary" icon="target" disabled={!!busyChallenge || ch.demoPreview} onClick={() => enroll(ch)}>
                    {busyChallenge === ch.challenge_id ? C.loading : C.enroll}
                  </Button>
                )}
              </article>
            )
          })}
        </div>
      </section>

      <section className={'move-live-card' + (tracking ? ' active' : '')}>
        <div className="move-section-head">
          <span className="move-section-icon"><Icon name={tracking ? 'bolt' : 'heart'} /></span>
          <div>
            <h2>{C.walk}</h2>
            <p>{tracking ? (live.points ? C.tracking : C.waitingGps) : C.minRule}</p>
          </div>
        </div>

        <div className="move-live-grid">
          <div><strong>{fmtDistance(live.distanceM)}</strong><span>{C.distance}</span></div>
          <div><strong>{fmtDuration(live.durationSec)}</strong><span>{C.time}</span></div>
          <div><strong>{live.points}</strong><span>{C.gps}</span></div>
        </div>

        {!!gpsError && <div className="move-inline-error">{gpsError}</div>}
        {!!status && <div className="move-status"><Icon name={status === C.instant ? 'trophy' : 'info'} /><span>{status}</span></div>}

        <Button
          variant={tracking ? 'tinted' : 'primary'}
          icon={tracking ? 'checkCircle' : 'play'}
          disabled={sending || DEMO}
          onClick={tracking ? stopWalk : startWalk}
        >
          {sending ? C.verifying : tracking ? C.stop : C.start}
        </Button>

        <div className="move-privacy"><Icon name="lock" /><span>{C.privacy}</span></div>
      </section>
    </div>
  )
}
