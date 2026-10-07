# PT650 Workout Guide Semantic Alias Matching V3.4 — Dumbbell Precision Batch

Status: **implemented**

- Pinned upstream commit: `aac599224bb9780305239607ef98540b7e0ce389`
- Accepted: **8**
- New local SVG files: **21**
- Reused pinned source slug: **1**
- Workout Guide mappings after V3.4: **93**
- Local Workout Guide SVG files: **261**
- Runtime animation coverage: **102 / 1,327 = 7.69%**

## Accepted

- `0294` — dumbbell biceps curl → `bicep-curl`: PT650 describes the standard standing two-dumbbell supinated biceps curl; source frames show the same standing curl with matching equipment and arm path.
- `0317` — dumbbell incline curl v. 2 → `incline-dumbbell-curl`: PT650 describes the same seated incline-bench dumbbell curl already visually verified for this source slug; no grip or support difference is introduced.
- `0431` — dumbbell step-up → `step-up`: Same dumbbell step-up onto a bench/box with one foot fully supported and a controlled step-down.
- `1760` — dumbbell goblet squat → `goblet-squat`: Same goblet squat with one dumbbell held vertically at the chest and a standard squat path.
- `0334` — dumbbell lateral raise → `lateral-raise`: Same standing bilateral dumbbell lateral raise to shoulder height with a slight elbow bend.
- `0310` — dumbbell front raise → `front-raise`: Same standing bilateral dumbbell front raise to shoulder level with straight arms and no alternate or seated variation.
- `2292` — dumbbell rear delt raise → `rear-delt-fly`: PT650 uses a standing hip hinge and raises both dumbbells laterally for the rear delts; source rear-delt fly frames show the same unsupported bent-over pattern.
- `0410` — dumbbell single leg split squat → `bulgarian-split-squat`: Although PT650 calls it single-leg split squat, its instructions explicitly elevate the rear foot on a bench; that is the same dumbbell Bulgarian split squat shown by the source.

## Explicitly blocked

- `0292` — dumbbell one arm bent-over row → `one-arm-dumbbell-row` — **rejected**: PT650 describes an unsupported hip-hinged one-arm row; source frames brace the free hand and knee on a bench. Support geometry differs.
- `0313` — dumbbell hammer curl → `hammer-curl` — **rejected**: PT650 instructions rotate the palms forward before curling, conflicting with the neutral grip that defines a hammer curl. The PT650 record is internally inconsistent.
- `1677` — dumbbell seated bicep curl → `bicep-curl` — **rejected**: PT650 is seated on a bench; source bicep-curl frames are standing. Body position differs.
- `1735` — dumbbell lying single extension → `single-arm-dumbbell-tricep-extension` — **rejected**: PT650 is a lying single-arm extension toward the forehead; source is a standing overhead single-arm extension. Position and elbow path differ.
- `2137` — dumbbell arnold press → `arnold-press` — **rejected**: PT650 explicitly performs the Arnold press seated with back support; source frames depict a standing Arnold press.
- `0287` — dumbbell arnold press v. 2 → `arnold-press` — **rejected**: Same seated-with-back-support mismatch as PT650 2137 versus the standing source asset.
- `0333` — dumbbell kickback → `tricep-kickback` — **rejected**: PT650 uses both arms unsupported in a hip hinge; source is a single-arm kickback with the opposite arm supported on a bench.
- `2133` — farmers walk → `farmer-carry` — **held**: Movement and equipment appear equivalent, but PT650 classifies quadriceps as the target while the source classifies forearms/upper back/core. Hold until the PT650 exercise taxonomy is normalized.
- `3545` — dumbbell incline alternate press → `incline-dumbbell-press` — **rejected**: PT650 requires alternating arms; the source represents the standard simultaneous incline dumbbell press.
- `1624` — dumbbell reverse bench press → `dumbbell-bench-press` — **rejected**: Reverse-grip bench pressing is a material grip variant not represented by the standard dumbbell bench press asset.
- `1743` — dumbbell twisting bench press → `dumbbell-bench-press` — **rejected**: PT650 includes a rotational/twisting press component that is absent from the standard source bench press.
- `0374` — dumbbell prone incline curl → `incline-dumbbell-curl` — **rejected**: PT650's prone incline setup is not equivalent to the source's seated/reclined incline curl posture.

## Guardrail

Dumbbell variants are not interchangeable merely because the same joint action appears in the name. V3.4 rejects mismatches in bench support, seated/standing posture, unilateral/bilateral execution, alternating timing, grip orientation and rotation.
