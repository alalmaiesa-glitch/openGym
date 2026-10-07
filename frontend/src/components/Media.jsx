import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import CustomMedia, { CustomThumb } from './CustomMedia.jsx'
import PT650AnimationProviderMedia, { providerAssetId } from './PT650AnimationProviderMedia.jsx'
import { animationCandidatesFor, hasAnimationFor } from './pt650-animation-provider.js'

// Built-in PT650 exercise instruction media never loads the inherited real-person image/GIF
// library. The page asks the provider layer for an exercise-specific approved asset and does not
// know whether it came from PT650/OpenGym3D, authored SVG, Workout Guide or a future licensed
// provider. If nothing approved is ready, the detail sheet shows no demo rather than a generic
// human figure that could be mistaken for the exercise. User-created exercises remain separate.
export default function Media(p) {
  return p.ex?.custom ? <CustomMedia {...p} /> : <BuiltinMedia {...p} />
}

function MediaCredit({ candidate }) {
  if (!candidate?.attributionRequired) return null
  const upstream = candidate.attribution?.upstream?.name
  const creator = candidate.attribution?.creator || candidate.providerName
  const label = upstream ? `${creator} / ${upstream}` : creator
  return (
    <div className="pt650-media-credit" onClick={e => e.stopPropagation()} title={candidate.pt650Changes || undefined}>
      <a href={candidate.attribution?.creatorUrl || candidate.source} target="_blank" rel="noopener noreferrer">{label}</a>
      <span>·</span>
      <a href={candidate.licenceUrl || candidate.source} target="_blank" rel="noopener noreferrer">{candidate.licence}</a>
    </div>
  )
}

function BuiltinMedia({ ex, id, compact, minimizable }) {
  const [playing, setPlaying] = useState(true)
  const gifSize = useStore(s => s.S.gifSize)
  const update = useStore(s => s.update)
  if (!ex) return null
  if (minimizable && gifSize === 'off') return null

  const mini = minimizable && gifSize === 'mini'
  const candidates = animationCandidatesFor(ex.id).filter(candidate => candidate.available)
  const selected = candidates[0] || null
  if (!selected) return null

  const toggleSize = e => {
    e.stopPropagation()
    update(s => { s.gifSize = mini ? 'full' : 'mini' })
  }
  const onTap = () => setPlaying(p => !p)

  return (
    <div
      className={'exmedia pt650-built-in-media has-model' + (compact ? ' compact' : '') + (mini ? ' mini' : '')}
      id={id}
      onClick={selected.renderer === 'three' ? undefined : onTap}
      data-exercise-id={ex.id}
      data-pt650-media={providerAssetId(selected)}
      data-pt650-provider={selected.provider}
      data-pt650-renderer={selected.renderer}
    >
      <PT650AnimationProviderMedia
        candidates={candidates}
        playing={playing}
        onTogglePlaying={() => setPlaying(p => !p)}
      />
      <MediaCredit candidate={selected} />
      {minimizable && (
        <button className="giftoggle" onClick={toggleSize}>
          <Icon name={mini ? 'expand' : 'minimize'} />{mini ? t('Expand') : t('Minimize')}
        </button>
      )}
      {!mini && selected.renderer !== 'three' && (
        <span className="gifhint">
          <Icon name={playing ? 'pause' : 'play'} />{playing ? t('tap to pause') : t('tap to play')}
        </span>
      )}
    </div>
  )
}

// Built-in thumbnails never load the inherited catalogue. Approved provider assets get a play
// marker; exercises still awaiting an approved mapping use a neutral dumbbell tile.
export function Thumb(p) {
  return p.ex?.custom ? <CustomThumb {...p} /> : <BuiltinThumb {...p} />
}

function BuiltinThumb({ ex }) {
  const ready = hasAnimationFor(ex?.id)
  return (
    <div className={'thumb thumb-x pt650-thumb' + (ready ? ' ready' : '')} data-pt650-media={ready ? 'animated' : 'unavailable'}>
      <Icon name={ready ? 'play' : 'dumbbell'} />
    </div>
  )
}
