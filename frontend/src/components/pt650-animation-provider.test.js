import { describe, expect, it } from 'vitest'
import { CATALOGUE } from '../lib/exercises.js'
import {
  PT650_ANIMATION_PROVIDERS, PT650_ANIMATION_FALLBACK_CHAIN,
  animationAssetFor, animationCandidatesFor, animationAvailability, hasAnimationFor,
} from './pt650-animation-provider.js'

describe('PT650 removed built-in exercise motions', () => {
  it('retains only inactive provider definitions for provenance and future licensing', () => {
    expect(PT650_ANIMATION_FALLBACK_CHAIN).toEqual(['exercise_animatic', 'pt650_opengym3d', 'pt650_authored_svg', 'workout_guide', 'gymvisual'])
    expect(PT650_ANIMATION_PROVIDERS.exercise_animatic.status).toBe('planned')
    expect(PT650_ANIMATION_PROVIDERS.gymvisual.status).toBe('planned')
    expect(PT650_ANIMATION_PROVIDERS.pt650_opengym3d.status).toBe('retired')
    expect(PT650_ANIMATION_PROVIDERS.pt650_authored_svg.status).toBe('retired')
    expect(PT650_ANIMATION_PROVIDERS.workout_guide.status).toBe('retired')
  })
  it('makes every catalogue exercise and previous mapped ID unavailable', () => {
    for (const id of ['0662', '3360', 'pt650-0001', '0227', ...CATALOGUE.map(ex => ex.id)]) {
      expect(animationAssetFor(id)).toBeNull()
      expect(animationCandidatesFor(id)).toEqual([])
      expect(hasAnimationFor(id)).toBe(false)
      expect(animationAvailability(id).available).toBe(false)
    }
  })
})
