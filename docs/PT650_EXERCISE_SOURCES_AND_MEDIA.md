# PT650 Exercise Sources & Media Policy

Status: **adopted**
Date: 2026-10-07

This document records the product decisions for exercise data, animation and reference sources.
These decisions are implementation constraints for PT650; they are not an instruction to copy
third-party code, text or media outside the permissions that apply to each source.

## Executive rule

PT650 development **does not wait for a complete animation library**.

Exercise identity and training logic live independently from presentation media:

```
exercise_id
  -> exercise data
  -> animation provider resolver
  -> approved asset
  -> fallback provider
```

A future media-library replacement must not require rebuilding exercise pages, training history,
plans, health data or exercise IDs.

## Adopted sources

### Exercise Animatic — future primary visual provider

Source: https://www.exerciseanimatic.com/free-fitness-exercise-videos

- Future preferred visual library because the product direction is Animated / 3D only.
- The Ultimate Bundle may be licensed after the PT650 application is otherwise complete.
- No current work is blocked on that purchase.
- Imported assets must first pass the PT650 Media Pipeline.
- Provider mappings are activated only after licence/entitlement and exact exercise matching are
  verified.

Current provider state: `planned`.

### Workout Guide — open fallback provider

Source: https://github.com/bryllim/workout-guide

Adopted as the open fallback source. The reviewed source contains a structured exercise set and
three-frame transparent SVG visuals. The project decision records MIT code and CC BY-SA 4.0 visual
assets.

PT650 requirements before an asset is marked ready:

- exact `exercise_id` semantic match,
- preserved attribution,
- ShareAlike handling for modified visual derivatives,
- provenance in the asset manifest,
- PT650 Media Pipeline output.

Current provider state: `active` for the reviewed Controlled Ingest V1 subset. Unreviewed exercises remain unmapped and unavailable. Registration/matching alone must never make the UI claim an animation is available.

### ExerciseDB — exercise data enrichment adapter

Source: https://github.com/exercisedb/exercisedb-api

- Exercise metadata/enrichment only through an adapter.
- Do not copy the AGPL repository code into PT650.
- Do not assume its image/GIF/video media is commercially reusable merely because repository code
  is public.
- API use follows the provider's applicable commercial terms.

Not an Animation Provider V1 visual source.

### MuscleWiki — Arabic/anatomical runtime enrichment

Source: https://musclewiki.com/ar-sa

Useful as a runtime/reference source for Arabic naming, muscles, classifications, instructions and
body-map enrichment when allowed by the applicable API/terms.

- Do not use its videos in PT650's Animated-only demonstration library.
- Do not mirror it into a competing internal dataset.

Not an Animation Provider V1 visual source.

### Gymo — UX reference only

Source: https://github.com/Kyrillos-Samy1/Gymo

Functional ideas that may inform PT650 clean-room UX:

- search,
- body-part filters,
- exercise detail,
- similar exercises,
- same-equipment discovery,
- lazy loading.

Do not import its media or code as PT650 exercise content.

### ExerciseGymGifsDB — media excluded

Source: https://github.com/JahelCuadrado/ExerciseGymGifsDB

The visual media is excluded from PT650. Only high-level classification/API-structure ideas may be
considered as clean-room reference.

### GymVisual — selective gap filler

Source: https://gymvisual.com/

Not a primary library. A specifically licensed visual may later fill a rare missing exercise.
Every such asset requires its own verified licence metadata and PT650 mapping.

Current provider state: `planned`.

### DAREBEE — product-logic reference only

Source: https://darebee.com/library.html

Do not reuse its content or drawings. Clean-room product concepts may inspire original PT650
features such as:

- Daily Challenge,
- 30-Day Programs,
- difficulty levels,
- equipment-free programs,
- workout collections.

## Adopted architecture

```
PT650 Exercise Registry
        |
        v
Exercise Data Layer
  - PT650 Internal Data
  - ExerciseDB Adapter
  - MuscleWiki Adapter
        |
        v
Animation Provider Layer
  - Exercise Animatic (future licensed primary)
  - PT650 / OpenGym3D
  - PT650 Authored SVG
  - Workout Guide (open fallback)
  - GymVisual (rare gap fill)
        |
        v
PT650 Arabic Knowledge Layer
  - Arabic / English names
  - instructions
  - coaching cues
  - common mistakes
  - alternatives
  - muscles
  - level
  - equipment
        |
        v
PT650 Media Pipeline
  - normalize
  - compress
  - thumbnail
  - MP4 / WebM
  - mobile / desktop variants
  - PT650 branding
```

## Non-negotiable media rules

- Built-in demonstrations remain **Animated only**.
- Exercise records never store a hard dependency on one video filename.
- Exact semantic match is required before a provider asset can become `ready`.
- Provider replacement must preserve the PT650 `exercise_id`.
- Licence source, provenance, version and asset status travel with every mapped asset.
- A planned/registered provider with no approved mapping is **not available** in the UI.
- A failed preferred asset falls through to the next approved provider; the losing/fallback source
  remains intact.
