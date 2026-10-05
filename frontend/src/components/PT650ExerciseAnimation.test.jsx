import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { animatedModelFor, PT650_ANIMATION_MODELS } from './PT650ExerciseAnimation.jsx'

describe('PT650 animated built-in exercise media', () => {
  it('registers the first approved exercise-specific model', () => {
    expect(animatedModelFor('0025')).toMatchObject({
      id: 'bench-press-v1',
      exercise: 'barbell bench press',
      medium: 'authored-svg-motion',
      provenance: 'PT650 original',
      version: 1,
    })
    expect(Object.keys(PT650_ANIMATION_MODELS)).toEqual(['0025'])
  })

  it('never requests the inherited real-person built-in image/GIF assets', () => {
    const media = readFileSync(new URL('./Media.jsx', import.meta.url), 'utf8')
    expect(media).not.toContain('imgSrc(')
    expect(media).not.toContain('gifSrc(')
    expect(media).not.toMatch(/from ['"]\.\.\/lib\/exercises\.js['"]/)
    expect(media).toContain('<PT650ExerciseAnimation')
    expect(media).toContain('schematic-fallback')
  })

  it('falls back instead of pretending an unmodelled movement has an exact demo', () => {
    expect(animatedModelFor('0026')).toBeNull()
    expect(animatedModelFor('does-not-exist')).toBeNull()
  })
})
