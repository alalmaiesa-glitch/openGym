import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import CustomMedia, { CustomThumb } from './CustomMedia.jsx'
import PT650ExerciseAnimation, { animatedModelFor } from './PT650ExerciseAnimation.jsx'

// Built-in PT650 exercise instruction media never loads the inherited real-person image/GIF
// library. Approved PT650-authored animation models render here; everything else gets the
// neutral schematic fallback until an exercise-specific model is approved. User-created
// exercises remain separate and may show the user's own private media.
export default function Media(p) {
  return p.ex?.custom ? <CustomMedia {...p} /> : <BuiltinMedia {...p} />
}

function BuiltinMedia({ ex, id, compact, minimizable }) {
  const [playing, setPlaying] = useState(true)
  const gifSize = useStore(s => s.S.gifSize)
  const update = useStore(s => s.update)
  if (!ex) return null
  if (minimizable && gifSize === 'off') return null

  const mini = minimizable && gifSize === 'mini'
  const model = animatedModelFor(ex.id)
  const toggleSize = e => {
    e.stopPropagation()
    update(s => { s.gifSize = mini ? 'full' : 'mini' })
  }
  const onTap = model ? () => setPlaying(p => !p) : undefined

  return (
    <div
      className={'exmedia pt650-built-in-media' + (compact ? ' compact' : '') + (mini ? ' mini' : '') + (model ? ' has-model' : ' schematic')}
      id={id}
      onClick={onTap}
      data-exercise-id={ex.id}
      data-pt650-media={model?.id || 'schematic-fallback'}
    >
      <PT650ExerciseAnimation exerciseId={ex.id} playing={playing} />
      {minimizable && (
        <button className="giftoggle" onClick={toggleSize}>
          <Icon name={mini ? 'expand' : 'minimize'} />{mini ? t('Expand') : t('Minimize')}
        </button>
      )}
      {!mini && model && (
        <span className="gifhint">
          <Icon name={playing ? 'pause' : 'play'} />{playing ? t('tap to pause') : t('tap to play')}
        </span>
      )}
    </div>
  )
}

// Built-in thumbnails are schematic too: the original catalogue still carries legacy img/gif
// filenames for data compatibility, but PT650 does not request those files anywhere in the UI.
export function Thumb(p) {
  return p.ex?.custom ? <CustomThumb {...p} /> : <BuiltinThumb {...p} />
}

function BuiltinThumb({ ex }) {
  const ready = !!animatedModelFor(ex?.id)
  return (
    <div className={'thumb thumb-x pt650-thumb' + (ready ? ' ready' : '')} data-pt650-media={ready ? 'animated' : 'schematic'}>
      <Icon name={ready ? 'play' : 'dumbbell'} />
    </div>
  )
}
