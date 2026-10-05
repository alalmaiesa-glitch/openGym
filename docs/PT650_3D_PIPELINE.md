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

## First integrated exercise

- PT650 exercise ID: `0662`
- Canonical name: `push-up`
- PT650 model id: `push-up-3d-v2`
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

The OpenGym3D asset library explicitly records the push-up motion as CC0 and the MPFB2 human as
CC0-compatible generated output. PT650 records those fields separately rather than treating a
single licence string as sufficient provenance.

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

Phase 1 references OpenGym3D's published final exercise assets so the runtime integration can be
validated without committing large binary files to PT650.

This is intentionally temporary. Phase 2 mirrors approved assets into PT650-controlled static
storage and verifies file hashes during CI. The registry is storage-independent so that change
does not require rewriting the exercise UI.

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
