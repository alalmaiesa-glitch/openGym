# PT650 Workout Guide Controlled Ingest V1

Status: **implemented**

- Source: `bryllim/workout-guide`
- Pinned source commit: `aac599224bb9780305239607ef98540b7e0ce389`
- Package version: `@bryllim/workout-guide@1.0.0`
- Scope: **12 reviewed exercises / 36 SVG frames**

## What V1 does

The first approved Workout Guide fallback assets are copied verbatim into PT650 at:

`frontend/public/pt650-media/workout-guide/v1/<slug>/frame-{1,2,3}.svg`

No recolouring, tracing, PT650 branding or other visual adaptation is applied to these SVGs in V1.
The Git blob identity of every copied SVG was verified against the pinned upstream file during
ingest.

## Reviewed mappings

- `0289` — dumbbell bench press → `dumbbell-bench-press` · Dumbbell · Chest
- `0405` — dumbbell seated shoulder press → `seated-dumbbell-press` · Dumbbell · Shoulders
- `0178` — cable lateral raise → `cable-lateral-raise` · Cable · Shoulders
- `0293` — dumbbell bent over row → `dumbbell-bent-over-row` · Dumbbell · Back
- `0652` — pull-up → `pull-up` · Bodyweight · Lats
- `1326` — chin-up → `chin-up` · Bodyweight · Biceps
- `0868` — cable curl → `cable-curl` · Cable · Biceps
- `0472` — hanging leg raise → `hanging-leg-raise` · Bodyweight · Core
- `0308` — dumbbell fly → `dumbbell-fly` · Dumbbell · Chest
- `0251` — chest dip → `chest-dip` · Bodyweight · Chest
- `0162` — cable front raise → `cable-front-raise` · Cable · Shoulders
- `0499` — inverted row → `inverted-row` · Bodyweight · Back

## Matching gate

Exact name alone is not sufficient. Each admitted mapping is reviewed for exercise identity,
equipment, movement semantics, muscle metadata, three-frame availability and licence provenance.
Ambiguous/conflicting exact-name matches remain excluded.

## Licence / attribution

Workout Guide visual assets are **CC BY-SA 4.0**. PT650 carries the upstream `LICENSE-ASSETS`
and `ATTRIBUTION.md` beside the distributed assets. Runtime display includes a compact visible
creator/upstream + CC BY-SA credit.

V1 records the PT650 change statement as:

> None — SVG files copied verbatim; no visual adaptation in V1.

Any future visual modification must preserve the applicable ShareAlike terms and record the change.

## Runtime priority

Workout Guide is now an **active partial provider** at priority 200. It remains below:

1. Exercise Animatic — 500 (future licensed primary)
2. PT650/OpenGym3D — 400
3. PT650 Authored SVG — 300

A mapped asset must be `ready`; merely registering a provider cannot make it render.
