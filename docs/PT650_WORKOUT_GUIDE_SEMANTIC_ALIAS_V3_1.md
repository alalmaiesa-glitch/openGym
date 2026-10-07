# PT650 Workout Guide Semantic Alias Matching V3.1 — Priority Gap Batch

Status: **implemented**

- Pinned upstream commit: `aac599224bb9780305239607ef98540b7e0ce389`
- Accepted: **11**
- Newly copied source SVG files: **30** (10 new source slugs)
- Reused reviewed source slug: **1** (`incline-dumbbell-curl`)
- Workout Guide mappings after V3.1: **64**
- Local Workout Guide SVG files: **189**
- Runtime animation coverage: **73 / 1,327 = 5.50%**

## Accepted

- `0042` — barbell front squat → `front-squat`: PT650 and source both describe the same barbell front squat; the source omits only the redundant equipment word and the reviewed frames show the bar in the front-rack position.
- `0044` — barbell good morning → `good-morning`: Same barbell good-morning hip hinge; equipment, posterior-chain semantics and reviewed frames match PT650.
- `0074` — barbell rack pull → `rack-pull`: Same shortened-range barbell rack-pull pattern; PT650 specifies a knee-height rack start and source metadata/frames represent the rack-pull movement.
- `0085` — barbell romanian deadlift → `romanian-deadlift`: Same barbell Romanian deadlift; PT650 instructions and source both use the controlled hip-hinge with soft knees and matching hamstring/glute semantics.
- `0297` — dumbbell concentration curl → `concentration-curl`: Same dumbbell concentration curl; source metadata supplies Dumbbell and the reviewed seated elbow-braced posture matches PT650.
- `0301` — dumbbell decline bench press → `decline-dumbbell-press`: Same decline dumbbell chest press; decline support, dumbbells, press path and target semantics all match.
- `0314` — dumbbell incline bench press → `incline-dumbbell-press`: Same incline dumbbell chest press; incline bench, dumbbells and reviewed press path match PT650.
- `0315` — dumbbell incline biceps curl → `incline-dumbbell-curl`: Same incline dumbbell biceps curl. This safely reuses the already-ingested source asset used by PT650 0318 because both PT650 exercise descriptions specify the same incline-bench curl movement.
- `0865` — lying leg-hip raise → `lying-leg-raise`: PT650's description is a standard lying straight-leg raise despite the legacy 'leg-hip raise' name; source frames and bodyweight core movement match the described execution.
- `1757` — dumbbell single leg deadlift → `single-leg-romanian-deadlift`: PT650 describes the same single-leg dumbbell Romanian hip hinge: one support leg, opposite leg extended rearward, dumbbell lowered under a neutral spine.
- `0475` — hanging straight leg raise → `hanging-leg-raise`: Source naming is broader, but all reviewed movement frames preserve straight legs and match PT650's hanging straight-leg raise instructions.

## Explicitly blocked

- `0038` — barbell drag curl → `drag-curl` — **rejected**: PT650 instructions describe a conventional curl with stationary upper arms and do not establish the defining drag/elbow-back path; do not trust the name alone.
- `3017` — barbell pendlay row → `pendlay-row` — **rejected**: PT650 instructions describe a generic bent-over row and do not require a dead-stop return to the floor between reps, which is defining for a Pendlay row.
- `0126` — barbell wrist curl → `wrist-curl` — **rejected**: PT650 specifies seated forearm support on the thighs; the reviewed source frames depict a standing unsupported barbell wrist curl.
- `0699` — shoulder tap push-up → `push-up-shoulder-tap` — **held**: The source frames clearly show shoulder taps but do not unambiguously demonstrate the push-up lowering phase required by PT650.
- `1764` — hanging leg hip raise → `hanging-leg-raise` — **rejected**: PT650 explicitly raises flexed knees until the thighs are parallel; the reviewed source asset is a straight-leg hanging raise.

## Guardrail

V3.1 deliberately accepts fewer candidates than the similarity search proposes. Equipment/category equality is necessary but not sufficient. Grip, support surface, body position, range of motion and sequence are treated as semantic identity, not cosmetic variants.
