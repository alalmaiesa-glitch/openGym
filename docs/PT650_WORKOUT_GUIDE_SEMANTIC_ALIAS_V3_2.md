# PT650 Workout Guide Semantic Alias Matching V3.2 — Cable & Machine Precision Batch

Status: **implemented**

- Pinned upstream commit: `aac599224bb9780305239607ef98540b7e0ce389`
- Accepted: **12**
- Added local SVG files: **36**
- Workout Guide mappings after V3.2: **76**
- Local Workout Guide SVG files: **225**
- Runtime animation coverage: **85 / 1,327 = 6.41%**

## Acceptance rule

Cable and machine aliases require agreement on movement, equipment, body support, body position, handle/grip semantics and cable/pulley direction where applicable. A matching exercise family is not enough.

## Accepted

- `0175` — cable kneeling crunch → `cable-crunch`: PT650 specifies a kneeling high-pulley rope crunch; the source frames show the same kneeling cable-crunch posture and high cable path.
- `0197` — cable pulldown (pro lat bar) → `lat-pulldown`: PT650 describes a seated overhand lat-bar pulldown to the chest; source equipment, bar path, seated support and lat movement match.
- `0585` — lever leg extension → `leg-extension`: Same seated machine leg extension with padded shin lever and knee extension.
- `0586` — lever lying leg curl → `lying-leg-curl`: Same prone machine leg curl; body position, heel pad and knee-flexion path match PT650.
- `0592` — lever preacher curl → `preacher-curl`: Same machine preacher curl with upper arms supported on the preacher pad and underhand curl path.
- `0593` — lever reverse hyperextension → `reverse-hyperextension`: Same reverse-hyperextension machine pattern with torso supported and legs extending behind the body.
- `0594` — lever seated calf raise → `seated-calf-raise`: Same seated calf-raise machine with knee/thigh loading and plantar-flexion movement.
- `0597` — lever seated hip abduction → `hip-abduction-machine`: Same seated hip-abduction machine; pads, seated support and outward leg path match PT650.
- `0598` — lever seated hip adduction → `hip-adduction-machine`: Same seated hip-adduction machine; pads, seated support and inward leg path match PT650.
- `0599` — lever seated leg curl → `seated-leg-curl`: Same seated machine leg curl with back support, lower-leg pad and knee-flexion movement.
- `0605` — lever standing calf raise → `standing-calf-raise`: Same standing calf-raise machine with shoulder support and ankle plantar flexion.
- `1385` — lever seated squat calf raise on leg press machine → `leg-press-calf-raise`: PT650 explicitly uses a leg-press footplate for calf raises; source frames show the same leg-press calf-raise setup.

## Explicitly blocked

- `0180` — cable low seated row → `seated-row` — **rejected**: PT650 specifies an overhand palms-down handle; the reviewed source depicts a close/neutral seated-row handle. Handle and grip semantics differ.
- `0606` — lever t bar row → `t-bar-row` — **rejected**: PT650 specifies a seated chest-supported leverage row; the reviewed source depicts a standing T-bar/landmine-style row. Body support and machine geometry differ.
- `0576` — lever chest press → `machine-chest-press` — **held**: Machine and press direction match, but the reviewed frames do not establish PT650's specified overhand grip clearly enough for strict V3.2 acceptance.
- `0577` — lever chest press → `machine-chest-press` — **held**: Duplicate PT650 entry has the same unresolved grip-geometry ambiguity as 0576; keep unavailable until grip is proven.
- `1432` — assisted standing pull-up → `assisted-pull-up` — **rejected**: PT650 describes standing on a foot platform; the source assisted-pull-up frames use a knee/support-pad assistance posture. Support mechanism differs.
- `0572` — lever assisted chin-up → `assisted-chin-up` — **rejected**: PT650's own instructions specify an overhand grip despite the chin-up name; source is labelled chin-up. The exercise identity is internally inconsistent, so no asset is assigned.
- `1431` — assisted standing chin-up → `assisted-chin-up` — **rejected**: PT650's instructions again specify an overhand grip while the source identity is chin-up; do not guess through the naming/instruction conflict.
- `0009` — assisted chest dip (kneeling) → `assisted-dip` — **rejected**: PT650 requires a kneeling counterweight pad; reviewed source frames depict a seated dip-style machine/support geometry.
- `0019` — assisted triceps dip (kneeling) → `assisted-dip` — **rejected**: PT650 requires kneeling assistance; source body support and machine geometry do not match.
- `1722` — cable high pulley overhead tricep extension → `overhead-tricep-extension` — **held**: Body position and cable direction match, but PT650 explicitly requires a rope attachment and the reviewed frames do not prove the attachment type unambiguously.
- `1253` — lever donkey calf raise → `donkey-calf-raise` — **rejected**: The source donkey-calf-raise frames are partner-loaded rather than a leverage machine, so loading mechanism and equipment do not match.

## Runtime

Workout Guide remains priority 200 and does not override OpenGym3D or PT650-authored media.
