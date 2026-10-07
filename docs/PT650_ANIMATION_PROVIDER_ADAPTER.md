# PT650 Animation Provider Adapter V1

Status: **implemented architecture / provider maps ready for controlled ingest**

## Purpose

Decouple PT650 exercise identity and UI from any particular motion library.

Pages call one resolver:

```js
animationAssetFor(exerciseId)
```

They do not choose OpenGym3D, SVG, Workout Guide or Exercise Animatic directly.

## Provider priority

Highest eligible mapped provider wins:

1. `exercise_animatic` — priority 500 — planned until licensed/imported.
2. `pt650_opengym3d` — priority 400 — active.
3. `pt650_authored_svg` — priority 300 — active.
4. `workout_guide` — priority 200 — active partial fallback (Semantic Alias Matching V3.3).
5. `gymvisual` — priority 100 — planned selective gap fill.

A provider can have higher priority and still not win because:

- its provider status is not renderable, or
- the exercise has no mapped asset, or
- the mapped asset is not `ready`.

## Canonical resolved asset

The resolver returns provider-neutral metadata:

```text
exerciseId
provider
providerName
renderer
priority
providerStatus
assetStatus
available
version
licence
licenceSource
attributionRequired
shareAlike
source
provenance
asset
```

## Renderer contract

V1 supports these renderer types without page changes:

- `three` — existing PT650/OpenGym3D GLB runtime.
- `svg` — existing PT650-authored SVG motion.
- `video` — normalized MP4/WebM loop (future Exercise Animatic / licensed assets).
- `frame-sequence` — ordered image/SVG frames (Workout Guide fallback).

The preferred 3D renderer receives the next available provider as its runtime fallback.

## External asset maps

File:

`frontend/src/components/pt650-animation-assets.js`

Contains separate maps for:

- `EXERCISE_ANIMATIC_ASSETS`
- `WORKOUT_GUIDE_ASSETS`
- `GYM_VISUAL_ASSETS`

They intentionally start empty. Adding a provider to the registry does not pretend that a real,
licensed, semantically matched asset exists.

Expected future normalized examples:

```js
// Exercise Animatic after purchase + PT650 Media Pipeline
'0025': {
  id: 'ea-bench-press-v1',
  assetStatus: 'ready',
  version: 1,
  video: {
    webm: '/pt650-media/0025/ea-bench-press.webm',
    mp4: '/pt650-media/0025/ea-bench-press.mp4'
  },
  poster: '/pt650-media/0025/poster.webp',
  licence: 'verified commercial bundle licence',
  licenceSource: 'internal entitlement record',
  provenance: 'Exercise Animatic -> PT650 Media Pipeline vN'
}

// Workout Guide after exact matching + attribution ingest
'1234': {
  id: 'wg-example-v1',
  assetStatus: 'ready',
  version: 1,
  frames: [
    '/pt650-media/1234/wg-1.svg',
    '/pt650-media/1234/wg-2.svg',
    '/pt650-media/1234/wg-3.svg'
  ],
  frameMs: 700,
  licence: 'CC BY-SA 4.0',
  attributionRequired: true,
  shareAlike: true,
  provenance: 'bryllim/workout-guide + exact source revision'
}
```

## Availability

`animationAvailability(exerciseId)` returns:

- selected provider/renderer when available,
- asset status,
- ordered fallback chain,
- all mapped candidates.

`hasAnimationFor(exerciseId)` is the only boolean the exercise library needs.

## Migration rule

When Exercise Animatic is later licensed:

1. ingest media through the PT650 Media Pipeline,
2. create exact `exercise_id` mappings,
3. verify licence/provenance,
4. set mapped assets to `ready`,
5. activate the provider.

No page, workout, plan, history, health or exercise database migration should be needed.
