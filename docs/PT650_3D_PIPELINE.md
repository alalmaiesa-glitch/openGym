# PT650 — 3D Exercise Pipeline

PT650 is migrating built-in exercise demonstrations from authored SVG motion to interactive 3D GLB assets.

## Phase 1 architecture

The first live 3D exercise is PT650 exercise `0662` — `push-up`.

Pipeline:

```
PT650 exercise id
      |
      v
frontend/src/components/pt650-3d-registry.js
      |
      v
CC0 GLB asset + exact animation clip
      |
      v
PT650ThreeExercise.jsx
      |
      v
lazy Three.js runtime -> AnimationMixer -> PT650 exercise sheet
```

The 3D path has priority over the legacy SVG path. SVG remains only as a temporary compatibility
fallback while the 3D library is expanded.

## First asset

- PT650 exercise ID: `0662`
- Canonical name: `push-up`
- PT650 model id: `push-up-3d-v1`
- GLB clip: `Pushup`
- Source project: OpenGym3D
- Source repository: `AssiamahS/opengym3d`
- Source commit: `ea3a60130fdcfb3c4771e44d09f84ebab4ee9bae`
- Motion source: Mesh2Motion human animation pack
- Licence: CC0-1.0
- OpenGym3D repository code licence: MIT

The remote source is pinned to an immutable upstream commit. PT650 must never depend on a mutable
`main` URL for production 3D media.

## Runtime rules

1. Load Three.js only when a registered 3D exercise is opened.
2. Do not add a multi-megabyte 3D runtime to the initial PT650 bundle.
3. The exact named animation clip must be selected from the GLB.
4. Missing WebGL, loading failure, or runtime failure falls back to the existing exercise-specific
   SVG model when one exists.
5. A 3D model must be bound to the exact PT650 exercise ID and canonical name.
6. Public PT650 3D assets may use only redistributable sources recorded in the registry.
7. Mixamo/app-only or demo-only motion data must not be entered into the public PT650 registry.

## Asset migration plan

Phase 1 uses the upstream CC0 GLB directly from a commit-pinned URL to prove the PT650 runtime
integration without duplicating a 5+ MB binary during the architecture change.

The next asset step is to mirror approved CC0 GLBs into PT650-controlled static storage during the
build pipeline, validate their hashes, and serve them from the PT650 origin. The registry structure
is intentionally independent of the final storage URL so this migration does not change exercise UI
code.

## Production direction

The OpenGym3D pipeline is the reference production path:

- MakeHuman / MPFB2 anatomical avatar
- CC0 motion where available
- own-capture motion for exercises missing suitable open motion
- Blender headless retarget/export
- GLB output
- joint/anatomy QA before publication
- PT650 registry entry only after licence and exercise-binding checks pass

SVG exercise demos are transitional and are not the target visual standard.
