import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { webauthnOK, passkeyLogin, passkeyRegister, bio } from '../lib/api.js'
import { hasData } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { DEMO } from '../lib/demo.js'
import { guestAllowed } from '../lib/guest.js'
import { useState, useRef, useEffect } from 'react'
import Icon from '../components/Icon.jsx'
import { Button, Segmented } from '../components/ui.jsx'
import { askAddDeviceData } from '../sheets.jsx'
import { passwordOn, PasswordRegisterForm, openPasswordSignIn } from '../components/PasswordAuth.jsx'
import { openDeviceLinkRedeem } from '../components/Passkeys.jsx'
import { platformSignIn, platformSignUp } from '../lib/platform-auth.js'
import { platformApi } from '../lib/platform-api.js'
import { getLang } from '../lib/i18n-core.js'


function PlatformEntry() {
  const ar = String(getLang()).toLowerCase().startsWith('ar')
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const C = ar ? {
    title: 'ادخل إلى PT650',
    subtitle: 'حساب واحد للتدريب، Move، المكافآت والخدمات الذكية.',
    signin: 'تسجيل الدخول',
    create: 'إنشاء حساب',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    weak: 'استخدم كلمة مرور من 8 أحرف على الأقل.',
    failed: 'تعذر الدخول. تحقق من البريد وكلمة المرور.',
    confirm: 'تم إنشاء الحساب. افتح رسالة التأكيد في بريدك، ثم عد وسجّل الدخول.',
    privacy: 'سجل التدريب يبقى على هذا الجهاز في هذه المرحلة، بينما الخدمات المتصلة والمكافآت ترتبط بحساب PT650.'
  } : {
    title: 'Continue to PT650',
    subtitle: 'One account for training, Move, rewards and connected services.',
    signin: 'Sign in',
    create: 'Create account',
    email: 'Email',
    password: 'Password',
    weak: 'Use a password with at least 8 characters.',
    failed: 'Sign-in failed. Check your email and password.',
    confirm: 'Account created. Confirm it from your email, then return and sign in.',
    privacy: 'Training history stays on this device in this phase, while connected services and rewards are tied to your PT650 account.'
  }

  const submit = async e => {
    e.preventDefault()
    const mail = email.trim()
    if (!mail || !password) return
    if (password.length < 8) { setMessage(C.weak); return }
    setBusy(true)
    setMessage('')
    try {
      if (mode === 'create') {
        const result = await platformSignUp(mail, password)
        if (!result.session) {
          setMessage(C.confirm)
          setMode('signin')
          setPassword('')
          return
        }
      } else {
        await platformSignIn(mail, password)
      }
      await platformApi('account').catch(() => {})
    } catch {
      setMessage(C.failed)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-panel">
      <div className="login-panel-icon" aria-hidden="true"><Icon name="person" /></div>
      <div className="login-panel-copy">
        <h2>{C.title}</h2>
        <p>{C.subtitle}</p>
      </div>

      <div className="login-mode-switch" role="tablist" aria-label={C.title}>
        <button type="button" className={mode === 'signin' ? 'on' : ''} onClick={() => { setMode('signin'); setMessage('') }}>{C.signin}</button>
        <button type="button" className={mode === 'create' ? 'on' : ''} onClick={() => { setMode('create'); setMessage('') }}>{C.create}</button>
      </div>

      <form className="login-platform-form" onSubmit={submit}>
        <label>
          <span>{C.email}</span>
          <input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </label>
        <label>
          <span>{C.password}</span>
          <input type="password" minLength={8} autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
            value={password} onChange={e => setPassword(e.target.value)} required />
        </label>
        <Button variant="primary" icon={mode === 'create' ? 'sparkles' : 'person'} disabled={busy}>
          {busy ? '…' : mode === 'create' ? C.create : C.signin}
        </Button>
      </form>

      {!!message && <div className="login-inline-note">{message}</div>}
      <div className="login-security"><Icon name="lock" /><span>{C.privacy}</span></div>
    </div>
  )
}

function RegisterSheet({ close }) {
  const { setUser, pushState, pullState, loadConfig } = useStore()
  const config = useStore(s => s.config)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const inviteOnly = !!config?.invite_only
  // A password is offered only where the instance allows it (#118), and is the only choice in a
  // browser that cannot make a passkey. Where both work, the passkey stays the first one.
  const pwOn = passwordOn(config)
  const [how, setHow] = useState(webauthnOK() ? 'passkey' : 'password')
  const ref = useRef(null)
  useEffect(() => { setTimeout(() => ref.current?.focus(), 250) }, [])
  // Boot already fetched this; retry here only if that attempt failed, so the invite field still
  // appears on an instance whose config arrived late rather than never.
  useEffect(() => { loadConfig() }, [loadConfig])
  const go = async () => {
    const n = name.trim()
    if (!n) { useUI.getState().toast(t('Enter a name')); return }
    if (inviteOnly && !code.trim()) { useUI.getState().toast(t('An invite code is required')); return }
    try {
      const u = await passkeyRegister(n, code.trim())
      setUser(u); close()
      if (hasData(useStore.getState().S)) { await pushState(); useUI.getState().toast(t('Profile created — data from this device moved into it')) }
      else { await pullState(); useUI.getState().toast(t('Welcome, {0}', u.name)) }
    } catch (e) { if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') useUI.getState().toast(e.message || t('Registration failed')) }
  }
  const choose = pwOn && webauthnOK() && <>
    <Segmented options={[{ value: 'passkey', label: t('Passkey'), icon: 'person' }, { value: 'password', label: t('Password'), icon: 'key' }]}
      value={how} onChange={setHow} />
    <div style={{ height: 12 }} />
  </>
  if (pwOn && how === 'password') return <>
    <h3>{t('Create your profile')}</h3>
    {choose}
    <div className="muted small" style={{ marginBottom: 14 }}>{t('Pick a name and a password. You sign in with both.')}</div>
    <PasswordRegisterForm close={close} inviteOnly={inviteOnly} name={name} setName={setName} code={code} setCode={setCode} />
  </>
  return <>
    <h3>{t('Create your profile')}</h3>
    {choose}
    <div className="muted small" style={{ marginBottom: 14 }}>{t('Pick a name, then confirm with {0}. The passkey is saved in your device — no password needed.', bio())}</div>
    <input ref={ref} className="input" placeholder={t('Your name')} maxLength={40} value={name} onChange={e => setName(e.target.value)} />
    {inviteOnly && <>
      <div style={{ height: 10 }} />
      <input className="input" dir="ltr" placeholder={t('Invite code')} maxLength={40} value={code}
        onChange={e => setCode(e.target.value.toUpperCase())} style={{ letterSpacing: '.14em', fontWeight: 600, textAlign: 'center' }} />
      <div className="dim small" style={{ marginTop: 6 }}>{t('This app is invite-only — enter the code you were given.')}</div>
    </>}
    <div style={{ height: 12 }} />
    <Button variant="primary" onClick={go}>{t('Create passkey')}</Button>
  </>
}

export default function Login() {
  const { setUser, adoptProfile, setGuest } = useStore()
  const config = useStore(s => s.config)
  const canGuest = guestAllowed(config)
  const pwOn = passwordOn(config)
  const passkeys = webauthnOK()

  const register = () => useUI.getState().openSheet(close => <RegisterSheet close={close} />)
  const signIn = async () => {
    try {
      const u = await passkeyLogin()
      setUser(u, { adopt: true })
      await adoptProfile(askAddDeviceData)
      useUI.getState().toast(t('Welcome back, {0}', u.name))
    } catch (e) {
      if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') {
        useUI.getState().toast(e.message || t('Sign-in failed'))
      }
    }
  }

  const hero = (
    <section className="login-hero" aria-label="PT650">
      <div className="login-brand-lockup">
        <span className="login-brand-mark" aria-hidden="true"><Icon name="dumbbell" /></span>
        <span className="login-brand-name">PT650</span>
      </div>

      <div className="login-hero-copy">
        <span className="login-eyebrow">{DEMO ? 'PT650 · Athlete OS' : t('Exercises')}</span>
        <h1>{DEMO ? 'Train. Move. Recover.' : 'PT650'}</h1>
        <p>{DEMO ? 'PT650 brings training, verified activity and your next intelligent services under one account.' : t('Your workouts. Your weights. Your profile.')}</p>
      </div>

      <div className="login-hero-foot" aria-hidden="true">
        <span>{t('Plan')}</span>
        <i />
        <span>{t('Exercises')}</span>
        <i />
        <span>{t('History')}</span>
      </div>
    </section>
  )

  if (DEMO) return (
    <main className="login-page">
      {hero}
      <section className="login-entry">
        <PlatformEntry />
      </section>
    </main>
  )

  let authBody
  if (passkeys) {
    authBody = (
      <>
        <Button variant="primary" icon="person" onClick={signIn}>{t('Sign in with passkey')}</Button>
        {pwOn && <Button icon="key" onClick={() => openPasswordSignIn()}>{t('Sign in with password')}</Button>}
        <Button variant="tinted" icon="sparkles" onClick={register}>{t('Create new profile')}</Button>
        <button className="login-text-action" onClick={openDeviceLinkRedeem}>
          <Icon name="qr" />
          <span>{t('Use a code from your other device')}</span>
        </button>
      </>
    )
  } else if (pwOn) {
    authBody = (
      <>
        <div className="login-inline-note">{t("This browser doesn't support passkeys — sign in with your name and password instead.")}</div>
        <Button variant="primary" icon="key" onClick={() => openPasswordSignIn()}>{t('Sign in with password')}</Button>
        <Button variant="tinted" icon="sparkles" onClick={register}>{t('Create new profile')}</Button>
      </>
    )
  } else {
    authBody = (
      <div className="login-inline-note">
        {canGuest
          ? t("This browser doesn't support passkeys — you can still use openGym locally on this device.")
          : t("This browser doesn't support passkeys, and this instance requires an account. Try a browser or device with passkey support.")}
      </div>
    )
  }

  return (
    <main className="login-page">
      {hero}
      <section className="login-entry">
        <div className="login-panel">
          <div className="login-panel-icon" aria-hidden="true"><Icon name="person" /></div>
          <div className="login-panel-copy">
            <h2>{t('Continue')}</h2>
            <p>{t('Your workouts. Your weights. Your profile.')}</p>
          </div>

          <div className="login-actions">{authBody}</div>

          {canGuest && (
            <button className="login-guest" onClick={() => setGuest(true)}>
              {t('Continue without account')}
            </button>
          )}

          <div className="login-security">
            <Icon name="lock" />
            <span>
              {pwOn
                ? t('Passkeys use {0}. A password works too, where passkeys do not.', bio())
                : t('Passkeys use {0} — no passwords.', bio())}
              {' '}
              {t('Each profile keeps its own plan, workouts & body weight.')}
            </span>
          </div>
        </div>
      </section>
    </main>
  )
}
