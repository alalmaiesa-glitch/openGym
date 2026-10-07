# PT650 Animation Coverage Gap Analysis V1

Status: **implemented**

This baseline measures real renderable animation coverage after Workout Guide Semantic Alias Matching V3. It uses the provider resolver rather than raw asset counts, so higher-priority providers win exactly as they do at runtime.

## Baseline

- PT650 catalogue: **1,327 exercises** = 1,324 imported catalogue exercises + 3 PT650-native exercises.
- Resolved animation coverage: **62 exercises**.
- Uncovered: **1,265 exercises**.
- Coverage: **4.67%**.

Selected runtime providers:

- PT650 / OpenGym3D: **6**
- PT650 Authored SVG: **4**
- Workout Guide: **52**

Workout Guide contains 53 mapped exercises, but `3360` bear crawl resolves to the higher-priority OpenGym3D provider. This is expected and proves that raw map count is not the same as runtime-selected coverage.

## Largest body-part gaps

| Body part | Missing |
| --- | ---: |
| upper arms | 284 |
| upper legs | 204 |
| back | 190 |
| waist | 158 |
| chest | 151 |
| shoulders | 133 |
| lower legs | 59 |
| lower arms | 36 |
| cardio | 24 |
| full body | 24 |
| neck | 2 |

## Largest equipment gaps

| Equipment | Missing |
| --- | ---: |
| body weight | 297 |
| dumbbell | 286 |
| cable | 148 |
| barbell | 147 |
| leverage machine | 80 |
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
