import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { animatedModelFor, PT650_ANIMATION_MODELS } from './PT650ExerciseAnimation.jsx'
import { EXIDX } from '../lib/exercises.js'

describe('PT650 animated built-in exercise media', () => {
  it('registers the approved exercise-specific animation library', () => {
    expect(animatedModelFor('0001')).toMatchObject({
      id: 'three-quarter-sit-up-v1',
      exercise: '3/4 sit-up',
      target: ['abs', 'hip flexors'],
      medium: 'authored-svg-motion',
      provenance: 'PT650 original',
      version: 1,
    })
    expect(animatedModelFor('0002')).toMatchObject({
      id: 'side-bend-45-v1',
      exercise: '45° side bend',
      target: ['abs', 'obliques'],
    })
    expect(animatedModelFor('0025')).toMatchObject({
      id: 'bench-press-v1',
      exercise: 'barbell bench press',
    })
    expect(animatedModelFor('0043')).toMatchObject({
      id: 'full-squat-v1',
      exercise: 'barbell full squat',
      target: ['quads', 'glutes'],
    })
    expect(animatedModelFor('0662')).toMatchObject({
      id: 'push-up-v1',
      exercise: 'push-up',
      target: ['pectorals', 'triceps'],
    })
    expect(Object.keys(PT650_ANIMATION_MODELS)).toEqual(['0001', '0002', '0025', '0043', '0662'])
  })

  it('keeps every animation model bound to the exact catalogue exercise id and name', () => {
    for (const [exerciseId, model] of Object.entries(PT650_ANIMATION_MODELS)) {
      expect(EXIDX[exerciseId]?.n).toBe(model.exercise)
    }
  })

  it('never requests inherited real-person built-in image/GIF assets', () => {
    const media = readFileSync(new URL('./Media.jsx', import.meta.url), 'utf8')
    const animation = readFileSync(new URL('./PT650ExerciseAnimation.jsx', import.meta.url), 'utf8')
    const providerMedia = readFileSync(new URL('./PT650AnimationProviderMedia.jsx', import.meta.url), 'utf8')
    expect(media).not.toContain('imgSrc(')
    expect(media).not.toContain('gifSrc(')
    expect(media).not.toMatch(/from ['"]\.\.\/lib\/exercises\.js['"]/)
    expect(media).toContain('<PT650AnimationProviderMedia')
    expect(providerMedia).not.toContain('PT650ExerciseAnimation')
    expect(providerMedia).not.toContain("renderer === 'svg'")
    expect(animation).not.toContain('SchematicFallback')
    expect(animation).not.toContain('schematic-fallback')
  })

  it('does not pretend an unmodelled movement has an exact demo', () => {
    expect(animatedModelFor('0026')).toBeNull()
    expect(animatedModelFor('does-not-exist')).toBeNull()
  })
})
