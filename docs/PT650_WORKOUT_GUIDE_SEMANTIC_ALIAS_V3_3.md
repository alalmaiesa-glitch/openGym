# PT650 Workout Guide Semantic Alias Matching V3.3 — Bodyweight Precision Batch

Status: **implemented**

- Pinned upstream commit: `aac599224bb9780305239607ef98540b7e0ce389`
- Accepted: **9**
- New local SVG files: **15**
- Reused pinned source slugs: **4**
- Workout Guide mappings after V3.3: **85**
- Local Workout Guide SVG files: **240**
- Runtime animation coverage: **94 / 1,327 = 7.08%**

## Accepted

- `3470` — forward lunge (male) → `forward-lunge`: PT650 describes the standard alternating forward lunge; source movement, bodyweight loading, knee path and stance match.
- `3699` — shoulder tap → `plank-shoulder-tap`: PT650 starts in a high plank and alternates opposite shoulder taps while stabilizing the hips; source frames depict the same full-plank shoulder-tap sequence.
- `0497` — inverted row v. 2 → `inverted-row`: PT650 explicitly allows a waist-height fixed bar; source frames show that valid fixed-bar inverted-row implementation with matching overhand pull path.
- `0513` — jump squat v. 2 → `jump-squat`: Same bodyweight squat-to-explosive-jump sequence with soft landing and immediate return to squat.
- `1373` — bodyweight standing calf raise → `calf-raise`: Same two-leg bodyweight standing calf raise; PT650 permits a wall or stable surface for balance and the source uses stable hand support.
- `1377` — calf stretch with hands against wall → `wall-calf-stretch`: Same wall-supported calf stretch with rear heel grounded and rear leg straight.
- `1387` — one leg floor calf raise → `single-leg-calf-raise`: Same single-leg bodyweight calf raise with a stable hand support for balance and the non-working leg off the floor.
- `3785` — incline push-up (on box) → `incline-push-up`: PT650 explicitly uses a box/elevated surface with a straight-body incline push-up; source frames show the same elevated support and press path.
- `0474` — hanging straight leg hip raise → `hanging-leg-raise`: PT650 raises straight legs from a dead hang to roughly parallel; the reviewed source frames preserve straight legs and the same hanging raise path.

## Explicitly blocked

- `0710` — side hip abduction → `side-lying-hip-abduction` — **rejected**: PT650 is a standing alternating hip abduction; source is side-lying. Body position and stabilization pattern differ.
- `0274` — crunch floor → `crunch` — **rejected**: PT650 requires feet flat on the floor; reviewed source frames place the lower legs on an elevated support. Support position differs.
- `0620` — lying leg raise flat bench → `lying-leg-raise` — **rejected**: PT650 explicitly uses a flat bench; the source is floor-supported. Support surface is part of the exercise setup.
- `0129` — bench dip (knees bent) → `bench-dip` — **rejected**: PT650 title says knees bent while its own instructions say straighten the legs with heels on the ground; source uses elevated foot support. The record is internally inconsistent and the setup is not a safe match.
- `1753` — three bench dip → `bench-dip` — **rejected**: The PT650 title indicates a multi-bench variant while its instructions describe a generic bench dip; source does not establish the named three-bench configuration.
- `0814` — triceps dip → `dip` — **rejected**: PT650 instructions describe a bench/chair dip; Workout Guide dip is a parallel-support dip. Support geometry differs.
- `0490` — incline close-grip push-up → `incline-push-up` — **rejected**: Close-grip hand placement is a material triceps-biased variant not established by the generic incline-push-up frames.
- `3239` — kneeling plank tap shoulder (male) → `plank-shoulder-tap` — **rejected**: PT650 is a kneeling plank variation; source maintains a full high-plank position on the toes.
- `0807` — suspended reverse crunch → `reverse-crunch` — **rejected**: PT650 uses suspension support; source reverse crunch is unsuspended. Equipment/support semantics differ.
- `3217` — modified hindu push-up (male) → `hindu-push-up` — **rejected**: The modified movement is not interchangeable with the full Hindu push-up sequence.
- `1429` — wide grip pull-up → `pull-up` — **rejected**: Wide-grip geometry is a material pull-up variation and must not collapse to a generic grip asset.

## Guardrail

For bodyweight exercises, variant words are often mechanically meaningful. V3.3 therefore rejects name-near matches whenever grip, support surface, knee/toe support, suspension, leg position, or movement sequence differs.
