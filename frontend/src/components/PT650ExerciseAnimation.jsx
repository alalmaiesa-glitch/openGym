import { useEffect, useRef } from 'react'
import { PT650_ANIMATION_MODELS, animatedModelFor } from './pt650-animation-registry.js'

export { PT650_ANIMATION_MODELS, animatedModelFor }

function useSvgPlayback(playing) {
  const ref = useRef(null)
  useEffect(() => {
    const svg = ref.current
    if (!svg) return
    try {
      if (playing) svg.unpauseAnimations?.()
      else svg.pauseAnimations?.()
    } catch {
      // SVG SMIL playback controls are optional; unsupported browsers simply keep looping.
    }
  }, [playing])
  return ref
}

function StageSvg({ playing, children }) {
  const ref = useSvgPlayback(playing)
  return (
    <svg
      ref={ref}
      className="pt650-anim-svg"
      viewBox="0 0 640 360"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect width="640" height="360" fill="#090b0d" />
      <ellipse cx="320" cy="310" rx="250" ry="17" fill="#15191d" />
      {children}
    </svg>
  )
}

function BenchPressAnimation({ playing }) {
  return (
    <StageSvg playing={playing}>
      <g fill="none" stroke="rgba(225,231,238,.34)" strokeWidth="8" strokeLinecap="round">
        <path d="M150 104V292M434 104V292" />
        <path d="M132 104H178M410 104H456" />
        <path d="M184 246H430" strokeWidth="18" />
        <path d="M218 255L198 300M396 255L416 300" />
      </g>

      <g fill="none" stroke="#d7dde3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="182" cy="211" r="23" fill="#b9c1c9" stroke="none" />
        <path d="M209 218Q278 217 366 228" strokeWidth="26" />
        <path d="M360 228L425 205L469 253" strokeWidth="21" />
        <path d="M469 253L505 275" strokeWidth="17" />
        <path d="M424 205L475 221" strokeWidth="17" />
        <circle cx="507" cy="276" r="8" fill="#d7dde3" stroke="none" />
        <circle cx="478" cy="222" r="8" fill="#d7dde3" stroke="none" />
      </g>

      <path d="M232 206Q266 193 302 207Q270 232 232 218Z" fill="var(--acc)" opacity=".72" />

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

      <g stroke="#eef2f5" strokeLinecap="round">
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

      <g opacity=".28" fill="none" stroke="var(--acc)" strokeWidth="3" strokeLinecap="round">
        <path d="M337 92V157" strokeDasharray="5 8" />
        <path d="M329 103L337 91L345 103M329 145L337 157L345 145" />
      </g>
    </StageSvg>
  )
}

function FullSquatAnimation({ playing }) {
  return (
    <StageSvg playing={playing}>
      <path d="M185 300H455" stroke="rgba(225,231,238,.22)" strokeWidth="5" strokeLinecap="round" />

      <g fill="none" stroke="#d7dde3" strokeLinecap="round" strokeLinejoin="round">
        <circle r="24" fill="#b9c1c9" stroke="none">
          <animate attributeName="cx" values="293;252;293" dur="3s" repeatCount="indefinite" />
          <animate attributeName="cy" values="76;134;76" dur="3s" repeatCount="indefinite" />
        </circle>

        <path d="M300 108L322 178" strokeWidth="27">
          <animate
            attributeName="d"
            values="M300 108L322 178;M262 164L300 226;M300 108L322 178"
            dur="3s"
            repeatCount="indefinite"
          />
        </path>

        <path d="M322 178L349 238L326 300" strokeWidth="22">
          <animate
            attributeName="d"
            values="M322 178L349 238L326 300;M300 226L380 236L326 300;M322 178L349 238L326 300"
            dur="3s"
            repeatCount="indefinite"
          />
        </path>

        <path d="M318 178L286 236L274 300" strokeWidth="22">
          <animate
            attributeName="d"
            values="M318 178L286 236L274 300;M297 226L344 246L274 300;M318 178L286 236L274 300"
            dur="3s"
            repeatCount="indefinite"
          />
        </path>

        <path d="M305 124L270 156M309 126L348 157" strokeWidth="16">
          <animate
            attributeName="d"
            values="M305 124L270 156M309 126L348 157;M271 177L238 205M274 178L315 204;M305 124L270 156M309 126L348 157"
            dur="3s"
            repeatCount="indefinite"
          />
        </path>
      </g>

      <path d="M305 164Q329 172 339 202Q316 213 296 195Z" fill="var(--acc)" opacity=".62">
        <animate
          attributeName="d"
          values="M305 164Q329 172 339 202Q316 213 296 195Z;M288 211Q324 210 348 234Q316 252 288 239Z;M305 164Q329 172 339 202Q316 213 296 195Z"
          dur="3s"
          repeatCount="indefinite"
        />
      </path>

      <g stroke="#eef2f5" strokeLinecap="round">
        <line x1="226" x2="382" y1="119" y2="119" strokeWidth="8">
          <animate attributeName="x1" values="226;190;226" dur="3s" repeatCount="indefinite" />
          <animate attributeName="x2" values="382;346;382" dur="3s" repeatCount="indefinite" />
          <animate attributeName="y1" values="119;177;119" dur="3s" repeatCount="indefinite" />
          <animate attributeName="y2" values="119;177;119" dur="3s" repeatCount="indefinite" />
        </line>
        <rect x="239" y="101" width="14" height="36" rx="4" fill="#7f8994" stroke="none">
          <animate attributeName="x" values="239;203;239" dur="3s" repeatCount="indefinite" />
          <animate attributeName="y" values="101;159;101" dur="3s" repeatCount="indefinite" />
        </rect>
        <rect x="355" y="101" width="14" height="36" rx="4" fill="#7f8994" stroke="none">
          <animate attributeName="x" values="355;319;355" dur="3s" repeatCount="indefinite" />
          <animate attributeName="y" values="101;159;101" dur="3s" repeatCount="indefinite" />
        </rect>
      </g>

      <g opacity=".28" fill="none" stroke="var(--acc)" strokeWidth="3" strokeLinecap="round">
        <path d="M425 132V236" strokeDasharray="5 8" />
        <path d="M417 143L425 131L433 143M417 225L425 237L433 225" />
      </g>
    </StageSvg>
  )
}

function PushUpAnimation({ playing }) {
  return (
    <StageSvg playing={playing}>
      <path d="M120 300H520" stroke="rgba(225,231,238,.22)" strokeWidth="5" strokeLinecap="round" />

      <g fill="none" stroke="#d7dde3" strokeLinecap="round" strokeLinejoin="round">
        <circle r="22" fill="#b9c1c9" stroke="none">
          <animate attributeName="cx" values="190;194;190" dur="2.6s" repeatCount="indefinite" />
          <animate attributeName="cy" values="168;225;168" dur="2.6s" repeatCount="indefinite" />
        </circle>

        <path d="M216 180L388 218" strokeWidth="28">
          <animate
            attributeName="d"
            values="M216 180L388 218;M220 237L390 258;M216 180L388 218"
            dur="2.6s"
            repeatCount="indefinite"
          />
        </path>

        <path d="M388 218L488 286" strokeWidth="21">
          <animate
            attributeName="d"
            values="M388 218L488 286;M390 258L488 286;M388 218L488 286"
            dur="2.6s"
            repeatCount="indefinite"
          />
        </path>

        <path d="M238 188L205 239L171 292" strokeWidth="17">
          <animate
            attributeName="d"
            values="M238 188L205 239L171 292;M241 245L212 267L171 292;M238 188L205 239L171 292"
            dur="2.6s"
            repeatCount="indefinite"
          />
        </path>

        <path d="M258 193L251 245L235 292" strokeWidth="17">
          <animate
            attributeName="d"
            values="M258 193L251 245L235 292;M261 248L248 270L235 292;M258 193L251 245L235 292"
            dur="2.6s"
            repeatCount="indefinite"
          />
        </path>
      </g>

      <path d="M226 181Q262 177 300 195Q275 220 236 207Z" fill="var(--acc)" opacity=".7">
        <animate
          attributeName="d"
          values="M226 181Q262 177 300 195Q275 220 236 207Z;M230 237Q264 232 302 244Q276 264 238 258Z;M226 181Q262 177 300 195Q275 220 236 207Z"
          dur="2.6s"
          repeatCount="indefinite"
        />
      </path>

      <g opacity=".28" fill="none" stroke="var(--acc)" strokeWidth="3" strokeLinecap="round">
        <path d="M126 174V242" strokeDasharray="5 8" />
        <path d="M118 185L126 173L134 185M118 231L126 243L134 231" />
      </g>
    </StageSvg>
  )
}

const RENDERERS = Object.freeze({
  'bench-press-v1': BenchPressAnimation,
  'full-squat-v1': FullSquatAnimation,
  'push-up-v1': PushUpAnimation,
})

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
  const Renderer = model ? RENDERERS[model.id] : null

  return (
    <div
      className={'pt650-anim-stage' + (model ? ' has-model' : ' fallback') + (playing ? '' : ' paused')}
      data-pt650-animation={model?.id || 'schematic-fallback'}
    >
      {Renderer ? <Renderer playing={playing} /> : <SchematicFallback />}
    </div>
  )
}
