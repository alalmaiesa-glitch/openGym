# PT650 Animation Coverage Gap Analysis V1

Status: **implemented**

This baseline measures real renderable animation coverage after Workout Guide Semantic Alias Matching V3.5. It uses the provider resolver rather than raw asset counts, so higher-priority providers win exactly as they do at runtime.

## Baseline

- PT650 catalogue: **1,327 exercises** = 1,324 imported catalogue exercises + 3 PT650-native exercises.
- Resolved animation coverage: **113 exercises**.
- Uncovered: **1,214 exercises**.
- Coverage: **8.52%**.

Selected runtime providers:

- PT650 / OpenGym3D: **6**
- PT650 Authored SVG: **4**
- Workout Guide: **103**

Workout Guide contains 104 mapped exercises, but `3360` bear crawl resolves to the higher-priority OpenGym3D provider. This is expected and proves that raw map count is not the same as runtime-selected coverage.

## Largest body-part gaps

| Body part | Missing |
| --- | ---: |
| upper arms | 277 |
| back | 187 |
| upper legs | 183 |
| waist | 153 |
| chest | 148 |
| shoulders | 127 |
| lower legs | 53 |
| lower arms | 36 |
| cardio | 24 |
| full body | 24 |
| neck | 2 |

## Largest equipment gaps

| Equipment | Missing |
| --- | ---: |
| body weight | 286 |
| dumbbell | 273 |
| cable | 146 |
| barbell | 132 |
| leverage machine | 70 |
| band | 54 |
| smith machine | 48 |
| kettlebell | 40 |
| weighted | 33 |

## Workout Guide exact-name queue

The pinned Workout Guide manifest contains **302 exercises**. After V1, V2 and V2.1:

- mapped: **42**
- explicitly excluded after review: `0662`, `1460`, `0860`, `0284`
- remaining normalized exact-name candidate: only PT650-native `jumping jack`

`jumping jack` is already covered by the higher-priority OpenGym3D provider. Therefore the useful exact-name Workout Guide queue is effectively exhausted.

## Decision

Do **not** continue bulk exact-name ingestion.

The next expansion must be **semantic alias matching**, with these gates:

1. prioritize body-weight, dumbbell, cable and barbell gaps;
2. generate candidates from movement identity + equipment + target muscle, not names alone;
3. visually review every candidate before ingest;
4. keep rejected candidates in an executable ledger;
5. preserve provider precedence and source/licence provenance.

The baseline is executable in `pt650-animation-coverage.js` and locked by `pt650-animation-coverage.test.js`. Any future expansion changes the baseline intentionally rather than silently.


## Semantic Alias Matching V3

V3 adds **11 reviewed aliases / 33 SVG frames** after movement, equipment, target-muscle and visual checks. Workout Guide local coverage is now **53 exercises / 159 SVG frames**; **52** are selected at runtime because bear crawl continues to resolve to higher-priority OpenGym3D.

The semantic candidate generator is intentionally not an auto-ingest path. High-scoring false positives were observed and explicitly blocked, including neutral-grip ambiguity, hammer/palm-in grip variants, exercise-ball support changes and pike-to-cobra versus pike-only movement.


## Priority Gap V3.1

V3.1 adds **11 reviewed mappings**. Ten require newly ingested source slugs; `0315` safely reuses the already-ingested `incline-dumbbell-curl` source frames also used by `0318`.

Workout Guide now maps **64 PT650 exercises**. Runtime selects Workout Guide for **63** because bear crawl continues to resolve to higher-priority OpenGym3D. The local Workout Guide media directory contains **189 SVG frame files**.

Strict review also blocked candidates where a seemingly close name hid a material execution difference: supported vs unsupported wrist curl, generic row vs Pendlay dead-stop, straight vs bent-knee hanging raise, and shoulder tap without an unambiguous push-up phase.


## Cable & Machine Precision V3.2

V3.2 adds **12 reviewed mappings / 36 SVG frames**. Workout Guide now maps **76 PT650 exercises** and contains **225 local SVG frame files**. Runtime selects Workout Guide for **75** exercises because bear crawl remains on higher-priority OpenGym3D.

The V3.2 gate treats grip, handle, pulley direction, support pad, seated/standing/kneeling posture and machine geometry as semantic identity. This rejected several high-name-similarity candidates, including seated-row grip mismatch, standing T-bar versus chest-supported leverage row, kneeling-assisted versus standing-assisted pull-up/dip geometry, and ambiguous rope attachments.


## Bodyweight Precision V3.3

V3.3 adds **9 reviewed PT650 mappings**. Five source slugs required **15 new SVG files**; four mappings safely reuse already-pinned Workout Guide source frames. Workout Guide now maps **85 PT650 exercises** with **240 local SVG files**. Runtime selects Workout Guide for **84** because bear crawl still resolves to higher-priority OpenGym3D.

Bodyweight matching deliberately treats support surface, grip width, kneeling versus full plank, suspension, leg position and multi-stage movement variants as identity. Generic push-up/pull-up/crunch assets are not reused for materially different variants.


## Dumbbell Precision V3.4

V3.4 adds **8 reviewed PT650 mappings**. Seven source slugs required **21 new SVG files**; `0317` safely reuses the already-pinned `incline-dumbbell-curl` frames. Workout Guide now maps **93 PT650 exercises** with **261 local SVG files**. Runtime selects Workout Guide for **92** because bear crawl remains on higher-priority OpenGym3D.

The V3.4 gate treats seated versus standing, supported versus unsupported, unilateral versus bilateral, alternating versus simultaneous, grip rotation and bench angle as semantic identity rather than cosmetic variation.


## Barbell Precision V3.5

V3.5 adds **11 reviewed PT650 mappings**. Eight new Workout Guide source slugs required **24 new SVG files**; `0039` safely reuses the already-pinned `front-squat` frames. Workout Guide now maps **104 PT650 exercises** with **285 local SVG files**. Runtime selects Workout Guide for **103** because bear crawl remains on higher-priority OpenGym3D.

The V3.5 gate treats bench angle, grip orientation and width, seated versus standing posture, bar placement, unilateral versus bilateral execution, support geometry and dead-stop mechanics as semantic identity. Close-looking variants are explicitly blocked rather than collapsed into generic barbell assets.
