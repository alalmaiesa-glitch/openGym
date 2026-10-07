import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { effectiveRoutines, effectiveRoutineIds, nextTrainingDay, streakWeeks, lastBW, setsDoneActive } from '../lib/history.js'
import { fmtNum, fmtDate, fmtDateRange, todayISO, isoOf, weekKey, weekStartOf, weekDayOffset, DAYS, DAYN } from '../lib/format.js'
import { t, dateLocale } from '../lib/i18n.js'
import { getLang } from '../lib/i18n-core.js'
import { bwSheet, goalSheet, dayOverrideSheet, calendarSheet, startFlow, starterPlanSheet, bwDeltaColor, weighInsSheet } from '../sheets.jsx'
import LineChart from '../components/LineChart.jsx'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import { tappable } from '../lib/use-sheet-keyboard.js'
import { usePlatformIdentity } from '../lib/platform-identity.js'
import { glyphOf } from '../lib/glyphs.js'

// Home = what to do now + a quick glance. Deep charts & history live in Stats.
export default function Home() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const platformIdentity = usePlatformIdentity()
  const platformEmail = platformIdentity.session?.user?.email || ''
  const platformName = platformEmail ? platformEmail.split('@')[0] : ''
  const [weekOffset, setWeekOffset] = useState(0)
  const machineScanAr = String(getLang()).toLowerCase().startsWith('ar')

  const today = new Date()
  // A weekday can hold several routines. `todayRoutines` is the whole day; `routine` is the
  // first, kept for the one-routine glyph. The derived session name joins them (§9).
  const todayRoutines = effectiveRoutines(S, todayISO())
  const routine = todayRoutines[0] || null
  const todayName = todayRoutines.map(r => r.name).join(' + ')
  const todayOvr = S.dayPlan[todayISO()] !== undefined
  // An open editor on a saved workout (lib/session-edit.js) holds S.active too, but it is not a
  // session in progress: the row takes you back to it as an edit, the way the tab bar does.
  const editingSaved = !!S.active?.editingWorkoutId
  // On a rest day, saying when you train next beats leaving the row as a full stop.
  const next = !S.active && !todayRoutines.length ? nextTrainingDay(S, todayISO()) : null
  const bw = lastBW(S)
  const prevBW = S.bodyweight.length > 1 ? S.bodyweight[S.bodyweight.length - 2] : null
  const delta = bw && prevBW ? bw.w - prevBW.w : null

  const ws = weekStartOf(S)
  // The first day of the shown week. Named for the role, not for Monday — which day that is
  // is the setting.
  const wkStart = new Date(today)
  wkStart.setDate(today.getDate() - weekDayOffset(today.getDay(), ws) + weekOffset * 7)
  const doneDays = new Set(S.workouts.map(w => w.d))
  // The last session logged for today, if any — what the row below reports instead of asking
  // you to start the one you already did. Last wins, so a second session names itself.
  const doneToday = S.workouts.filter(w => w.d === todayISO()).at(-1) || null
  const strip = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(wkStart); d.setDate(wkStart.getDate() + i)
    const iso = isoOf(d)
    const eff = effectiveRoutineIds(S, iso).length > 0, ovr = S.dayPlan[iso] !== undefined, done = doneDays.has(iso)
    const dot = done ? ' done' : ovr && eff ? ' ovr' : eff ? ' plan' : ''
    strip.push(<div key={i} className={'wday' + (iso === todayISO() ? ' today' : '')} {...tappable(() => dayOverrideSheet(iso))}>
      <div className="lbl">{t(DAYS[d.getDay()])}</div><div className="num">{d.getDate()}</div><div className={'dot' + dot} /></div>)
  }
  const wkEnd = new Date(wkStart); wkEnd.setDate(wkStart.getDate() + 6)
  const wkLabel = weekOffset === 0 ? t('This week') : fmtDateRange(isoOf(wkStart), isoOf(wkEnd))

  const wThisWeek = S.workouts.filter(w => weekKey(w.d, ws) === weekKey(todayISO(), ws)).length
  // Days scheduled, not routines — a combined day counts as 1, matching wThisWeek (one w).
  const plannedPerWeek = Object.values(S.week).filter(ids => ids?.length).length
  const bwPoints = S.bodyweight.slice(-30).map(b => ({ t: b.t || new Date(b.d).getTime(), y: b.w, d: b.d }))

  // today's session shown right under the week strip
  const onToday = () => { if (S.active) nav('/workout'); else if (todayRoutines.length) startFlow(effectiveRoutineIds(S, todayISO())); else dayOverrideSheet(todayISO()) }

  const greeting = user
    ? t('Hi {0}', user.name)
    : platformName
      ? (machineScanAr ? 'مرحبًا ' : 'Hi ') + platformName
      : (machineScanAr ? 'جاهز للتمرين؟' : 'Ready to train?')

  return <div className="narrow pt650-home-v1">
    <header className="pt650-home-head">
      <div className="pt650-brand-lockup">
        <div className="pt650-brand-mark"><Icon name="bolt" /></div>
        <div>
          <h1>PT650</h1>
          <div className="pt650-home-kicker">{greeting}</div>
        </div>
      </div>
      <button className="pt650-head-action" onClick={() => nav('/settings')} aria-label={t('Settings')}><Icon name="gear" /></button>
    </header>

    <section className="pt650-today-shell">
      <div className="pt650-today-topline">
        <span>{t('Today')}</span>
        <span>{today.toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' })}</span>
      </div>

      <div className="today-row pt650-today-card" {...tappable(onToday)}>
        <div className="pt650-today-copy">
          <span className={'pt650-status-dot' + (S.active ? ' live' : doneToday ? ' done' : routine ? ' ready' : '')} />
          <div>
            <div className="lbl2">{S.active ? (editingSaved ? t('Edit') : t('Resume')) : doneToday ? t('Done') : routine ? t('Start') : t('Rest day')}</div>
            <div className="ttl">{S.active ? (editingSaved ? S.active.name : t('{0} — in progress', S.active.name))
              : doneToday ? (doneToday.name ? t('{0} — done', doneToday.name) : t('Workout done'))
              : routine ? todayName : t('Rest day')}{todayOvr && routine && !doneToday ? ' · ' + t('rescheduled') : ''}</div>
            {next && !doneToday && <div className="ss">{t('Next session: {0}, {1}', t(DAYN[next.weekday]), next.routine.name)}</div>}
          </div>
        </div>
        <span className="pt650-today-go"><Icon name={S.active ? (editingSaved ? 'pencil' : 'play') : doneToday ? 'check' : routine ? 'dumbbell' : 'plus'} /></span>
      </div>

      {!S.active && <button className="pt650-alt-workout" onClick={() => nav('/workout')}>
        <Icon name="reset" /> <span>{t('Choose a different workout')}</span>
      </button>}

      <div className="pt650-performance-strip">
        <div><strong>{wThisWeek}{plannedPerWeek ? '/' + plannedPerWeek : ''}</strong><span>{machineScanAr ? 'هذا الأسبوع' : 'This week'}</span></div>
        <div><strong>{streakWeeks(S)}</strong><span>{machineScanAr ? 'سلسلة الأسابيع' : 'Week streak'}</span></div>
        <div><strong>{bw ? fmtNum(bw.w) : '—'}</strong><span>{bw ? S.unit : (machineScanAr ? 'الوزن' : 'Weight')}</span></div>
      </div>
    </section>

    <section className="pt650-module-grid" aria-label={machineScanAr ? 'الوحدات الرئيسية' : 'Main modules'}>
      <button className="pt650-module-card" onClick={() => nav('/plan')}>
        <span className="pt650-module-icon"><Icon name="calendar" /></span>
        <span className="pt650-module-copy"><strong>{t('Plan')}</strong><small>{machineScanAr ? 'خطتك الأسبوعية' : 'Weekly training'}</small></span>
        <Icon name="chevronRight" className="pt650-module-chevron" />
      </button>
      <button className="pt650-module-card" onClick={() => nav('/library')}>
        <span className="pt650-module-icon"><Icon name="list" /></span>
        <span className="pt650-module-copy"><strong>{t('Exercises')}</strong><small>{machineScanAr ? 'المكتبة والحركات' : 'Library & movement'}</small></span>
        <Icon name="chevronRight" className="pt650-module-chevron" />
      </button>
      <button className="pt650-module-card machine" onClick={() => nav('/machine-scan')}>
        <span className="pt650-module-icon"><Icon name="camera" /></span>
        <span className="pt650-module-copy"><strong>{machineScanAr ? 'مسح الجهاز' : 'Machine Scan'}</strong><small>{machineScanAr ? 'تقنية · ضبط · حمل' : 'Technique · setup · load'}</small></span>
        <Icon name="chevronRight" className="pt650-module-chevron" />
      </button>
      <button className="pt650-module-card move" onClick={() => nav('/move')}>
        <span className="pt650-module-icon"><Icon name="figureRun" /></span>
        <span className="pt650-module-copy"><strong>PT650 Move</strong><small>{machineScanAr ? 'تحرّك واكسب وصولك' : 'Move and earn access'}</small></span>
        <Icon name="chevronRight" className="pt650-module-chevron" />
      </button>
    </section>

    <button className="pt650-health-ribbon" onClick={() => nav('/health')}>
      <span className="pt650-health-ribbon-icon"><Icon name="heart" /></span>
      <span><strong>PT650 Health</strong><small>{machineScanAr ? 'الصحة والنشاط والوزن في سجل واحد' : 'Health, activity and weight in one record'}</small></span>
      <Icon name="chevronRight" />
    </button>

    <section className="pt650-week-panel">
      <div className="pt650-week-head">
        <button className="iconbtn" onClick={() => setWeekOffset(w => w - 1)} aria-label={t('Previous week')}><Icon name="chevronLeft" /></button>
        <span>{wkLabel}</span>
        <button className="iconbtn" onClick={() => setWeekOffset(w => w + 1)} aria-label={t('Next week')}><Icon name="chevronRight" /></button>
      </div>
      <div className="week">{strip}</div>
    </section>

    {S.checkIn !== false && <button className="pt650-utility-row" onClick={() => nav('/checkin')}>
      <span className="pt650-utility-icon"><Icon name="qr" /></span>
      <span><strong>{t('Check in')}</strong><small>{t('At the gym')}</small></span>
      <Icon name="chevronRight" />
    </button>}

    {!S.routines.length && !S.active && <section className="pt650-setup-card">
      <span className="pt650-setup-icon"><Icon name="sparkles" /></span>
      <div>
        <strong>{t('Welcome!')}</strong>
        <p>{t('Set up your weekly routine to get going — or load a ready-made starter plan.')}</p>
      </div>
      <div className="pt650-setup-actions">
        <Button size="sm" variant="primary" icon="sparkles" onClick={starterPlanSheet}>{t('Load starter plan')}</Button>
        <Button size="sm" onClick={() => nav('/plan')}>{t('Build my own plan')}</Button>
      </div>
    </section>}

    {S.showWeightCard !== false && <section className="card pt650-weight-card">
      <div className="row between bw-head">
        <h2>{t('Body weight')}</h2>
        <div className="row" style={{ gap: 8 }}>
          <Button size="sm" icon="target" style={S.targetW ? { color: 'var(--yellow)' } : undefined} onClick={goalSheet}>{S.targetW ? fmtNum(S.targetW) : t('Goal')}</Button>
          <Button size="sm" icon="plus" onClick={() => bwSheet()}>{t('Log')}</Button>
        </div>
      </div>
      {bw ? <>
        <div className="pt650-weight-value">
          <strong>{fmtNum(bw.w)} <span>{S.unit}</span></strong>
          {!!delta && <small style={{ color: bwDeltaColor(delta, bw.w) }}><Icon name={delta > 0 ? 'arrowUp' : 'arrowDown'} /> {fmtNum(Math.abs(delta))}</small>}
          <em>{fmtDate(bw.d, true)}</em>
        </div>
        {S.targetW && <div className="small row pt650-weight-goal"><Icon name="target" /> <span>{t('Goal')} {fmtNum(S.targetW)} {S.unit}</span></div>}
        <div className="chart pt650-weight-chart"><LineChart points={bwPoints} h={110} unit={S.unit} goal={S.targetW} /></div>
        <Button size="sm" variant="ghost" trailingIcon="chevronRight" onClick={weighInsSheet}>{t('All weigh-ins')}</Button>
      </> : <div className="muted small">{S.weighIn === false
        ? t('No entries yet — log your weight to start the curve.')
        : t("No entries yet — log your weight to start the curve. It's also asked before every workout.")}</div>}
    </section>}

    <button className="pt650-streak-footer" onClick={() => calendarSheet()}>
      <span><Icon name="flame" /><strong>{t('{0} week streak', streakWeeks(S))}</strong></span>
      <small>{wThisWeek}{plannedPerWeek ? ' / ' + plannedPerWeek : ''} {t('this week')} · {t(S.workouts.length === 1 ? '{0} workout total' : '{0} workouts total', S.workouts.length)}</small>
      <Icon name="calendar" />
    </button>
  </div>
}
