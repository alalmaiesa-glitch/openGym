import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { CATALOGUE, BODYPARTS, EXIDX, allExercises, equipmentOf, searchExercises } from '../lib/exercises.js'
import { MUSCLE_NAME } from '../lib/muscles.js'
import { activeProfile, exAvailable } from '../lib/equipment.js'
import { bestWeightFor } from '../lib/history.js'
import { fmtNum, exCount } from '../lib/format.js'
import { t, exerciseNameFor, exerciseNameClass } from '../lib/i18n.js'
import { exerciseDetailSheet, addToRoutineSheet, customExSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import { hasAnimationFor } from '../components/pt650-animation-provider.js'
import { tappable, useRevealActiveChip } from '../lib/use-sheet-keyboard.js'
import { isFav, sortFavouritesFirst } from '../lib/favourites.js'

export default function Library() {
  const nav = useNavigate()
  const loc = useLocation()
  const S = useStore(s => s.S)
  const deepLinkOpened = useRef('')
  const [q, setQ] = useState('')
  const [bp, setBp] = useState('')
  const [eq, setEq] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)   // ignore the active equipment profile for this session
  const [shown, setShown] = useState(24)
  const bpStrip = useRef(null), eqStrip = useRef(null)
  const profile = activeProfile(S)
  const base = searchExercises(allExercises(S).filter(e => !bp || e.bp === bp), q)
  const eqFiltered = (profile && !showAll) ? base.filter(e => exAvailable(S, e)) : base
  const eqOpts = equipmentOf(eqFiltered)
  // Drop the equipment filter if the search narrowed it away, so you never hit a dead end.
  const eqOn = eqOpts.includes(eq) ? eq : ''
  // Favourites float to the top of whatever the filters left (issue #6), the rest keeps its order.
  const f = sortFavouritesFirst(eqOn ? eqFiltered.filter(e => e.eq === eqOn) : eqFiltered, S)
  useRevealActiveChip(bpStrip, bp)
  useRevealActiveChip(eqStrip, eqOn)

  const profileFiltered = !!(profile && !showAll)
  const filterCount = (bp ? 1 : 0) + (eqOn ? 1 : 0) + (profileFiltered ? 1 : 0)
  const narrowed = !!(q.trim() || filterCount)
  const clearBodyPart = () => { setBp(''); setEq(''); setShown(24) }
  const clearEquipment = () => { setEq(''); setShown(24) }

  // A shared PT650 exercise URL may target a built-in exercise directly. The Library remains
  // the route so browser/back behavior stays unchanged; the normal detail sheet opens once.
  useEffect(() => {
    const id = new URLSearchParams(loc.search).get('exercise') || ''
    if (!id || deepLinkOpened.current === id) return
    const exercise = EXIDX[id]
    if (!exercise) return
    deepLinkOpened.current = id
    exerciseDetailSheet(exercise)
  }, [loc.search])

  return <div className="library-page">
    <section className="library-hero">
      <div className="library-headline">
        <div className="library-title-group">
          <span className="library-title-mark"><Icon name="dumbbell" /></span>
          <div>
            <h1>{t('Exercises')}</h1>
            <div className="library-total">{exCount(CATALOGUE.length)}</div>
          </div>
        </div>

        <div className="library-head-actions">
          <Button size="sm" variant="tinted" icon="target" onClick={() => nav('/muscles')}>{t('By muscle')}</Button>
          <button className="library-create" {...tappable(() => customExSheet(null, ex => exerciseDetailSheet(ex), q.trim()))}>
            <Icon name="sparkles" />
            <span>{t('Create your own exercise')}</span>
            <Icon name="plus" className="library-create-plus" />
          </button>
        </div>
      </div>

      <div className="library-controls">
        <div className="library-search-row">
          <div className={'search library-search' + (narrowed ? ' has-count' : '')}>
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
            <input className="input" placeholder={t('Search…')} value={q} onChange={e => { setQ(e.target.value); setShown(24) }} />
            {narrowed && <span className="search-count" role="status" aria-label={exCount(f.length)}>{fmtNum(f.length)}</span>}
          </div>
          <button
            className={'library-filter-toggle' + (filtersOpen ? ' on' : '')}
            aria-expanded={filtersOpen}
            aria-label={t('Any equipment')}
            title={t('Any equipment')}
            onClick={() => setFiltersOpen(v => !v)}
          >
            <Icon name="filter" />
            {filterCount > 0 && <span className="library-filter-badge">{fmtNum(filterCount)}</span>}
          </button>
        </div>

        {!filtersOpen && (bp || eqOn) && <div className="library-active-filters">
          {bp && <button className="library-active-chip" onClick={clearBodyPart}>
            <span>{t(bp)}</span><Icon name="xmark" />
          </button>}
          {eqOn && <button className="library-active-chip" onClick={clearEquipment}>
            <span>{t(eqOn)}</span><Icon name="xmark" />
          </button>}
        </div>}

        {filtersOpen && <div className="library-filter-panel">
          {profile && <div className="small dim row library-profile">
            <Icon name="dumbbell" style={{ fontSize: 13 }} />
            <span className="library-profile-text">
              {showAll ? t('Showing all equipment') : t('Showing what you have in "{0}"', profile.name)}
            </span>
            <button className="chip nocap" onClick={() => setShowAll(v => !v)}>
              {showAll ? t('Filter by "{0}"', profile.name) : t('Show all equipment')}
            </button>
          </div>}

          <div className="chips library-chips" ref={bpStrip}>
            <button className={'chip nocap' + (!bp ? ' on' : '')} onClick={clearBodyPart}>{t('All')}</button>
            {BODYPARTS.map(b => <button key={b} className={'chip' + (bp === b ? ' on' : '')} onClick={() => { setBp(b); setShown(24) }}>{t(b)}</button>)}
          </div>

          {eqOpts.length > 1 && <div className="chips library-chips" ref={eqStrip}>
            <button className={'chip nocap' + (!eqOn ? ' on' : '')} onClick={clearEquipment}>{t('Any equipment')}</button>
            {eqOpts.map(x => <button key={x} className={'chip' + (eqOn === x ? ' on' : '')} onClick={() => { setEq(x); setShown(24) }}>{t(x)}</button>)}
          </div>}
        </div>}
      </div>
    </section>

    <div className="list library-list">
      {f.slice(0, shown).map(e => {
        const best = bestWeightFor(S, e.id)
        const hasDemo = hasAnimationFor(e.id)
        return <div key={e.id} className={'item library-item' + (hasDemo ? ' has-demo' : '')} {...tappable(() => exerciseDetailSheet(e))}>
          {hasDemo && <div className="library-card-mark" aria-hidden="true"><Icon name="play" /></div>}
          <div className="grow">
            <div className={`tt library-name ${exerciseNameClass(e)}`}>{isFav(S, e.id) && <Icon name="starFill" className="fav-star" />}{exerciseNameFor(e)}</div>
            <div className="ss library-meta capitalize">{t(MUSCLE_NAME[e.tg] || e.tg || e.bp)}<span>·</span>{t(e.eq)}</div>
          </div>
          <div className="library-actions">
            {best > 0 && <span className="tag acc">{fmtNum(best)}</span>}
            <button className="library-add" aria-label={t('Add to routine')} onClick={ev => { ev.stopPropagation(); addToRoutineSheet(e) }}><Icon name="plus" /></button>
          </div>
        </div>
      })}
      {f.length === 0 && <div className="empty"><div className="ico"><Icon name="magnifier" /></div>{t('No match')}</div>}
    </div>
    {f.length > shown && <><div style={{ height: 14 }} /><Button onClick={() => setShown(s => s + 24)}>{t('Show more')}</Button></>}
  </div>
}
