# PT650 — OpenGym3D CC0 Source Audit

Pinned upstream commit: `ea3a60130fdcfb3c4771e44d09f84ebab4ee9bae`

PT650 reviewed the OpenGym3D asset library and exercise specifications for motions that are
redistributable in the public PT650 build. Only sources whose motion licence is CC0-1.0 are
eligible for direct mirroring.

| OpenGym3D motion | Licence | Upstream spec | PT650 match | State |
| --- | --- | --- | --- | --- |
| Pushup | CC0-1.0 | `push_up.json` | `0662` push-up | integrated |
| Crawl | CC0-1.0 | `bear_crawl.json` | `3360` bear crawl | integrated |
| Sprint | CC0-1.0 | `run.json` | `0685` run | integrated |
| Jumping Jacks | CC0-1.0 | `jumping_jack.json` | no exact canonical PT650 match | hold |
| Jog | CC0-1.0 | `jog.json` | no exact canonical PT650 match | hold |
| Walk | CC0-1.0 | `walk.json` | no exact canonical PT650 match | hold |
| Meditate | CC0-1.0 | `seated_meditation.json` | no exact canonical PT650 match | hold |

PT650 deliberately does not map a source motion merely because it looks similar. The exercise
must have a defensible canonical match in the PT650 catalogue. This avoids attaching a visually
plausible but semantically wrong animation to an exercise.

Mixamo, CMU app-only motion, and video-demo pose data remain excluded from the public mirrored
asset registry even when they are useful for research or internal QA.
