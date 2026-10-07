import { describe, expect, it } from 'vitest'
import { EXIDX } from '../lib/exercises.js'
import { WORKOUT_GUIDE_ASSETS } from './pt650-animation-assets.js'
import { animationAssetFor } from './pt650-animation-provider.js'

const EXPECTED_IDS = Object.freeze(["0289","0405","0178","0293","0652","1326","0868","0472","0308","0251","0162","0499"])

describe('PT650 Workout Guide Controlled Ingest V1', () => {
  it('contains exactly the reviewed first batch', () => {
    expect(Object.keys(WORKOUT_GUIDE_ASSETS).sort()).toEqual([...EXPECTED_IDS].sort())
    expect(EXPECTED_IDS).toHaveLength(12)
  })

  it('keeps each asset bound to the exact PT650 exercise name reviewed at ingest', () => {
    for (const [id, asset] of Object.entries(WORKOUT_GUIDE_ASSETS)) {
      expect(EXIDX[id]?.n).toBe(asset.pt650ExerciseName)
      expect(asset.assetStatus).toBe('ready')
      expect(asset.frames).toHaveLength(3)
      expect(asset.frames.every(frame => frame.includes('pt650-media/workout-guide/v1/'))).toBe(true)
    }
  })

  it('pins provenance and CC BY-SA obligations on every ingested asset', () => {
    for (const asset of Object.values(WORKOUT_GUIDE_ASSETS)) {
      expect(asset.sourceCommit).toBe('aac599224bb9780305239607ef98540b7e0ce389')
      expect(asset.sourceVersion).toBe('1.0.0')
      expect(asset.licence).toBe('CC BY-SA 4.0')
      expect(asset.licenceUrl).toBe('https://creativecommons.org/licenses/by-sa/4.0/')
      expect(asset.attributionRequired).toBe(true)
      expect(asset.shareAlike).toBe(true)
      expect(asset.sourceFrameBlobs).toHaveLength(3)
      expect(asset.pt650Changes).toContain('copied verbatim')
    }
  })

  it('uses Workout Guide for reviewed exercises without a higher-priority PT650 asset', () => {
    expect(animationAssetFor('0289')).toMatchObject({ provider: 'workout_guide', renderer: 'frame-sequence' })
    expect(animationAssetFor('0652')).toMatchObject({ provider: 'workout_guide', renderer: 'frame-sequence' })
  })

  it('does not change existing higher-priority PT650 media behavior', () => {
    expect(animationAssetFor('0662')?.provider).toBe('pt650_opengym3d')
    expect(animationAssetFor('0025')?.provider).toBe('pt650_authored_svg')
  })
})
