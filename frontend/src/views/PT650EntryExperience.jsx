import { useEffect, useRef, useState } from 'react'
import { getLang } from '../lib/i18n-core.js'
import Icon from '../components/Icon.jsx'
import './pt650-entry-experience.css'

const PATHS = [
  { id: 'strength', icon: 'figureStrength', color: 'lime', ar: ['القوة', 'ابنِ قدراتك'], en: ['Strength', 'Build your power'] },
  { id: 'fitness', icon: 'figureRun', color: 'cyan', ar: ['اللياقة', 'تحرّك بثقة'], en: ['Fitness', 'Move with purpose'] },
  { id: 'health', icon: 'heart', color: 'cyan', ar: ['الصحة', 'اعتنِ بنفسك'], en: ['Wellness', 'Feel your best'] },
  { id: 'balance', icon: 'target', color: 'lime', ar: ['التوازن', 'تقدّم كل يوم'], en: ['Balance', 'Progress every day'] },
]

export function PT650EnergyArtwork() {
  return (
    <svg className="pt650-gateway-art" viewBox="0 0 1200 880" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="pt650-lane-a" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#05a5ab" stopOpacity="0" />
          <stop offset=".22" stopColor="#10c8d6" stopOpacity=".85" />
          <stop offset=".66" stopColor="#b7ff3c" />
          <stop offset="1" stopColor="#e2f34f" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="pt650-lane-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#dfff53" stopOpacity="0" />
          <stop offset=".45" stopColor="#dfff53" />
          <stop offset="1" stopColor="#10cdd6" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="pt650-track-glow">
          <stop stopColor="#adf338" stopOpacity=".21" />
          <stop offset="1" stopColor="#adf338" stopOpacity="0" />
        </radialGradient>
        <filter id="pt650-track-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="17" />
        </filter>
        <pattern id="pt650-grid" width="53" height="53" patternUnits="userSpaceOnUse">
          <path d="M53 0H0V53" fill="none" stroke="#c6fa8c" strokeOpacity=".065" strokeWidth=".8" />
        </pattern>
      </defs>
      <rect width="1200" height="880" fill="url(#pt650-grid)" opacity=".55" />
      <ellipse cx="760" cy="602" rx="500" ry="320" fill="url(#pt650-track-glow)" />
      <g className="pt650-gateway-art-depth" fill="none" stroke="#b5ffc9" strokeOpacity=".075" strokeWidth="3">
        <path d="M280 0 70 480 520 880" />
        <path d="M510 0 310 370 770 880" />
        <path d="M1100 0 820 410 1200 880" />
      </g>
      <g fill="none" stroke="url(#pt650-lane-a)" strokeLinecap="round" filter="url(#pt650-track-blur)" opacity=".82">
        <path d="M-150 750 C210 920 325 410 700 610 S1160 700 1370 120" strokeWidth="36" />
        <path d="M-60 830 C210 990 455 480 755 678 S1090 712 1310 180" strokeWidth="20" />
      </g>
      <g className="pt650-gateway-art-flow" fill="none" stroke="url(#pt650-lane-a)" strokeLinecap="round">
        <path d="M-150 750 C210 920 325 410 700 610 S1160 700 1370 120" strokeWidth="5.2" />
        <path d="M-60 830 C210 990 455 480 755 678 S1090 712 1310 180" strokeWidth="2.7" />
        <path d="M-190 685 C220 852 312 352 740 562 S1160 645 1290 90" strokeWidth="1.5" opacity=".62" />
      </g>
      <path className="pt650-gateway-art-pulse" d="M130 434H396l22-34 19 72 30-166 39 178 30-55h122l19-24 22 48 24-102 36 84h198"
        fill="none" stroke="url(#pt650-lane-b)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <g stroke="#dbff69" strokeWidth="2.8" strokeOpacity=".68" fill="none">
        <path d="m785 252 45 37-45 37" />
        <path d="m829 252 45 37-45 37" />
        <path d="m873 252 45 37-45 37" />
      </g>
      <circle cx="812" cy="604" r="4" fill="#efffa4" />
      <circle cx="834" cy="601" r="11" fill="none" stroke="#dfff62" strokeOpacity=".5" />
    </svg>
  )
}

export default function PT650EntryExperience({ renderAccount }) {
  const [screen, setScreen] = useState('welcome')
  const [path, setPath] = useState(null)
  const [accountMode, setAccountMode] = useState('create')
  const headingRef = useRef(null)
  const ar = String(getLang()).toLowerCase().startsWith('ar')
  const copy = ar ? {
    tagline: 'لياقة · صحة · توازن',
    title: 'ابدأ', titleGlow: 'رحلتك',
    start: 'ابدأ',
    choices: 'اختر مسارك',
    choicesText: 'كل بداية تستحق فرصة. اختر ما يلهمك وانطلق بحساب واحد.',
    signIn: 'لدي حساب بالفعل',
    account: 'أنشئ حسابك',
    accountText: 'خطوتك الأولى نحو تجربة تدريب تليق بطموحك.',
    back: 'رجوع',
    footer: 'TRAIN · MOVE · EVOLVE',
  } : {
    tagline: 'FITNESS · HEALTH · BALANCE',
    title: 'Begin', titleGlow: 'your journey',
    start: 'Get started',
    choices: 'Choose your path',
    choicesText: 'Every journey starts somewhere. Pick what inspires you and create one account.',
    signIn: 'I already have an account',
    account: 'Create your account',
    accountText: 'Your first step toward smarter, more focused training.',
    back: 'Back',
    footer: 'TRAIN · MOVE · EVOLVE',
  }

  useEffect(() => { if (screen !== 'welcome') headingRef.current?.focus() }, [screen])

  const toAccount = (selectedPath, mode = 'create') => {
    setPath(selectedPath)
    setAccountMode(mode)
    setScreen('account')
  }

  return (
    <main className="login-page pt650-gateway-page" dir={ar ? 'rtl' : 'ltr'} data-pt650-entry={screen}>
      <div className="pt650-gateway-sheen" aria-hidden="true" />
      <PT650EnergyArtwork />
      <div className="pt650-gateway-frame">
        <div className="pt650-gateway-top">
          <span className="pt650-gateway-monogram" aria-hidden="true"><Icon name="bolt" /></span>
          <span className="pt650-gateway-wordmark">PT<span>650</span></span>
          <span className="pt650-gateway-topline" aria-hidden="true" />
          <span className="pt650-gateway-edition">SPORT / TECH</span>
        </div>

        {screen === 'welcome' && (
          <section className="pt650-gateway-welcome" aria-label={copy.title + ' ' + copy.titleGlow}>
            <div className="pt650-gateway-welcome-copy">
              <div className="pt650-gateway-eyebrow"><span /> PT650 PERFORMANCE</div>
              <h1>{copy.title}<span>{copy.titleGlow}</span></h1>
              <p>{copy.tagline}</p>
              <div className="pt650-gateway-pulse-bar" aria-hidden="true"><i /><i /><i /></div>
            </div>
            <button type="button" className="pt650-gateway-start" onClick={() => setScreen('choices')}>
              <span>{copy.start}</span>
              <span className="pt650-gateway-start-icon" aria-hidden="true"><Icon name="chevronRight" /></span>
            </button>
          </section>
        )}

        {screen === 'choices' && (
          <section className="pt650-gateway-choices">
            <button className="pt650-gateway-back" type="button" onClick={() => setScreen('welcome')}>
              <Icon name="chevronLeft" /><span>{copy.back}</span>
            </button>
            <div className="pt650-gateway-step">01 / 02 — PT650</div>
            <h1 ref={headingRef} tabIndex={-1}>{copy.choices}</h1>
            <p className="pt650-gateway-lede">{copy.choicesText}</p>
            <div className="pt650-gateway-choice-grid">
              {PATHS.map((item, index) => (
                <button key={item.id} type="button" className={'pt650-gateway-choice tone-' + item.color}
                  data-pt650-choice={item.id} onClick={() => toAccount(item.id)}>
                  <span className="pt650-gateway-choice-number">0{index + 1}</span>
                  <span className="pt650-gateway-choice-icon" aria-hidden="true"><Icon name={item.icon} /></span>
                  <strong>{(ar ? item.ar : item.en)[0]}</strong>
                  <small>{(ar ? item.ar : item.en)[1]}</small>
                  <span className="pt650-gateway-choice-arrow" aria-hidden="true"><Icon name="chevronRight" /></span>
                </button>
              ))}
            </div>
            <button type="button" className="pt650-gateway-existing" onClick={() => toAccount(null, 'signin')}>{copy.signIn}</button>
          </section>
        )}

        {screen === 'account' && (
          <section className="pt650-gateway-account">
            <button className="pt650-gateway-back" type="button" onClick={() => setScreen('choices')}>
              <Icon name="chevronLeft" /><span>{copy.back}</span>
            </button>
            <div className="pt650-gateway-step">02 / 02 — PT650</div>
            <h1 ref={headingRef} tabIndex={-1}>{copy.account}</h1>
            <p className="pt650-gateway-lede">{copy.accountText}</p>
            {path && <span className="pt650-gateway-selected">
              <Icon name={PATHS.find(item => item.id === path)?.icon || 'target'} />
              {(ar ? PATHS.find(item => item.id === path)?.ar : PATHS.find(item => item.id === path)?.en)?.[0]}
            </span>}
            <div className="pt650-gateway-account-form" key={accountMode}>{renderAccount({ initialMode: accountMode })}</div>
          </section>
        )}

        <div className="pt650-gateway-bottom" aria-hidden="true"><span>PT650</span><span>{copy.footer}</span><span>© 2026</span></div>
      </div>
    </main>
  )
}
