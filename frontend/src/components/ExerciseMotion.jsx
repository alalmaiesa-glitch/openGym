import { exerciseNameFor } from '../lib/i18n.js'

// Original, dependency-free schematic motion used only when the optional exercise media is absent.
// It deliberately communicates the movement pattern rather than pretending to be a licensed,
// exercise-specific coaching animation.
export function motionKindFor(ex) {
  const name = String(ex?.n || '').toLowerCase()
  if (/side bend|lateral bend|side flex/.test(name)) return 'sidebend'
  if (/squat|wall sit/.test(name)) return 'squat'
  if (/lunge|split squat|step[- ]?up/.test(name)) return 'lunge'
  if (/deadlift|good morning|hip hinge|hyperextension|back extension/.test(name)) return 'hinge'
  if (/curl/.test(name)) return 'curl'
  if (/row|pull[- ]?up|chin[- ]?up|pulldown|face pull/.test(name)) return 'pull'
  if (/press|push[- ]?up|dip|extension|raise|fly/.test(name)) return 'press'
  if (/run|walk|bike|cycling|jump|cardio|climb/.test(name) || ex?.bp === 'cardio') return 'cardio'
  if (/crunch|sit[- ]?up|twist|plank|rollout/.test(name) || ex?.bp === 'waist') return 'core'
  return 'generic'
}

export default function ExerciseMotion({ ex }) {
  const kind = motionKindFor(ex)
  return (
    <div className={'exmotion motion-' + kind} role="img" aria-label={exerciseNameFor(ex)}>
      <svg viewBox="0 0 240 210" aria-hidden="true" focusable="false">
        <path className="motion-track" d="M52 190 H188" />
        <path className="motion-guide motion-guide-side" d="M82 74 Q120 43 158 74" />
        <path className="motion-guide motion-guide-vert" d="M120 42 V170" />

        <g className="motion-figure">
          <g className="motion-lower">
            <circle className="motion-joint" cx="120" cy="132" r="5" />
            <path className="motion-leg motion-leg-l" d="M117 134 L96 164 L91 193" />
            <path className="motion-leg motion-leg-r" d="M123 134 L145 164 L151 193" />
            <path className="motion-foot" d="M77 194 H96 M145 194 H163" />
          </g>

          <g className="motion-upper">
            <circle className="motion-head" cx="120" cy="48" r="16" />
            <path className="motion-spine" d="M120 66 L120 130" />
            <path className="motion-shoulders" d="M92 80 H148" />

            <g className="motion-arm motion-arm-l">
              <path d="M95 82 L78 108" />
              <g className="motion-forearm motion-forearm-l">
                <path d="M78 108 L70 137" />
                <circle className="motion-hand" cx="69" cy="140" r="4" />
              </g>
            </g>
            <g className="motion-arm motion-arm-r">
              <path d="M145 82 L162 108" />
              <g className="motion-forearm motion-forearm-r">
                <path d="M162 108 L170 137" />
                <circle className="motion-hand" cx="171" cy="140" r="4" />
              </g>
            </g>
          </g>
        </g>

        <g className="motion-dumbbells">
          <path d="M57 140 H81 M159 140 H183" />
          <path d="M59 133 V147 M64 133 V147 M176 133 V147 M181 133 V147" />
        </g>
      </svg>
    </div>
  )
}
