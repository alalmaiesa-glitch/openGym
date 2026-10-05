# PT650 — OpenGym3D / CC0 3D Exercise Pipeline

PT650 is migrating built-in exercise demonstrations from hand-authored SVG motion to generated 3D exercise media.

## Source path adopted

PT650 now follows the OpenGym3D production pattern:

```
PT650 exercise id
      |
      v
frontend/src/components/pt650-3d-registry.js
      |
      +--> OpenGym3D final GLB
      |      MakeHuman / MPFB2 anatomical avatar
      |      + CC0 / own-capture motion
      |      + Blender headless retarget/export
      |
      +--> OpenGym3D rendered MP4 fallback
      |
      v
PT650ThreeExercise.jsx
      |
      +--> WebGL / Three.js interactive playback
      +--> MP4 fallback when WebGL/runtime is unavailable
```

The 3D path has priority over the legacy SVG path. SVG is transitional only.

## Integrated CC0 exercises

### Push-up

- PT650 exercise ID: `0662`
- Canonical name: `push-up`
- PT650 model id: `push-up-3d-v3`
- OpenGym3D spec: `exercises/push_up.json`
- 3D asset: `site/assets/push_up.glb`
- rendered fallback: `site/assets/push_up.mp4`
- camera: side
- source project: OpenGym3D
- source repository: `AssiamahS/opengym3d`
- source commit recorded for pipeline provenance: `ea3a60130fdcfb3c4771e44d09f84ebab4ee9bae`
- human: MakeHuman / MPFB2 anatomical avatar
- human asset licence: CC0-1.0
- motion: Mesh2Motion `Pushup`
- motion licence: CC0-1.0
- OpenGym3D code licence: MIT

### Bear crawl

- PT650 exercise ID: `3360`
- Canonical name: `bear crawl`
- PT650 model id: `bear-crawl-3d-v1`
- OpenGym3D spec: `exercises/bear_crawl.json`
- camera: side
- human: MakeHuman / MPFB2 anatomical avatar — CC0-1.0
- motion: Mesh2Motion `Crawl` — CC0-1.0
- OpenGym3D code licence: MIT

Both source specs are non-draft and use redistributable CC0 motion. PT650 records human, motion,
pipeline and source provenance separately rather than treating one licence label as sufficient.

## Runtime rules

1. Open a registered 3D exercise through the PT650 3D registry only.
2. Prefer the final OpenGym3D exercise GLB, not the raw Mesh2Motion animation pack.
3. The final GLB must represent the exact exercise and camera angle approved for that PT650 ID.
4. If WebGL, Three.js loading, or the GLB fails, use the rendered 3D MP4 fallback.
5. Do not fall back from 3D to a generic human animation.
6. Real-person footage is prohibited.
7. Public PT650 3D assets may use only redistributable sources recorded in the registry.
8. Mixamo/app-only and demo-only source motion must not enter the public PT650 registry.

## Current storage stage

PT650 is now in Phase 2: approved OpenGym3D outputs are mirrored during CI/deployment into
`frontend/public/pt650-3d/` and served from the PT650 origin.

The source URLs remain external only at build time. Every GLB, MP4 and PNG is SHA256-locked in
`frontend/pt650-3d-assets.lock.json`. If upstream bytes change, disappear, or fail their hash,
CI and Pages deployment fail closed instead of silently serving new media.

The runtime registry therefore contains same-origin URLs only; the browser does not depend on
OpenGym3D hosting after a successful PT650 build.

## Runtime independence

Three.js is pinned as a PT650 frontend dependency at `0.170.0`. The interactive viewer uses
native dynamic imports for `three` and `three/examples/jsm/loaders/GLTFLoader.js`, so Vite
builds them into lazy chunks that are downloaded only when a registered 3D exercise is opened.

There is no runtime import from esm.sh, unpkg, jsDelivr or another JavaScript CDN. Combined with
the same-origin GLB/MP4/PNG mirror above, the complete exercise-viewing path can run from the
PT650 deployment alone after the build finishes.

## Production expansion

For an exercise that does not have a suitable CC0 motion:

1. record one clean exercise repetition specifically for PT650;
2. extract pose motion locally using the OpenGym3D MediaPipe lane;
3. mark the motion source as PT650-owned;
4. retarget to the MPFB2 / MakeHuman rig in headless Blender;
5. generate GLB + MP4;
6. run joint/anatomy QA;
7. register the asset only after exercise binding and licence checks pass.

This lets PT650 scale beyond the finite Mesh2Motion CC0 pack without ever using real-person
instructional footage in the product.


## Viewer V2

PT650 does not use one generic camera for every movement. Each registered 3D exercise now carries
a small viewer profile that controls field of view, framing direction, target height, zoom range
and the permitted orbit envelope.

The default instructional view remains the upstream-approved side camera. Users may rotate only
within a narrow range around that view and may zoom within bounded limits. Pan is disabled so the
animated subject cannot be lost outside the exercise frame.

The viewer uses a restrained three-point light rig plus ACES filmic tone mapping. This improves
surface readability without recolouring the model. Target-muscle activation remains the
OpenGym3D-authored `MuscleHeat` vertex-colour data baked into the GLB, so PT650 does not infer or
paint muscle regions at runtime. Primary and secondary muscle metadata are recorded beside each
PT650 registry entry and must stay consistent with the approved upstream exercise specification.


## Viewer controls V1

The interactive 3D viewer owns its playback controls instead of relying on the legacy
tap-anywhere media behavior.

Controls are deliberately compact:

- play / pause
- restart the motion at frame zero
- playback speed: `0.5×`, `1×`, `1.5×`
- reset the camera to the exercise's approved instructional view

Desktop shows the three speed choices together. Narrow mobile layouts collapse them into one
speed button that cycles through the same values. Camera drag/zoom remains independent from
playback, so orbit gestures do not accidentally pause the exercise.

The parent media card no longer handles tap-to-pause for registered 3D exercises. This prevents
control clicks and OrbitControls gestures from bubbling into a second playback toggle.
