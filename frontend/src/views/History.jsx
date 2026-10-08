import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { WorkoutRow, workoutDetailSheet, logPastWorkoutSheet } from '../sheets.jsx'
import { Button } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'

export default function History() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  return <div className="pt650-history-v5">
    <div className="hdr pt650-history-head"><button className="iconbtn" onClick={() => nav('/stats')} aria-label={t('Stats')}><Icon name="chevronLeft" /></button>
      <div className="pt650-history-title"><h1>{t('History')}</h1><div className="sub">{t('{0} workouts', S.workouts.length)}</div></div></div>

    <div className="pt650-history-summary">
      <div><span>{t('Workouts')}</span><strong>{S.workouts.length}</strong></div>
      <Button className="pt650-history-add" icon="plus" onClick={logPastWorkoutSheet}>{t('Log a past workout')}</Button>
    </div>

    {S.workouts.length ? <div className="list pt650-history-list">{[...S.workouts].reverse().map(w => <WorkoutRow key={w.id} w={w} onClick={() => workoutDetailSheet(w)} />)}</div>
      : <div className="empty pt650-history-empty"><div className="ico"><Icon name="history" /></div>{t('No workouts yet.')}</div>}
  </div>
}
