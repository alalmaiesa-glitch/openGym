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


function ThreeQuarterSitUpAnimation({ playing }) {
  return (
    <StageSvg playing={playing}>
      <path d="M126 300H528" stroke="rgba(225,231,238,.22)" strokeWidth="5" strokeLinecap="round" />

      {/* Legs remain planted while the torso curls from the hips to roughly 45 degrees. */}
      <g fill="none" stroke="#d7dde3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M350 248L430 214L496 292" strokeWidth="24" />
        <path d="M346 252L414 232L474 294" strokeWidth="18" opacity=".72" />
        <path d="M482 294H518M456 296H490" strokeWidth="12" />
      </g>

      <g>
        <g fill="none" stroke="#d7dde3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M350 248L248 248" strokeWidth="30" />
          <path d="M258 244L224 220L202 238M258 252L226 268L204 252" strokeWidth="15" />
          <circle cx="197" cy="247" r="24" fill="#b9c1c9" stroke="none" />
        </g>

        <path d="M332 236Q304 226 276 238Q293 260 327 259Z" fill="var(--acc)" opacity=".72" />

        <animateTransform
          attributeName="transform"
          type="rotate"
          values="0 350 248;48 350 248;48 350 248;0 350 248"
          keyTimes="0;.42;.58;1"
          dur="3.2s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines=".32 .72 0 1;0 0 1 1;.32 .72 0 1"
        />
      </g>

      <g opacity=".3" fill="none" stroke="var(--acc)" strokeWidth="3" strokeLinecap="round">
        <path d="M254 217A116 116 0 0 1 292 151" strokeDasharray="5 8" />
        <path d="M286 153L298 149L294 162" />
      </g>
    </StageSvg>
  )
}

function SideBend45Animation({ playing }) {
  return (
    <StageSvg playing={playing}>
      <path d="M166 304H474" stroke="rgba(225,231,238,.18)" strokeWidth="4" strokeLinecap="round" />

      {/* PT650 Athlete V2 — front view. Pelvis and legs remain stable while the trunk bends
          laterally from the waist. This avoids the old whole-body tilt / stick-figure look. */}
      <g>
        <path
          d="M300 188Q320 178 340 188L344 207Q320 219 296 207Z"
          fill="#cbd2d9"
        />

        <g fill="none" stroke="#d8dee4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M306 205Q296 228 289 254L282 299" strokeWidth="23" />
          <path d="M334 205Q344 228 351 254L358 299" strokeWidth="23" />
          <path d="M263 301H292M348 301H377" strokeWidth="12" />
        </g>

        <path d="M302 204Q320 213 338 204" fill="none" stroke="rgba(9,11,13,.35)" strokeWidth="3" />
      </g>

      <g>
        {/* Anatomical upper body: broad shoulders, tapered waist, connected arms and head. */}
        <path
          d="M290 105Q320 92 350 105L344 137L339 184Q320 194 301 184L296 137Z"
          fill="#d8dee4"
        />
        <rect x="313" y="82" width="14" height="22" rx="7" fill="#cbd2d9" />
        <circle cx="320" cy="62" r="23" fill="#cbd2d9" />

        <g fill="none" stroke="#d8dee4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M294 116Q282 146 277 173Q274 188 271 202" strokeWidth="16" />
          <path d="M346 116Q358 146 363 173Q366 188 369 202" strokeWidth="16" />
        </g>
        <circle cx="270" cy="204" r="8" fill="#cbd2d9" />
        <circle cx="370" cy="204" r="8" fill="#cbd2d9" />

        {/* Subtle anatomy landmarks keep the avatar readable without becoming photorealistic. */}
        <path d="M303 121Q320 129 337 121" fill="none" stroke="rgba(9,11,13,.22)" strokeWidth="3" strokeLinecap="round" />
        <path d="M320 132V176" fill="none" stroke="rgba(9,11,13,.16)" strokeWidth="2.5" strokeLinecap="round" />

        {/* Obliques: the compressed side brightens as the torso bends to that side. */}
        <path d="M299 139Q307 135 314 142L311 176Q305 180 299 172Z" fill="var(--acc)">
          <animate
            attributeName="opacity"
            values=".42;.92;.42;.20;.42"
            keyTimes="0;.22;.44;.72;1"
            dur="4.8s"
            repeatCount="indefinite"
          />
        </path>
        <path d="M341 139Q333 135 326 142L329 176Q335 180 341 172Z" fill="var(--acc)">
          <animate
            attributeName="opacity"
            values=".42;.20;.42;.92;.42"
            keyTimes="0;.22;.44;.72;1"
            dur="4.8s"
            repeatCount="indefinite"
          />
        </path>

        <animateTransform
          attributeName="transform"
          type="rotate"
          values="0 320 190;-20 320 190;0 320 190;20 320 190;0 320 190"
          keyTimes="0;.22;.44;.72;1"
          dur="4.8s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines=".32 .72 0 1;.32 .72 0 1;.32 .72 0 1;.32 .72 0 1"
        />
      </g>

      {/* Quiet reference line: enough to show that the pelvis is stable, without instructional arrows. */}
      <path d="M320 190V86" stroke="rgba(225,231,238,.10)" strokeWidth="2" strokeDasharray="5 9" />
    </StageSvg>
  )
}

const RENDERERS = Object.freeze({
  'three-quarter-sit-up-v1': ThreeQuarterSitUpAnimation,
  'side-bend-45-v2': SideBend45Animation,
  'bench-press-v1': BenchPressAnimation,
  'full-squat-v1': FullSquatAnimation,
  'push-up-v1': PushUpAnimation,
})

export default function PT650ExerciseAnimation({ exerciseId, playing = true }) {
  const model = animatedModelFor(exerciseId)
  const Renderer = model ? RENDERERS[model.id] : null
  if (!Renderer) return null

  return (
    <div
      className={'pt650-anim-stage has-model' + (playing ? '' : ' paused')}
      data-pt650-animation={model.id}
    >
      <Renderer playing={playing} />
    </div>
  )
}
