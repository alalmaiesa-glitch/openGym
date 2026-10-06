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

### Jumping Jack — PT650 native

- PT650 exercise ID: `pt650-0001`
- Canonical name: `jumping jack`
- Arabic name: `قفز فتح وضم`
- PT650 model id: `jumping-jack-3d-v1`
- OpenGym3D spec: `exercises/jumping_jack.json`
- camera: front
- human: MakeHuman / MPFB2 anatomical avatar — CC0-1.0
- motion: Mesh2Motion `Jumping Jacks` — CC0-1.0
- generator: PT650 3D Factory
- generated outputs: GLB + MP4 + PNG
- output hash lock: `frontend/pt650-3d-factory.lock.json`

This is the first exercise PT650 adds to its own catalogue specifically because the upstream
CC0 movement is a precise fit but the inherited exercise catalogue had no exact row.

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

### Run / jog in place

- PT650 exercise ID: `0685`
- Canonical PT650 name: `run`
- PT650 dataset instructions: jogging in place
- PT650 model id: `run-jog-in-place-3d-v2`
- OpenGym3D spec: `exercises/jog.json`
- camera: front
- human: MakeHuman / MPFB2 anatomical avatar — CC0-1.0
- motion: Mesh2Motion `Jog` — CC0-1.0
- OpenGym3D code licence: MIT
- rejected alternative: OpenGym3D `run.json` / `Sprint`, because it does not match the PT650
  exercise instructions closely enough

All integrated source specs use redistributable CC0 motion. PT650 records human, motion,
pipeline and source provenance separately rather than treating one licence label as sufficient.

## CC0 candidate audit

The current OpenGym3D CC0 exercise lane was audited against the PT650 catalogue and recorded in
`frontend/pt650-3d-candidates.json`.

Six movements now pass the exact-binding gate: push-up, bear crawl, the PT650
`run` entry bound to OpenGym3D's jog-in-place motion, plus PT650-native Jumping Jack,
Walk and Seated Meditation. The OpenGym3D sprint motion remains explicitly rejected for
PT650 `0685` because the PT650 source instructions describe jogging in place.

## Runtime rules

1. Open a registered 3D exercise through the PT650 3D registry only.
2. Prefer the final OpenGym3D exercise GLB, not the raw Mesh2Motion animation pack.
3. The final GLB must represent the exact exercise and camera angle approved for that PT650 ID.
4. If WebGL, Three.js loading, or the GLB fails, use the rendered 3D MP4 fallback.
5. Do not fall back from 3D to a generic human animation.
6. Real-person footage is prohibited.
7. Public PT650 3D assets may use only redistributable sources recorded in the registry.
8. Mixamo/app-only and demo-only source motion must not enter the public PT650 registry.

## PT650 3D Factory

When a redistributable motion exists but no finished upstream GLB is published, PT650 can now
generate the exercise itself from pinned source inputs.

The factory manifest is `frontend/pt650-3d-factory.json`. It pins the OpenGym3D commit, Blender
version, MPFB version, exercise spec, camera, exact motion clip and licence. CI validates that
those values still match the pinned upstream repository before any render starts.

Factory output uses the same delivery contract as mirrored assets: GLB for interactive playback,
MP4 as the non-WebGL fallback and PNG as the poster. Generated files are verified against
`frontend/pt650-3d-factory.lock.json` before they are eligible for deployment.

Jumping Jack is the first factory exercise.

## PT650 Owned Motion Lane V1

The documented redistributable Mesh2Motion exercise set is now exhausted for exact PT650
bindings. Expansion therefore moves to PT650-owned source capture rather than approximate motion.

The control manifest is `frontend/pt650-owned-motion.json`, and
`frontend/scripts/verify-pt650-owned-motion.mjs` enforces the release gate before the test suite.

The first capture target is PT650 exercise `3470`, `forward lunge (male)`, because its
bodyweight forward-lunge instructions match the target movement directly. It remains deliberately
unregistered in the public 3D registry while its state is `awaiting-owned-capture`.

Owned-capture rules:

1. the source must be recorded specifically for PT650;
2. the source video is private and never shipped in the product;
3. the public product remains animated-only;
4. the capture must show the full body with a fixed camera at 30 fps or better;
5. the source video receives SHA256 before pose extraction;
6. the extracted motion receives its own SHA256;
7. anatomy QA and visual review must both pass;
8. runtime registration is blocked until every release gate is true.

For forward lunge, the capture sequence must contain neutral standing, a right forward lunge
to approximately 90 degrees, return to standing, the corresponding left repetition, and return
to standing. This mirrors PT650's alternating-side instructions rather than accepting a generic
lunge-looking clip.

### Owned Capture Ingest V1

Raw capture footage is never copied into PT650. The local ingest command reads the capture in
place, validates that it is a supported video file, computes SHA256 and can update only the
manifest provenance:

`npm run pt650:capture:ingest -- 3470 <video-path> --write`

If a capture is kept temporarily inside the working tree, the only permitted location is
`frontend/.pt650-captures/`, which is ignored by Git. Any other raw video path inside the
repository is rejected. The command stores no personal filename or filesystem path in the
manifest; the source file remains private input and only the derived animated output may ship.


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

The default instructional view remains the upstream-approved camera for each exercise (front or
side). Users may rotate only within a narrow range around that view and may zoom within bounded
limits. Pan is disabled so the animated subject cannot be lost outside the exercise frame.

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
