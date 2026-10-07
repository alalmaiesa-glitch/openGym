# PT650 Animation Coverage Gap Analysis V1

Status: **implemented**

This baseline measures real renderable animation coverage after Workout Guide Semantic Alias Matching V3.2. It uses the provider resolver rather than raw asset counts, so higher-priority providers win exactly as they do at runtime.

## Baseline

- PT650 catalogue: **1,327 exercises** = 1,324 imported catalogue exercises + 3 PT650-native exercises.
- Resolved animation coverage: **85 exercises**.
- Uncovered: **1,242 exercises**.
- Coverage: **6.41%**.

Selected runtime providers:

- PT650 / OpenGym3D: **6**
- PT650 Authored SVG: **4**
- Workout Guide: **75**

Workout Guide contains 76 mapped exercises, but `3360` bear crawl resolves to the higher-priority OpenGym3D provider. This is expected and proves that raw map count is not the same as runtime-selected coverage.

## Largest body-part gaps

| Body part | Missing |
| --- | ---: |
| upper arms | 281 |
| upper legs | 193 |
| back | 189 |
| waist | 155 |
| chest | 149 |
| shoulders | 133 |
| lower legs | 59 |
| lower arms | 36 |
| cardio | 24 |
| full body | 24 |
| neck | 2 |

## Largest equipment gaps

| Equipment | Missing |
| --- | ---: |
| body weight | 295 |
| dumbbell | 281 |
| cable | 146 |
| barbell | 143 |
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
