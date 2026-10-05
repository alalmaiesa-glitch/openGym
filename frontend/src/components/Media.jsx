import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import CustomMedia, { CustomThumb } from './CustomMedia.jsx'
import PT650ExerciseAnimation, { animatedModelFor } from './PT650ExerciseAnimation.jsx'
import PT650ThreeExercise from './PT650ThreeExercise.jsx'
import { threeDModelFor } from './pt650-3d-registry.js'

// Built-in PT650 exercise instruction media never loads the inherited real-person image/GIF
// library. Only approved, exercise-specific PT650 animations render here. If a movement does
// not have its own approved animation yet, the detail sheet shows no demo rather than a generic
// human figure that could be mistaken for the exercise. User-created exercises remain separate.
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
  const model3d = threeDModelFor(ex.id)
  const model2d = animatedModelFor(ex.id)
  const model = model3d || model2d
  if (!model) return null

  const toggleSize = e => {
    e.stopPropagation()
    update(s => { s.gifSize = mini ? 'full' : 'mini' })
  }
  const onTap = () => setPlaying(p => !p)

  return (
    <div
      className={'exmedia pt650-built-in-media has-model' + (compact ? ' compact' : '') + (mini ? ' mini' : '')}
      id={id}
      onClick={onTap}
      data-exercise-id={ex.id}
      data-pt650-media={model.id}
    >
      {model3d
        ? <PT650ThreeExercise
            model={model3d}
            playing={playing}
            fallback={<PT650ExerciseAnimation exerciseId={ex.id} playing={playing} />}
          />
        : <PT650ExerciseAnimation exerciseId={ex.id} playing={playing} />}
      {minimizable && (
        <button className="giftoggle" onClick={toggleSize}>
          <Icon name={mini ? 'expand' : 'minimize'} />{mini ? t('Expand') : t('Minimize')}
        </button>
      )}
      {!mini && (
        <span className="gifhint">
          <Icon name={playing ? 'pause' : 'play'} />{playing ? t('tap to pause') : t('tap to play')}
        </span>
      )}
    </div>
  )
}

// Built-in thumbnails never load the inherited catalogue. Approved animations get a play
// marker; exercises still awaiting animation use a neutral dumbbell tile only in the compact list.
export function Thumb(p) {
  return p.ex?.custom ? <CustomThumb {...p} /> : <BuiltinThumb {...p} />
}

function BuiltinThumb({ ex }) {
  const ready = !!(threeDModelFor(ex?.id) || animatedModelFor(ex?.id))
  return (
    <div className={'thumb thumb-x pt650-thumb' + (ready ? ' ready' : '')} data-pt650-media={ready ? 'animated' : 'unavailable'}>
      <Icon name={ready ? 'play' : 'dumbbell'} />
    </div>
  )
}
