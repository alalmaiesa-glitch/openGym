import { useEffect, useRef } from 'react'

export const PT650_ANIMATION_MODELS = Object.freeze({
  '0025': Object.freeze({
    id: 'bench-press-v1',
    exercise: 'barbell bench press',
    medium: 'authored-svg-motion',
    provenance: 'PT650 original',
    version: 1,
  }),
})

export const animatedModelFor = exerciseId => PT650_ANIMATION_MODELS[String(exerciseId || '')] || null

function BenchPressAnimation({ playing }) {
  const svgRef = useRef(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    try {
      if (playing) svg.unpauseAnimations?.()
      else svg.pauseAnimations?.()
    } catch {
      // Browsers without the SVG animation control API simply keep the loop running.
    }
  }, [playing])

  return (
    <svg
      ref={svgRef}
      className="pt650-anim-svg"
      viewBox="0 0 640 360"
      role="img"
      aria-label="Animated barbell bench press demonstration"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="pt650-floor" x1="0" x2="1">
          <stop offset="0" stopColor="#111418" />
          <stop offset=".5" stopColor="#1a1f24" />
          <stop offset="1" stopColor="#111418" />
        </linearGradient>
      </defs>

      <rect width="640" height="360" fill="#090b0d" />
      <ellipse cx="320" cy="306" rx="252" ry="18" fill="url(#pt650-floor)" opacity=".9" />

      {/* Rack and bench: deliberately schematic so the demo reads as animation, never footage. */}
      <g className="pt650-equipment" fill="none" stroke="rgba(225,231,238,.34)" strokeWidth="8" strokeLinecap="round">
        <path d="M150 104V292M434 104V292" />
        <path d="M132 104H178M410 104H456" />
        <path d="M184 246H430" strokeWidth="18" />
        <path d="M218 255L198 300M396 255L416 300" />
      </g>

      {/* Stylised digital athlete — geometric, non-photorealistic, and PT650-authored. */}
      <g className="pt650-athlete" fill="none" stroke="#d7dde3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="182" cy="211" r="23" fill="#b9c1c9" stroke="none" />
        <path d="M209 218Q278 217 366 228" strokeWidth="26" />
        <path d="M360 228L425 205L469 253" strokeWidth="21" />
        <path d="M469 253L505 275" strokeWidth="17" />
        <path d="M424 205L475 221" strokeWidth="17" />
        <circle cx="507" cy="276" r="8" fill="#d7dde3" stroke="none" />
        <circle cx="478" cy="222" r="8" fill="#d7dde3" stroke="none" />
      </g>

      {/* Chest target highlight. */}
      <path d="M232 206Q266 193 302 207Q270 232 232 218Z" fill="var(--acc)" opacity=".72" />

      {/* One visible articulated arm is enough in side profile; the path morphs through a realistic press arc. */}
      <path d="M263 202L272 145L292 99" fill="none" stroke="#d7dde3" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round">
        <animate
          attributeName="d"
          values="M263 202L272 145L292 99;M263 202L235 169L291 154;M263 202L272 145L292 99"
          keyTimes="0;0.5;1"
          dur="2.8s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines=".35 0 .2 1;.35 0 .2 1"
        />
      </path>
      <circle r="9" fill="#d7dde3">
        <animate attributeName="cx" values="272;235;272" dur="2.8s" repeatCount="indefinite" />
        <animate attributeName="cy" values="145;169;145" dur="2.8s" repeatCount="indefinite" />
      </circle>

      {/* Bar and plates travel vertically with the hand. */}
      <g className="pt650-bar" stroke="#eef2f5" strokeLinecap="round">
        <line x1="166" x2="420" y1="96" y2="96" strokeWidth="8">
          <animate attributeName="y1" values="96;151;96" dur="2.8s" repeatCount="indefinite" />
          <animate attributeName="y2" values="96;151;96" dur="2.8s" repeatCount="indefinite" />
        </line>
        <rect x="183" y="78" width="14" height="36" rx="4" fill="#7f8994" stroke="none">
          <animate attributeName="y" values="78;133;78" dur="2.8s" repeatCount="indefinite" />
        </rect>
        <rect x="389" y="78" width="14" height="36" rx="4" fill="#7f8994" stroke="none">
          <animate attributeName="y" values="78;133;78" dur="2.8s" repeatCount="indefinite" />
        </rect>
        <circle cx="292" cy="98" r="8" fill="#d7dde3" stroke="none">
          <animate attributeName="cy" values="98;153;98" dur="2.8s" repeatCount="indefinite" />
        </circle>
      </g>

      <g className="pt650-motion-guide" opacity=".28" fill="none" stroke="var(--acc)" strokeWidth="3" strokeLinecap="round">
        <path d="M337 92V157" strokeDasharray="5 8" />
        <path d="M329 103L337 91L345 103M329 145L337 157L345 145" />
      </g>
    </svg>
  )
}

function SchematicFallback() {
  return (
    <svg className="pt650-anim-svg pt650-fallback-svg" viewBox="0 0 640 360" aria-hidden="true">
      <rect width="640" height="360" fill="#090b0d" />
      <g transform="translate(320 177)" fill="none" stroke="rgba(225,231,238,.42)" strokeWidth="10" strokeLinecap="round">
        <circle cx="0" cy="-72" r="25" fill="rgba(225,231,238,.18)" stroke="none" />
        <path d="M0-42V38M0-2L-55 28M0-2L55 28M0 38L-42 98M0 38L42 98" />
      </g>
      <circle cx="320" cy="177" r="126" fill="none" stroke="rgba(225,231,238,.12)" strokeWidth="2" strokeDasharray="7 12" />
    </svg>
  )
}

export default function PT650ExerciseAnimation({ exerciseId, playing = true }) {
  const model = animatedModelFor(exerciseId)
  return (
    <div className={'pt650-anim-stage' + (model ? ' has-model' : ' fallback') + (playing ? '' : ' paused')}
      data-pt650-animation={model?.id || 'schematic-fallback'}>
      {model?.id === 'bench-press-v1' ? <BenchPressAnimation playing={playing} /> : <SchematicFallback />}
    </div>
  )
}
