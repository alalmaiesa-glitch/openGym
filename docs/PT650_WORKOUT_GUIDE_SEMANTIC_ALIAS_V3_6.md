# PT650 Workout Guide Semantic Alias Matching V3.6 — Cable Precision Batch II

Status: **implemented**

- Pinned upstream commit: `aac599224bb9780305239607ef98540b7e0ce389`
- Cable gap before V3.6: **146**
- Accepted: **10**
- New source slugs: **4**
- New local SVG files: **12**
- Reused reviewed source slugs: **3** (`lat-pulldown`, `cable-front-raise`, `straight-arm-pulldown`)
- Workout Guide mappings after V3.6: **114**
- Unique local Workout Guide SVG files: **294**
- Runtime animation coverage: **119 / 1,327 = 8.97%**
- Cable gap after V3.6: **136**

## Acceptance rule

Cable identity includes the attachment/handle, pulley height and direction, seated/standing/kneeling/lying posture, unilateral/bilateral execution, support geometry, grip orientation and title/instruction consistency. A shared movement family is not enough.

## Accepted

- `0150` — cable bar lateral pulldown → `lat-pulldown`: standard seated straight-bar overhand pulldown to the chest.
- `0161` — cable forward raise → `cable-front-raise`: same standing straight-arm front raise to shoulder height.
- `0164` — cable front shoulder raise → `cable-front-raise`: instructions materially duplicate the reviewed front-raise movement.
- `0198` — cable pulldown → `lat-pulldown`: same seated overhand lat pulldown as reviewed `0197`.
- `0199` — cable pushdown (straight arm) v. 2 → `straight-arm-pulldown`: PT650 instructions define the reviewed straight-bar lat movement despite legacy naming.
- `0200` — cable pushdown (with rope attachment) → `rope-tricep-pushdown`: exact high-pulley rope triceps pushdown.
- `0201` — cable pushdown → `tricep-pushdown`: exact straight-bar high-pulley triceps pushdown.
- `0227` — cable standing fly → `cable-fly`: standard bilateral standing cable fly at chest height.
- `0228` — cable standing hip extension → `cable-kickback`: low-pulley ankle-cuff glute hip extension; this intentionally does **not** reopen rejected triceps record `0860`.
- `2330` — cable lat pulldown full range of motion → `lat-pulldown`: standard full-range seated overhand pulldown.

## Explicitly blocked

- `0192` one-arm lateral raise → `cable-lateral-raise` — **rejected**: unilateral vs reviewed bilateral movement.
- `0237` rope straight-arm pulldown → `straight-arm-pulldown` — **rejected**: rope vs reviewed straight bar.
- `1323` rope seated row → `seated-row` — **rejected**: attachment geometry differs.
- `0205` rear pulldown → `lat-pulldown` — **held**: title says rear while instructions describe chest pulldown.
- `0154` crossover reverse fly → `cable-rear-delt-fly` — **held**: low-pulley crossed bent-over setup not proven.
- `1722` high-pulley overhead triceps extension → `overhead-tricep-extension` — **held**: preserved V3.2 rope ambiguity.
- `0194` overhead triceps extension (rope) → `overhead-tricep-extension` — **held**: same rope ambiguity.
- `0860` cable kickback → `cable-kickback` — **rejected**: PT650 record is triceps; source is glute/hamstring.
- `0245` underhand pulldown → `lat-pulldown` — **rejected**: grip mismatch.
- `0177` rope lateral pulldown → `lat-pulldown` — **rejected**: standing rope vs seated bar.
- `2616` V-bar pulldown → `close-grip-lat-pulldown` — **held**: exact V-bar geometry not proven.
- `0818` twin-handle parallel-grip pulldown → `close-grip-lat-pulldown` — **held**: exact handle/grip geometry not proven.

## Asset integrity

The 12 new SVGs were copied verbatim from the pinned source. Their target Git blob SHAs equal the upstream blob SHAs. The final tree has **294 referenced unique Workout Guide SVGs and 294 physical SVG files**, with **0 missing** and **0 extra**.

## Next

Continue with **V3.7 — Dumbbell Precision II** only after this V3.6 baseline is green in CI.
