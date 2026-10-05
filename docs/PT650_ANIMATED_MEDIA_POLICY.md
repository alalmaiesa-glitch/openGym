# PT650 — Animated Exercise Media Policy

This policy is mandatory for all built-in exercise demonstration media in PT650.

## Non-negotiable rule

**Every built-in exercise demonstration video must be animated. Real people are not permitted.**

Allowed:
- 3D animated human figures
- stylized anatomical avatars
- rigged digital characters
- vector / cel / motion-graphic exercise demonstrations
- skeletal or biomechanical animation when it remains clear and instructional

Not allowed:
- filmed trainers or athletes
- stock footage containing real people
- real-person gym footage
- AI-generated photorealistic humans intended to look like real footage
- licensed real-person exercise clips, even when a commercial license is available
- inherited third-party real-person exercise video libraries

## Visual direction

The PT650 standard is:
- dark neutral background
- one clearly readable animated athlete
- realistic joint range without exaggerated motion
- target muscles may be highlighted
- seamless short loop
- no logos, brands, watermarks or background distractions
- no unnecessary camera movement
- no audio required for the core demonstration
- suitable for RTL and mobile layouts

## Accuracy

Animation must demonstrate the actual exercise represented by the exercise ID. A generic movement
must never be presented as an exact exercise-specific demonstration.

Where an approved animation does not yet exist, PT650 must display a neutral animated/schematic
fallback rather than substitute footage of a real person.

## Licensing

Animations must be:
1. created specifically for PT650, or
2. independently licensed with rights that clearly permit PT650's intended distribution.

Source/provenance must be recorded before an animation is shipped.

## Scope

This rule applies to built-in exercise instruction/demo media. It does not prohibit a user from
attaching their own private progress/form-check media to their own local profile; such user media
is not PT650-provided instructional content.


## Animation library

PT650 now uses a small internal exercise-animation registry. Each approved animation is bound to
one exact catalogue exercise ID and name; tests fail if an animation is accidentally attached to
a different exercise.

| Exercise ID | Exercise | Model | Medium | Provenance |
| --- | --- | --- | --- | --- |
| `0025` | barbell bench press | `bench-press-v1` | authored SVG motion | PT650 original |
| `0043` | barbell full squat | `full-squat-v1` | authored SVG motion | PT650 original |
| `0662` | push-up | `push-up-v1` | authored SVG motion | PT650 original |

The inherited built-in image/GIF catalogue is not requested by the PT650 built-in media component.
Exercises without an approved exact model render a neutral schematic fallback until their own
exercise-specific animation is authored and approved.

## Expansion rule

New models must be added through the animation registry rather than by embedding ad-hoc media URLs
in exercise cards. Every new entry must include its exact exercise ID, canonical catalogue name,
medium, provenance and version, and must remain covered by the registry binding test.
