# PT650 Workout Guide Semantic Alias Matching V3.5 — Barbell Precision Batch

Status: **implemented**

- Pinned upstream commit: `aac599224bb9780305239607ef98540b7e0ce389`
- Accepted: **11**
- New local SVG files: **24**
- Reused pinned source slug: **1** (`front-squat`)
- Workout Guide mappings after V3.5: **104**
- Local Workout Guide SVG files: **285**
- Runtime animation coverage: **113 / 1,327 = 8.52%**

## Accepted

- `0027` — barbell bent over row → `barbell-row`: Standard bilateral overhand bent-over row with matching unsupported hip hinge and pull path.
- `0032` — barbell deadlift → `deadlift`: Same conventional floor deadlift with hip-and-knee extension and controlled return.
- `0039` — barbell front chest squat → `front-squat`: Front-loaded bar at chest level with elbows forward and a standard front-squat path.
- `0043` — barbell full squat → `squat`: Same standard bilateral barbell back squat with the bar across the upper back.
- `0060` — barbell lying triceps extension skull crusher → `skull-crusher`: Same flat-bench elbow-extension pattern toward the forehead.
- `0080` — barbell reverse curl → `reverse-curl`: Same standing pronated-grip barbell curl; target-muscle weighting differs but movement identity does not.
- `0117` — barbell sumo deadlift → `sumo-deadlift`: Same wide-stance floor pull with the bar centered between the feet.
- `0119` — barbell upright row v. 2 → `upright-row`: Instructions are materially identical to the standard reviewed upright row.
- `0120` — barbell upright row → `upright-row`: Same standing bilateral overhand row toward the chin, led by the elbows.
- `0121` — barbell upright row v. 3 → `upright-row`: Same standard upright-row mechanics; safe duplicate-variant alias.
- `3562` — barbell glute bridge two legs on bench (male) → `hip-thrust`: PT650 instructions explicitly place the upper back on a bench with the bar over the hips, which is the source hip-thrust setup.

## Explicitly blocked

- `1719` — barbell incline close grip bench press → `close-grip-bench-press` — **rejected**: incline versus flat bench.
- `2187` — barbell reverse close-grip bench press → `close-grip-bench-press` — **rejected**: reverse grip is material.
- `0045` — barbell guillotine bench press → `bench-press` — **rejected**: neck-directed bar path and elbow flare differ.
- `0052` — barbell JM bench press → `bench-press` — **rejected**: JM press has distinct elbow/bar mechanics.
- `0090` — barbell seated good morning → `good-morning` — **rejected**: seated versus standing support.
- `0091` — barbell seated overhead press → `overhead-press` — **rejected**: seated versus standing posture.
- `0122` — barbell wide bench press → `bench-press` — **rejected**: explicit wide-grip variant.
- `0123` — barbell wide-grip upright row → `upright-row` — **rejected**: explicit wide-grip geometry.
- `1256` — barbell reverse grip decline bench press → `decline-bench-press` — **rejected**: reverse grip.
- `1257` — barbell reverse grip incline bench press → `incline-bench-press` — **rejected**: reverse grip.
- `0081` — barbell reverse preacher curl → `reverse-curl` — **rejected**: preacher-pad support differs.
- `0082` — barbell reverse wrist curl → `reverse-curl` — **rejected**: wrist action versus elbow curl.
- `0024` — barbell bench front squat → `front-squat` — **held**: title and instructions disagree about bench use.
- `0029` — barbell clean-grip front squat → `front-squat` — **held**: named grip geometry is not proven by the generic source.
- `1435` — barbell low bar squat → `squat` — **rejected**: low-bar placement changes torso/bar mechanics.
- `1436` — barbell high bar squat → `squat` — **held**: generic source does not explicitly establish high-bar placement.

The earlier V3.1 rejections for `0038` drag curl, `3017` Pendlay row and `0126` wrist curl remain authoritative and were not reopened.

## Guardrail

Barbell exercises are not interchangeable because they share the same base lift. V3.5 treats bench angle, grip width and orientation, seated/standing posture, bar placement, unilateral/bilateral execution, external support and dead-stop mechanics as part of semantic identity. Any unresolved mismatch remains unavailable.
