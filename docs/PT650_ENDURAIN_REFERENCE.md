# PT650 — Endurain Reference Adoption

Status: **Approved reference**  
Upstream: `endurain-project/endurain` (default branch: `master`)  
Reference reviewed: 2026-10-06

## Decision

PT650 adopts Endurain as a **functional and architectural reference** for endurance activity,
health-data ingestion and athlete-history capabilities.

This is not a product fork and does not make Endurain's UI, brand, copy or assets part of PT650.
PT650 keeps its own product architecture, Supabase platform core, reward economy, Machine Scan,
animated exercise system and 2035 athlete-network roadmap.

## Why it matters to PT650

Endurain already demonstrates a mature separation of concerns around:

- activity records and summaries;
- activity streams and laps;
- structured workout steps;
- Garmin Connect integration;
- Strava integration;
- manual FIT / GPX / TCX activity import;
- health steps;
- sleep;
- body weight;
- water;
- fasting;
- health targets;
- gear and gear components;
- calendar views;
- real-time/WebSocket update patterns.

These are strong reference primitives for PT650's planned **Move + Health + Wearables + Nutrition +
Coach** system.

## PT650 adoption map

| Endurain concept | PT650 decision |
|---|---|
| Activities / summaries | Adopt the domain split; map verified PT650 Move events into a canonical Activity layer |
| Activity streams | Adopt concept for heart rate, pace, cadence, power, elevation and future sensor streams |
| Laps | Adopt concept for running, cycling, interval work and event preparation |
| Workout steps | Adopt concept; bridge endurance prescriptions with PT650 strength plans |
| FIT / GPX / TCX | Add a PT650 import-adapter lane; imported data is distinct from live verified reward evidence |
| Garmin Connect | Add as a wearable/provider adapter |
| Strava | Add as an activity-provider adapter, subject to provider terms and user consent |
| Health steps | Fold into PT650 Health Timeline and Verified Activity inputs |
| Sleep | Fold into Recovery / Readiness inputs; never present inferred medical diagnosis |
| Weight | Use as a shared PT650 body metric, usable by training and Nutrition |
| Water | Use in Nutrition / hydration tracking |
| Fasting | Optional Nutrition timeline capability |
| Health targets | Adopt as user-owned goals; sponsor rewards remain a separate verified challenge contract |
| Gear / components | Adapt for athlete-owned gear; keep commercial gym Equipment Passport as a separate richer PT650 model |
| Calendar | Build one athlete calendar across strength, cardio, recovery, nutrition and events |
| WebSocket/realtime | Use Supabase realtime/streaming where justified; do not copy implementation mechanically |

## Gaps PT650 must build beyond Endurain

Endurain is not the complete PT650 device strategy. PT650 must add independent adapters for:

1. **Apple Health / HealthKit** — iPhone + Apple Watch.
2. **Android Health Connect** — Android watches/apps through the Android health data layer.
3. **Huawei Health ecosystem** — where permitted by Huawei APIs, regional availability and user consent.
4. Additional providers over time through a provider-neutral adapter contract.
5. PT650-native GPS verification and anti-fraud evidence for rewards.
6. Gym-machine identity and verified equipment use.
7. Nutrition AI, recovery services, coach marketplace and reward economy.

The provider contract must ensure that PT650's core data model does not depend on any single watch
manufacturer or fitness platform.

## Canonical PT650 health/activity model

Provider data should normalize into stable PT650 concepts rather than leak vendor schemas into the
rest of the product:

```text
Provider / File / Sensor
        |
        v
Ingest Adapter
        |
        v
Raw import envelope (minimal retention)
        |
        v
Canonical Activity / Health Observation
        |
        +--> Activity streams (HR / pace / cadence / power / elevation)
        +--> Laps / intervals
        +--> Sleep / recovery observations
        +--> Steps / distance / active minutes
        +--> Weight / hydration / nutrition observations
        |
        v
Trust + provenance + dedupe
        |
        +--> Athlete timeline
        +--> Training adaptation
        +--> Nutrition adaptation
        +--> Recovery/readiness
        +--> Verified challenge eligibility (only when evidence policy allows it)
```

Every normalized record must keep provenance: provider, provider record id, capture time, import
time, trust class, and user consent scope.

## Reward boundary

A health provider record is **not automatically reward-valid**.

PT650 must distinguish:

- `observed` — useful for the athlete timeline and recommendations;
- `trusted-provider` — signed/authoritative provider data with an accepted provenance chain;
- `verified-reward` — meets the explicit anti-fraud and evidence policy of a particular challenge.

This prevents a convenient import path from becoming an easy reward-fraud path.

## Licensing and trademark rule

Endurain is distributed under **AGPL-3.0** and its name/logo are covered by a trademark policy.

PT650 may study architecture and behaviour and may implement compatible ideas independently.
Do not import Endurain branding, screenshots, copy or visual assets into PT650. Any future proposal
to copy source code directly must receive an explicit license/compliance review first, even though
the inherited PT650 repository is itself AGPL-based today.

## Implementation order

The recommended PT650 sequence after Workout Cloud Sync V1 is:

1. **Health Data Core V1** — canonical observations, provenance, consent and dedupe.
2. **Activity Import V1** — FIT / GPX / TCX.
3. **Health Connect adapter** for Android.
4. **HealthKit adapter** for iOS / Apple Watch.
5. **Garmin adapter**.
6. **Strava adapter**.
7. **Huawei adapter feasibility + implementation**.
8. **Recovery / Readiness V1** from sleep, activity load and user-reported state.
9. Feed approved health metrics into **Nutrition AI** and the future **PT650 Coach**.
10. Keep reward eligibility behind a separate verification policy per challenge.

## Non-goals

- Replacing PT650 with Endurain.
- Copying Endurain's UI.
- Making manufacturer or advertiser access to individual health data possible.
- Treating imported steps as verified rewards without an explicit evidence policy.
- Making medical diagnoses from consumer wearable data.
