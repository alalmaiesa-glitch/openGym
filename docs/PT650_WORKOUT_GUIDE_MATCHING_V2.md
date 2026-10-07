# PT650 Workout Guide Matching & Expansion V2

Status: **implemented** · Deferred cases resolved further in **V2.1**.

- Upstream: `bryllim/workout-guide`
- Pinned commit: `aac599224bb9780305239607ef98540b7e0ce389`
- Upstream package: `@bryllim/workout-guide@1.0.0`
- V1: 12 exercises / 36 SVG frames
- V2 added: **27 exercises / 81 SVG frames**
- Total local Workout Guide coverage after V2: **39 exercises / 117 SVG frames**

## V2 rule

Exact-name matching is only a candidate generator. A mapping is accepted only after checking
exercise identity, movement semantics, equipment compatibility, target-muscle meaning, frame
availability and licence provenance.

## Accepted V2 mappings

- `0095` — barbell shrug → `shrug` · Barbell · Upper Back
- `0406` — dumbbell shrug → `dumbbell-shrug` · Dumbbell · Upper Back
- `1409` — barbell glute bridge → `barbell-glute-bridge` · Barbell · Glutes
- `1459` — dumbbell romanian deadlift → `dumbbell-romanian-deadlift` · Dumbbell · Hamstrings
- `0549` — kettlebell swing → `kettlebell-swing` · Kettlebell · Glutes
- `0514` — jump squat → `jump-squat` · Bodyweight · Quads
- `0872` — reverse crunch → `reverse-crunch` · Bodyweight · Core
- `0687` — russian twist → `russian-twist` · Bodyweight · Core
- `0630` — mountain climber → `mountain-climber` · Bodyweight · Core
- `0276` — dead bug → `dead-bug` · Bodyweight · Core
- `0282` — decline sit-up → `decline-sit-up` · Bench · Core
- `0832` — weighted crunch → `weighted-crunch` · Plate · Core
- `0846` — weighted russian twist → `weighted-russian-twist` · Dumbbell · Core
- `0407` — dumbbell side bend → `dumbbell-side-bend` · Dumbbell · Core
- `0493` — incline push-up → `incline-push-up` · Bodyweight · Chest
- `0283` — diamond push-up → `diamond-push-up` · Bodyweight · Triceps
- `0279` — decline push-up → `decline-push-up` · Bodyweight · Chest
- `3294` — archer push up → `archer-push-up` · Bodyweight · Chest
- `0471` — handstand push-up → `handstand-push-up` · Bodyweight · Shoulders
- `1489` — sissy squat → `sissy-squat` · Bodyweight · Quads
- `3561` — glute bridge march → `glute-bridge-march` · Bodyweight · Glutes
- `3360` — bear crawl → `bear-crawl` · Bodyweight · Core
- `1471` — inchworm → `inchworm` · Bodyweight · Core
- `1160` — burpee → `burpee` · Bodyweight · Legs
- `1511` — hamstring stretch → `hamstring-stretch` · Bodyweight · Hamstrings
- `0811` — trap bar deadlift → `trap-bar-deadlift` · Barbell · Posterior Chain
- `0688` — scapular pull-up → `scapular-pull-up` · Pull-up Bar · Lats

## Explicitly held or rejected at V2

- `0662` — push-up → `push-up` — **held**: PT650 already has a higher-priority exact authored/OpenGym3D movement; do not duplicate fallback in V2.
- `0017` — assisted pull-up → `assisted-pull-up` — **deferred**: Assistance mechanism needs visual confirmation; PT650 specifies leverage machine while Workout Guide metadata says generic machine.
- `0841` — weighted pull-up → `weighted-pull-up` — **deferred**: Workout Guide metadata says Bodyweight; verify that the external load is visibly represented before mapping a weighted PT650 exercise.
- `1460` — walking lunge → `walking-lunge` — **rejected**: Equipment conflict: PT650 entry is body weight while Workout Guide entry is Dumbbell.
- `0860` — cable kickback → `cable-kickback` — **rejected**: Semantic conflict: PT650 targets triceps; Workout Guide targets glutes/hamstrings.
- `0284` — donkey calf raise → `donkey-calf-raise` — **deferred**: Equipment conflict requires visual review: PT650 body weight vs Workout Guide machine.
- `2612` — jump rope → `jump-rope` — **deferred**: Movement matches, but source equipment taxonomy is Cardio while PT650 is Rope; hold until visual/equipment review.

The review ledger is executable data in
`frontend/src/components/pt650-workout-guide-review.js`, and tests assert that held/rejected
IDs never enter the asset map accidentally.

## Asset integrity

All V2 SVGs were copied verbatim into the existing pinned local Workout Guide media root:

`frontend/public/pt650-media/workout-guide/v1/<slug>/frame-{1,2,3}.svg`

Each copied file was checked during ingest so its target Git blob SHA matched the pinned upstream
Git blob SHA. No visual adaptation was performed.

## Runtime

Workout Guide remains priority 200, below Exercise Animatic, PT650/OpenGym3D and PT650-authored
SVG motion. V2 changes coverage, not provider precedence.


## V2.1 follow-up

Deferred Visual Review V2.1 inspected all three source frames for the four deferred movement/equipment cases.

- Accepted: `0017` assisted pull-up — source frames show the assisted machine.
- Accepted: `0841` weighted pull-up — source frames visibly show an external suspended weight plate.
- Accepted: `2612` jump rope — source frames visibly show the rope; upstream `Cardio` is a category label, not a conflicting implement.
- Rejected: `0284` donkey calf raise — source frames show partner-loaded resistance, while PT650 defines body-weight execution using a stable support.

After V2.1, local Workout Guide coverage is **42 exercises / 126 SVG frames**.
