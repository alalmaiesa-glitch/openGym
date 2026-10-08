# PT650 / OpenGym — cleanup of previously added exercise motion

Decision date: 2026-10-08

## Removed
- All 294 previously imported Workout Guide SVG frames, attribution/licence bundles and all mapped movements from V1–V3.6.
- Six PT650/OpenGym3D published 3D models and previews, including their automatic GitHub Pages mirroring job.
- Five original schematic SVG exercise animation renderers/registrations.
- Built-in exercise demonstration panels, placeholder messages and Library animation indicators.
- Obsolete 3D factory CI jobs and asset verification scripts.

## Preserved
- All **1,327 exercise records**, names, techniques, translations, IDs and equipment metadata.
- Workout plans, active sessions, saved history, progress analytics and all user-owned custom exercise/workout photos and videos.
- The dormant provider interface and the approved but **deferred** Exercise Animatic option. No licensed paid media has been integrated.

## Regression
Unit/integration tests assert zero external motion mappings, no shipped Workout Guide frames, no 3D mirror, no public built-in animation player and complete original catalogue coverage. Old motion experiments remain recoverable from Git history if separately authorized.
