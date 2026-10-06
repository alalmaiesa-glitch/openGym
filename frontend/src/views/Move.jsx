import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLang } from '../lib/i18n-core.js'
import { platformApi } from '../lib/platform-api.js'
import {
  platformSession,
  platformSignIn,
  platformSignOut,
  platformSignUp,
  platformStoredSession
} from '../lib/platform-auth.js'
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

const copy = ar => ar ? {
  title: 'PT650 Move',
  subtitle: 'تحرّك، حقق الهدف، واستلم المكافأة المعلنة بعد التحقق.',
  account: 'حساب PT650 Move',
  accountWhy: 'الحساب يربط الإنجاز والمكافأة بك أنت، ولا يمنح المتصفح أي صلاحية مباشرة على دفتر المكافآت.',
  signIn: 'دخول',
  create: 'إنشاء حساب',
  email: 'البريد الإلكتروني',
  password: 'كلمة المرور',
  signOut: 'تسجيل الخروج من Move',
  signedIn: 'الحساب متصل',
  confirmEmail: 'تم إنشاء الحساب. افحص بريدك لتأكيده، ثم عد وسجّل الدخول.',
  invalidAuth: 'تعذر تسجيل الدخول. تحقق من البريد وكلمة المرور.',
  weakPassword: 'استخدم كلمة مرور من 8 أحرف على الأقل.',
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
  privacy: 'ترسل نقاط الجلسة عند الإنهاء للتحقق فقط. لا يحتفظ PT650 بمسار GPS الخام؛ يبقى الملخص والبصمة اللازمة لإثبات الإنجاز.',
  empty: 'لا توجد تحديات ممولة متاحة حاليًا.',
  loading: 'جارٍ تحميل التحديات…',
  unavailable: 'تعذر الوصول إلى خدمة PT650 Move الآن.',
  back: 'رجوع',
  minRule: 'للتحقق: 5 دقائق على الأقل وإشارة GPS مستقرة.',
  complete: 'مكتمل'
} : {
  title: 'PT650 Move',
  subtitle: 'Move, hit the stated goal, and receive the published reward after verification.',
  account: 'PT650 Move account',
  accountWhy: 'Your account ties verified achievements and rewards to you without giving the browser direct access to the rewards ledger.',
  signIn: 'Sign in',
  create: 'Create account',
  email: 'Email',
  password: 'Password',
  signOut: 'Sign out of Move',
  signedIn: 'Account connected',
  confirmEmail: 'Account created. Check your email to confirm it, then return and sign in.',
  invalidAuth: 'Sign-in failed. Check your email and password.',
  weakPassword: 'Use a password with at least 8 characters.',
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
  privacy: 'Session points are sent only when you finish for verification. PT650 does not retain the raw GPS route; only the summary and evidence fingerprint remain.',
  empty: 'No funded challenges are available right now.',
  loading: 'Loading challenges…',
  unavailable: 'PT650 Move is unavailable right now.',
  back: 'Back',
  minRule: 'Verification needs at least 5 minutes and a stable GPS signal.',
  complete: 'Complete'
}

export default function Move() {
  const nav = useNavigate()
  const ar = String(getLang()).toLowerCase().startsWith('ar')
  const C = copy(ar)
  const [session, setSession] = useState(() => platformStoredSession())
  const [authReady, setAuthReady] = useState(false)
  const [authMode, setAuthMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [challenges, setChallenges] = useState([])
  const [reward, setReward] = useState(null)
  const [loading, setLoading] = useState(false)
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
    if (!session?.access_token) return
    setLoading(true)
    setServiceError('')
    try {
      const [c, r] = await Promise.all([
        platformApi('challenges'),
        platformApi('rewards')
      ])
      setChallenges(c.challenges || [])
      setReward(r)
    } catch (e) {
      if (e?.status === 401) {
        setSession(null)
        setChallenges([])
        setReward(null)
      } else {
        setServiceError(e?.message || C.unavailable)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let alive = true
    platformSession().then(next => {
      if (!alive) return
      setSession(next)
      setAuthReady(true)
    })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (authReady && session?.access_token) refresh()
  }, [authReady, session?.access_token])

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

  const submitAuth = async e => {
    e?.preventDefault?.()
    const mail = email.trim()
    if (!mail || !password) return
    if (password.length < 8) { setAuthMessage(C.weakPassword); return }
    setAuthBusy(true)
    setAuthMessage('')
    try {
      if (authMode === 'create') {
        const result = await platformSignUp(mail, password)
        if (result.session) {
          setSession(result.session)
          setPassword('')
        } else if (result.needsConfirmation) {
          setAuthMessage(C.confirmEmail)
          setAuthMode('signin')
          setPassword('')
        }
      } else {
        const next = await platformSignIn(mail, password)
        setSession(next)
        setPassword('')
      }
    } catch {
      setAuthMessage(C.invalidAuth)
    } finally {
      setAuthBusy(false)
    }
  }

  const logout = async () => {
    if (tracking || sending) return
    await platformSignOut()
    setSession(null)
    setChallenges([])
    setReward(null)
    setStatus('')
    setServiceError('')
  }

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

    const increment = last && last.accuracy <= 100 && p.accuracy <= 100
      ? distanceBetween(last, p)
      : 0
    setLive(current => ({
      distanceM: current.distanceM + (Number.isFinite(increment) && increment < 500 ? increment : 0),
      durationSec: Math.max(0, (Date.now() - startedRef.current) / 1000),
      points: arr.length
    }))
    setGpsError('')
  }

  const startWalk = () => {
    if (!session?.access_token) { setAuthMessage(C.invalidAuth); return }
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
      const result = await platformApi('session', {
        method: 'POST',
        timeout: 45000,
        body: { sessionId: sessionRef.current, points }
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
    setBusyChallenge(challenge.challenge_id)
    setStatus('')
    try {
      const result = await platformApi('enroll', {
        method: 'POST',
        body: { challengeId: challenge.challenge_id, version: Number(challenge.version) }
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
        <div className="grow">
          <div className="move-kicker">PT650 · Verified Activity</div>
          <h1>{C.title}</h1>
          <p>{C.subtitle}</p>
        </div>
        {session?.access_token && (
          <button className="move-account-chip" disabled={tracking || sending} onClick={logout}>
            <Icon name="person" />
            <span>{session.user?.email || C.signedIn}</span>
          </button>
        )}
      </header>

      {!authReady ? (
        <div className="move-notice"><Icon name="timer" /><span>{C.loading}</span></div>
      ) : !session?.access_token ? (
        <section className="move-auth-card">
          <div className="move-section-head">
            <span className="move-section-icon"><Icon name="lock" /></span>
            <div><h2>{C.account}</h2><p>{C.accountWhy}</p></div>
          </div>
          <div className="move-auth-switch">
            <button className={authMode === 'signin' ? 'on' : ''} onClick={() => { setAuthMode('signin'); setAuthMessage('') }}>{C.signIn}</button>
            <button className={authMode === 'create' ? 'on' : ''} onClick={() => { setAuthMode('create'); setAuthMessage('') }}>{C.create}</button>
          </div>
          <form className="move-auth-form" onSubmit={submitAuth}>
            <label><span>{C.email}</span><input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
            <label><span>{C.password}</span><input type="password" autoComplete={authMode === 'create' ? 'new-password' : 'current-password'} minLength={8} value={password} onChange={e => setPassword(e.target.value)} required /></label>
            <Button variant="primary" icon={authMode === 'create' ? 'sparkles' : 'person'} disabled={authBusy}>
              {authBusy ? C.loading : authMode === 'create' ? C.create : C.signIn}
            </Button>
          </form>
          {!!authMessage && <div className="move-status"><Icon name="info" /><span>{authMessage}</span></div>}
          <div className="move-privacy"><Icon name="lock" /><span>{C.privacy}</span></div>
        </section>
      ) : (
        <>
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
                      <Button variant="primary" icon="target" disabled={!!busyChallenge} onClick={() => enroll(ch)}>
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
              disabled={sending}
              onClick={tracking ? stopWalk : startWalk}
            >
              {sending ? C.verifying : tracking ? C.stop : C.start}
            </Button>

            <div className="move-privacy"><Icon name="lock" /><span>{C.privacy}</span></div>
          </section>

          <button className="move-signout" disabled={tracking || sending} onClick={logout}>{C.signOut}</button>
        </>
      )}
    </div>
  )
}
