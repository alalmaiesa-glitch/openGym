import { describe, expect, it } from 'vitest'
import { EXIDX } from '../lib/exercises.js'
import { WORKOUT_GUIDE_ASSETS } from './pt650-animation-assets.js'
import { WORKOUT_GUIDE_V2_ACCEPTED, WORKOUT_GUIDE_V2_HELD } from './pt650-workout-guide-review.js'
import { animationAssetFor, animationCandidatesFor } from './pt650-animation-provider.js'

const V1_IDS = Object.freeze(["0289","0405","0178","0293","0652","1326","0868","0472","0308","0251","0162","0499"])
const V2_IDS = Object.freeze(["0095","0406","1409","1459","0549","0514","0872","0687","0630","0276","0282","0832","0846","0407","0493","0283","0279","3294","0471","1489","3561","3360","1471","1160","1511","0811","0688"])
const EXPECTED_IDS = Object.freeze([...V1_IDS, ...V2_IDS])

describe('PT650 Workout Guide Controlled Ingest V1 + Expansion V2', () => {
  it('contains only reviewed local mappings', () => {
    expect(Object.keys(WORKOUT_GUIDE_ASSETS).sort()).toEqual([...EXPECTED_IDS].sort())
    expect(V1_IDS).toHaveLength(12)
    expect(V2_IDS).toHaveLength(27)
    expect(EXPECTED_IDS).toHaveLength(39)
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

  it('records every V2 acceptance and keeps held/rejected exact-name candidates out', () => {
    expect(WORKOUT_GUIDE_V2_ACCEPTED.map(x => x.pt650Id).sort()).toEqual([...V2_IDS].sort())
    for (const row of WORKOUT_GUIDE_V2_HELD) expect(WORKOUT_GUIDE_ASSETS[row.pt650Id]).toBeUndefined()
    expect(WORKOUT_GUIDE_V2_HELD.find(x => x.pt650Id === '0860')?.reason).toMatch(/triceps.*glutes/i)
  })

  it('exposes Workout Guide as a candidate for every accepted V2 exercise', () => {
    for (const id of V2_IDS) {
      expect(animationCandidatesFor(id).some(candidate => candidate.provider === 'workout_guide' && candidate.available)).toBe(true)
    }
  })

  it('keeps existing higher-priority PT650 media behavior', () => {
    expect(animationAssetFor('0662')?.provider).toBe('pt650_opengym3d')
    expect(animationAssetFor('0025')?.provider).toBe('pt650_authored_svg')
  })
})
