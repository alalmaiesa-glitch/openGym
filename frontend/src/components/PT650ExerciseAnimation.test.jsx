import { describe, expect, it } from 'vitest'
import { PT650_ANIMATION_MODELS, animatedModelFor } from './pt650-animation-registry.js'
import { readFileSync } from 'node:fs'

describe('Retired schematic SVG animation cleanup', () => {
  it('registers no old schematic human motion', () => {
    expect(PT650_ANIMATION_MODELS).toEqual({})
    for (const id of ['0001', '0002', '0025', '0043', '0662']) expect(animatedModelFor(id)).toBeNull()
  })
  it('does not import a 3D or SVG animation renderer into the public exercise media', () => {
    const source = readFileSync(new URL('./Media.jsx', import.meta.url), 'utf8')
    expect(source).not.toContain('PT650ExerciseAnimation')
    expect(source).not.toContain('PT650ThreeExercise')
    expect(source).not.toContain('PT650AnimationProviderMedia')
    expect(source).not.toContain('gifSrc(')
  })
})
