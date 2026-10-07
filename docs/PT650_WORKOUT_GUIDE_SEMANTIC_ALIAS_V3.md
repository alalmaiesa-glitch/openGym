# PT650 Workout Guide Semantic Alias Matching V3

Status: **implemented**

- Upstream: `bryllim/workout-guide`
- Pinned commit: `aac599224bb9780305239607ef98540b7e0ce389`
- Added: **11 exercises / 33 SVG frames**
- Workout Guide local total: **53 exercises / 159 SVG frames**
- PT650 resolved animation coverage after V3: **62 / 1,327 = 4.67%**

## Rule

A semantic alias is accepted only when all of the following agree:

1. movement identity;
2. equipment / support;
3. target-muscle meaning;
4. PT650 instructions;
5. pinned Workout Guide visual frames;
6. licence and provenance.

Similarity score is candidate generation only. It never activates an asset.

## Accepted V3 aliases

- `0171` — cable incline fly → `incline-cable-fly` — Same incline cable-fly movement; alias differs only by word order. PT650 instructions also specify an incline bench and low cable handles.
- `0318` — dumbbell incline curl → `incline-dumbbell-curl` — Same incline dumbbell curl; alias differs only by word order and frames show the incline-bench curl.
- `0861` — cable seated row → `seated-row` — Same seated cable row; source name omits no movement detail and frames show seated cable rowing with foot support.
- `0030` — barbell close-grip bench press → `close-grip-bench-press` — Same close-grip bench press; source equipment metadata supplies Barbell and frames show the close-grip barbell press.
- `0033` — barbell decline bench press → `decline-bench-press` — Same decline barbell bench press; source name omits the redundant equipment word while metadata and frames confirm Barbell.
- `0047` — barbell incline bench press → `incline-bench-press` — Same incline barbell bench press; source name omits the redundant equipment word while metadata and frames confirm Barbell.
- `0165` — cable hammer curl (with rope) → `rope-hammer-curl` — Same rope hammer curl on a cable; PT650 explicitly says rope attachment and source metadata is Cable with matching biceps/forearm semantics.
- `0168` — cable hip adduction → `cable-standing-hip-adduction` — Same standing cable hip adduction; PT650 instructions explicitly use an ankle cuff while standing and frames show the same setup.
- `0196` — cable pull through (with rope) → `cable-pull-through` — Same cable pull-through; PT650 explicitly specifies the rope and source frames show the low-pulley hip-hinge movement.
- `0238` — cable straight arm pulldown → `straight-arm-pulldown` — Same straight-arm cable pulldown; source equipment is Cable and frames preserve the straight-arm high-cable movement.
- `1311` — wide hand push up → `wide-push-up` — Same wide-hand push-up; source frames clearly show the wide hand placement and bodyweight chest movement.

## Blocked deceptive aliases

- `0651` — pull up (neutral grip) → `neutral-grip-pull-up` — **held**: Name and metadata look strong, but the pinned frames use a straight horizontal bar and do not visually establish a neutral grip. Do not map until grip geometry is unambiguous.
- `0290` — dumbbell bench seated press → `dumbbell-bench-press` — **rejected**: PT650 targets delts and describes a seated press; the candidate is a chest bench press. Token overlap is misleading.
- `0303` — dumbbell decline hammer press → `decline-dumbbell-press` — **rejected**: Hammer/neutral-grip variation is material and is not established by the generic decline dumbbell press asset.
- `0320` — dumbbell incline hammer curl → `incline-dumbbell-curl` — **rejected**: Hammer grip differs from the reviewed incline dumbbell curl asset; do not collapse grip-specific exercises.
- `0321` — dumbbell incline hammer press → `incline-dumbbell-press` — **rejected**: Hammer/neutral grip is a material variation not represented by the generic incline press mapping.
- `0324` — dumbbell incline palm-in press → `incline-dumbbell-press` — **rejected**: Palm-in grip is a material variation not represented by the generic incline press mapping.
- `1283` — dumbbell incline press on exercise ball → `incline-dumbbell-press` — **rejected**: PT650 uses an exercise ball while the source asset uses an incline bench; support/equipment semantics differ.
- `3662` — pike-to-cobra push-up → `pike-push-up` — **rejected**: PT650 is a pike-to-cobra transition sequence; the source asset represents only the pike push-up.

## Runtime

Workout Guide remains priority 200. Existing OpenGym3D and PT650-authored mappings retain precedence. The V3 ingest expands fallback coverage only; it does not change exercise IDs or provider ordering.
