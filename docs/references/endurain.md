# PT650 — Endurain Reference Adoption

Status: **Adopted as a functional and architectural reference**

Upstream reference:
- Repository: `endurain-project/endurain`
- Default branch observed: `master`
- Pinned commit: `2d8a1aa7e1048e428e17840a41245537f8cda9aa`
- License: **AGPL-3.0**
- Product posture: self-hosted fitness tracking with privacy/control as a core design goal

## License boundary

PT650 may study Endurain's public behavior, architecture, data domains, API shapes, and product flows. Architecture decisions should be evaluated against the pinned commit above; newer upstream changes require a deliberate re-review before adoption.

PT650 **must not copy Endurain source code, UI assets, text, trademarks, or implementation fragments** into PT650 unless a separate legal/licensing decision is made. The current adoption is therefore **clean-room functional reimplementation** only.

## What PT650 adopts conceptually

### 1. Unified activity model
PT650 will treat endurance and outdoor activity as first-class activity data, not as an isolated Move feature.

Planned canonical domains:
- activity
- activity summary
- activity stream
- laps
- workout steps
- route/elevation
- activity media
- imported source metadata
- verification provenance

### 2. Import and connector architecture
Endurain validates the usefulness of a dedicated ingestion layer for:
- Garmin Connect
- Strava
- FIT
- GPX
- TCX

PT650 will implement each source behind its own adapter. Imported data is normalized into PT650-owned canonical records before downstream use.

### 3. Health domains
PT650 adopts the idea of separating health domains rather than storing one unstructured "health blob".

Initial PT650 domains:
- steps
- sleep
- weight/body composition
- hydration
- fasting
- health/activity targets

PT650 extensions beyond Endurain:
- resting heart rate
- HRV
- SpO2
- respiratory rate
- skin/body temperature where supported
- active energy
- basal energy
- training load/readiness
- recovery
- nutrition/macros
- wearable provenance and data confidence

### 4. Gear and equipment
PT650 will treat equipment as an owned/used asset with history rather than a label.

This connects directly to PT650's existing machine intelligence vision:
- manufacturer
- model
- equipment instance
- components
- usage history
- maintenance/condition where relevant
- QR/NFC/camera identification
- manufacturer analytics
- athlete feedback
- rewards

### 5. Calendar and timeline
Activity, training plan, recovery, health targets and nutrition should converge into one athlete timeline/calendar instead of separate silos.

### 6. Live updates
PT650 will keep event-driven/near-real-time updates for:
- completed activities
- reward settlement
- wearable imports
- coach feedback
- recovery/readiness changes

The implementation does not have to use the same technology as Endurain.

## What PT650 will not assume from Endurain

No current Endurain source evidence was found for native:
- Apple Health / HealthKit
- Android Health Connect
- Huawei Health

Therefore PT650 treats these as **new adapter work**, not inherited capability.

## PT650 target adapter matrix

| Source | PT650 role | Direction |
| --- | --- | --- |
| Apple Health / HealthKit | primary iOS health source | import |
| Android Health Connect | primary Android health source | import |
| Huawei Health | Huawei ecosystem source | import |
| Garmin Connect | endurance/wearable source | import |
| Strava | endurance/social activity source | import |
| FIT | portable activity file | import |
| GPX | route/activity file | import |
| TCX | workout/activity file | import |
| PT650 Move | first-party verified GPS source | native |
| PT650 Workout | first-party strength/training source | native |
| PT650 Machine Scan | first-party equipment intelligence source | native |

## PT650 differentiation

Endurain is a strong reference for fitness tracking and health/activity data organization.

PT650's product direction remains broader:
- strength + endurance + walking + gym equipment intelligence
- nutrition AI
- rewards and sponsor-funded challenges
- manufacturer network and equipment map
- club/travel discovery and instant access
- recovery clinics / massage / spa marketplace
- coach marketplace
- camera-based exercise/equipment guidance
- 2035 path: live coach, spatial/VR coaching and persistent athlete intelligence

## Implementation sequence after adoption

1. **Health & Endurance Core V1**
   - canonical health observations
   - activity records
   - activity streams/laps
   - source/device provenance
   - idempotent import

2. **Wearable Adapter Framework V1**
   - adapter registry
   - OAuth/token vault boundary
   - cursor/checkpoint ingestion
   - dedupe + source precedence

3. **Native platform adapters**
   - HealthKit
   - Health Connect
   - Huawei Health

4. **External endurance adapters**
   - Garmin
   - Strava
   - FIT/GPX/TCX import

5. **Athlete Timeline**
   - unified training + activity + recovery + nutrition timeline

6. **Readiness / Recovery Layer**
   - transparent derived metrics
   - confidence/provenance
   - no medical diagnosis claims
