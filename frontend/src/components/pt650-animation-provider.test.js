import { describe, expect, it } from 'vitest'
import {
  PT650_ANIMATION_PROVIDERS,
  PT650_ANIMATION_FALLBACK_CHAIN,
  animationAssetFor,
  animationCandidatesFor,
  animationAvailability,
  hasAnimationFor,
} from './pt650-animation-provider.js'

describe('PT650 Animation Provider Adapter V1', () => {
  it('keeps provider priority independent from exercise records', () => {
    expect(PT650_ANIMATION_FALLBACK_CHAIN).toEqual([
      'exercise_animatic',
      'pt650_opengym3d',
      'pt650_authored_svg',
      'workout_guide',
      'gymvisual',
    ])
    expect(PT650_ANIMATION_PROVIDERS.exercise_animatic).toMatchObject({
      priority: 500,
      status: 'planned',
      renderer: 'video',
      assetStatus: 'awaiting-licence-and-ingest',
    })
    expect(PT650_ANIMATION_PROVIDERS.workout_guide).toMatchObject({
      priority: 200,
      status: 'registered',
      renderer: 'frame-sequence',
      attributionRequired: true,
      shareAlike: true,
    })
  })

  it('prefers current approved 3D over the authored SVG fallback for the same exercise', () => {
    const candidates = animationCandidatesFor('0662')
    expect(candidates.map(x => x.provider)).toEqual([
      'pt650_opengym3d',
      'pt650_authored_svg',
    ])
    expect(animationAssetFor('0662')).toMatchObject({
      provider: 'pt650_opengym3d',
      renderer: 'three',
      available: true,
      assetStatus: 'ready',
    })
  })

  it('keeps an exact authored SVG available when there is no approved 3D mapping', () => {
    expect(animationAssetFor('0025')).toMatchObject({
      provider: 'pt650_authored_svg',
      renderer: 'svg',
      available: true,
    })
    expect(hasAnimationFor('0025')).toBe(true)
  })

  it('does not claim future or merely registered providers are available without an approved mapping', () => {
    const availability = animationAvailability('0026')
    expect(availability.available).toBe(false)
    expect(availability.provider).toBeNull()
    expect(availability.assetStatus).toBe('unavailable')
    expect(availability.fallbackChain).toEqual(PT650_ANIMATION_FALLBACK_CHAIN)
    expect(hasAnimationFor('0026')).toBe(false)
  })

  it('carries source, licence, version and asset status with the selected media', () => {
    const selected = animationAssetFor('pt650-0001')
    expect(selected).toMatchObject({
      provider: 'pt650_opengym3d',
      version: 1,
      licence: 'MIT + CC0-1.0 inputs',
      licenceSource: 'https://github.com/AssiamahS/opengym3d',
      assetStatus: 'ready',
    })
    expect(selected.provenance).toContain('PT650 factory')
  })
})
