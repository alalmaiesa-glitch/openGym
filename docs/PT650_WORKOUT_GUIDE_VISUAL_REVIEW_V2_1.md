# PT650 Workout Guide Deferred Visual Review V2.1

Status: **implemented**

- Upstream: `bryllim/workout-guide`
- Pinned commit: `aac599224bb9780305239607ef98540b7e0ce389`
- Candidates reviewed: **4**
- Accepted after visual review: **3**
- Rejected after visual review: **1**
- Coverage after V2.1: **42 exercises / 126 SVG frames**

## Review rule

A metadata/equipment mismatch can only be cleared when the pinned visual frames themselves make the actual implement or assistance mechanism unambiguous. A matching name alone is never sufficient.

## Accepted

- `0017` — assisted pull-up → `assisted-pull-up`: all reviewed frames depict a counterweighted assisted pull-up machine. This is compatible with PT650's leverage-machine assistance semantics.
- `0841` — weighted pull-up → `weighted-pull-up`: upstream metadata labels equipment as Bodyweight, but the frames visibly include a suspended external weight plate, so the movement is genuinely weighted.
- `2612` — jump rope → `jump-rope`: upstream equipment taxonomy says Cardio, while the frames visibly contain the rope and match PT650's rope-based movement.

## Rejected

- `0284` — donkey calf raise → `donkey-calf-raise`: the source frames show partner-loaded resistance with another person seated on the athlete. PT650's current exercise is body-weight with a stable support. The loading mechanism is materially different, so the asset remains unavailable.

## Integrity

The nine accepted SVG files are copied verbatim into:

`frontend/public/pt650-media/workout-guide/v1/<slug>/frame-{1,2,3}.svg`

Every asset records the pinned source commit, exact upstream SVG blob SHAs, CC BY-SA 4.0 obligations and the V2.1 visual-review rationale. Tests lock accepted and excluded IDs so later name matching cannot silently re-introduce rejected mappings.
