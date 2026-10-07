import { describe, expect, it } from 'vitest'
import { EXIDX } from '../lib/exercises.js'
import { WORKOUT_GUIDE_ASSETS } from './pt650-animation-assets.js'
import {
  WORKOUT_GUIDE_V2_ACCEPTED,
  WORKOUT_GUIDE_V21_ACCEPTED,
  WORKOUT_GUIDE_V3_ACCEPTED,
  WORKOUT_GUIDE_V31_ACCEPTED,
  WORKOUT_GUIDE_V32_ACCEPTED,
  WORKOUT_GUIDE_V33_ACCEPTED,
  WORKOUT_GUIDE_V34_ACCEPTED,
  WORKOUT_GUIDE_V35_ACCEPTED,
  WORKOUT_GUIDE_EXCLUDED,
  WORKOUT_GUIDE_V3_BLOCKED_ALIASES,
  WORKOUT_GUIDE_V31_BLOCKED_ALIASES,
  WORKOUT_GUIDE_V32_BLOCKED_ALIASES,
  WORKOUT_GUIDE_V33_BLOCKED_ALIASES,
  WORKOUT_GUIDE_V34_BLOCKED_ALIASES,
  WORKOUT_GUIDE_V35_BLOCKED_ALIASES,
} from './pt650-workout-guide-review.js'
import { animationAssetFor, animationCandidatesFor } from './pt650-animation-provider.js'

const V1_IDS = Object.freeze(["0289","0405","0178","0293","0652","1326","0868","0472","0308","0251","0162","0499"])
const V2_IDS = Object.freeze(["0095","0406","1409","1459","0549","0514","0872","0687","0630","0276","0282","0832","0846","0407","0493","0283","0279","3294","0471","1489","3561","3360","1471","1160","1511","0811","0688"])
const V21_IDS = Object.freeze(["0017","0841","2612"])
const V3_IDS = Object.freeze(["0171","0318","0861","0030","0033","0047","0165","0168","0196","0238","1311"])
const V31_IDS = Object.freeze(["0042","0044","0074","0085","0297","0301","0314","0315","0865","1757","0475"])
const V32_IDS = Object.freeze(["0175","0197","0585","0586","0592","0593","0594","0597","0598","0599","0605","1385"])
const V33_IDS = Object.freeze(["3470","3699","0497","0513","1373","1377","1387","3785","0474"])
const V34_IDS = Object.freeze(["0294","0317","0431","1760","0334","0310","2292","0410"])
const V35_IDS = Object.freeze(["0027","0032","0039","0043","0060","0080","0117","0119","0120","0121","3562"])
const EXPECTED_IDS = Object.freeze([...V1_IDS, ...V2_IDS, ...V21_IDS, ...V3_IDS, ...V31_IDS, ...V32_IDS, ...V33_IDS, ...V34_IDS, ...V35_IDS])

describe('PT650 Workout Guide reviewed ingest through Semantic Alias V3.5', () => {
  it('contains only reviewed local mappings', () => {
    expect(Object.keys(WORKOUT_GUIDE_ASSETS).sort()).toEqual([...EXPECTED_IDS].sort())
    expect(V1_IDS).toHaveLength(12)
    expect(V2_IDS).toHaveLength(27)
    expect(V21_IDS).toHaveLength(3)
    expect(V3_IDS).toHaveLength(11)
    expect(V31_IDS).toHaveLength(11)
    expect(V32_IDS).toHaveLength(12)
    expect(V33_IDS).toHaveLength(9)
    expect(V34_IDS).toHaveLength(8)
    expect(V35_IDS).toHaveLength(11)
    expect(EXPECTED_IDS).toHaveLength(104)
  })

  it('keeps each asset bound to the exact PT650 exercise identity reviewed at ingest', () => {
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

  it('keeps hard excluded candidates out', () => {
    expect(WORKOUT_GUIDE_V2_ACCEPTED.map(x => x.pt650Id).sort()).toEqual([...V2_IDS].sort())
    for (const row of WORKOUT_GUIDE_EXCLUDED) expect(WORKOUT_GUIDE_ASSETS[row.pt650Id]).toBeUndefined()
    expect(WORKOUT_GUIDE_EXCLUDED.find(x => x.pt650Id === '0860')?.reason).toMatch(/triceps.*glutes/i)
    expect(WORKOUT_GUIDE_EXCLUDED.find(x => x.pt650Id === '0284')?.reason).toMatch(/partner-loaded.*body-weight/i)
  })

  it('locks V2.1 visual-review decisions', () => {
    expect(WORKOUT_GUIDE_V21_ACCEPTED.map(x => x.pt650Id).sort()).toEqual([...V21_IDS].sort())
    for (const id of V21_IDS) {
      const asset = WORKOUT_GUIDE_ASSETS[id]
      expect(asset.matchReview).toBe('accepted-v2.1')
      expect(asset.matchConfidence).toBe('high')
      expect(asset.visualReview).toMatch(/Accepted V2\.1/)
    }
  })

  it('locks V3 semantic aliases and keeps blocked alias pairs from leaking in', () => {
    expect(WORKOUT_GUIDE_V3_ACCEPTED.map(x => x.pt650Id).sort()).toEqual([...V3_IDS].sort())
    for (const id of V3_IDS) {
      const asset = WORKOUT_GUIDE_ASSETS[id]
      expect(asset.matchReview).toBe('accepted-v3')
      expect(asset.matchConfidence).toBe('high')
      expect(asset.aliasReview).toBeTruthy()
      expect(animationCandidatesFor(id).some(candidate => candidate.provider === 'workout_guide' && candidate.available)).toBe(true)
    }
    for (const row of WORKOUT_GUIDE_V3_BLOCKED_ALIASES) {
      expect(WORKOUT_GUIDE_ASSETS[row.pt650Id]?.sourceSlug).not.toBe(row.sourceSlug)
    }
    expect(WORKOUT_GUIDE_ASSETS['0651']).toBeUndefined()
  })

  it('locks V3.1 priority-gap aliases and strict negative reviews', () => {
    expect(WORKOUT_GUIDE_V31_ACCEPTED.map(x => x.pt650Id).sort()).toEqual([...V31_IDS].sort())
    for (const id of V31_IDS) {
      const asset = WORKOUT_GUIDE_ASSETS[id]
      expect(asset.matchReview).toBe('accepted-v3.1')
      expect(asset.matchConfidence).toBe('high')
      expect(asset.aliasReview).toBeTruthy()
      expect(animationCandidatesFor(id).some(candidate => candidate.provider === 'workout_guide' && candidate.available)).toBe(true)
    }
    for (const row of WORKOUT_GUIDE_V31_BLOCKED_ALIASES) {
      expect(WORKOUT_GUIDE_ASSETS[row.pt650Id]?.sourceSlug).not.toBe(row.sourceSlug)
    }
    expect(WORKOUT_GUIDE_ASSETS['0126']).toBeUndefined()
    expect(WORKOUT_GUIDE_ASSETS['1764']).toBeUndefined()
  })

  it('locks V3.2 cable/machine precision decisions', () => {
    expect(WORKOUT_GUIDE_V32_ACCEPTED.map(x => x.pt650Id).sort()).toEqual([...V32_IDS].sort())
    for (const id of V32_IDS) {
      const asset = WORKOUT_GUIDE_ASSETS[id]
      expect(asset.matchReview).toBe('accepted-v3.2')
      expect(asset.matchConfidence).toBe('high')
      expect(asset.aliasReview).toBeTruthy()
      expect(animationCandidatesFor(id).some(candidate => candidate.provider === 'workout_guide' && candidate.available)).toBe(true)
    }
    for (const row of WORKOUT_GUIDE_V32_BLOCKED_ALIASES) {
      expect(WORKOUT_GUIDE_ASSETS[row.pt650Id]?.sourceSlug).not.toBe(row.sourceSlug)
    }
    expect(WORKOUT_GUIDE_ASSETS['0180']).toBeUndefined()
    expect(WORKOUT_GUIDE_ASSETS['0606']).toBeUndefined()
    expect(WORKOUT_GUIDE_ASSETS['1722']).toBeUndefined()
  })

  it('locks V3.3 bodyweight precision decisions', () => {
    expect(WORKOUT_GUIDE_V33_ACCEPTED.map(x => x.pt650Id).sort()).toEqual([...V33_IDS].sort())
    for (const id of V33_IDS) {
      const asset = WORKOUT_GUIDE_ASSETS[id]
      expect(asset.matchReview).toBe('accepted-v3.3')
      expect(asset.matchConfidence).toBe('high')
      expect(asset.aliasReview).toBeTruthy()
      expect(animationCandidatesFor(id).some(candidate => candidate.provider === 'workout_guide' && candidate.available)).toBe(true)
    }
    for (const row of WORKOUT_GUIDE_V33_BLOCKED_ALIASES) {
      expect(WORKOUT_GUIDE_ASSETS[row.pt650Id]?.sourceSlug).not.toBe(row.sourceSlug)
    }
    expect(WORKOUT_GUIDE_ASSETS['0710']).toBeUndefined()
    expect(WORKOUT_GUIDE_ASSETS['0274']).toBeUndefined()
    expect(WORKOUT_GUIDE_ASSETS['0620']).toBeUndefined()
  })

  it('locks V3.4 dumbbell precision decisions', () => {
    expect(WORKOUT_GUIDE_V34_ACCEPTED.map(x => x.pt650Id).sort()).toEqual([...V34_IDS].sort())
    for (const id of V34_IDS) {
      const asset = WORKOUT_GUIDE_ASSETS[id]
      expect(asset.matchReview).toBe('accepted-v3.4')
      expect(asset.matchConfidence).toBe('high')
      expect(asset.aliasReview).toBeTruthy()
      expect(animationCandidatesFor(id).some(candidate => candidate.provider === 'workout_guide' && candidate.available)).toBe(true)
    }
    for (const row of WORKOUT_GUIDE_V34_BLOCKED_ALIASES) {
      expect(WORKOUT_GUIDE_ASSETS[row.pt650Id]?.sourceSlug).not.toBe(row.sourceSlug)
    }
    expect(WORKOUT_GUIDE_ASSETS['0292']).toBeUndefined()
    expect(WORKOUT_GUIDE_ASSETS['0313']).toBeUndefined()
    expect(WORKOUT_GUIDE_ASSETS['2137']).toBeUndefined()
  })

  it('locks V3.5 barbell precision decisions', () => {
    expect(WORKOUT_GUIDE_V35_ACCEPTED.map(x => x.pt650Id).sort()).toEqual([...V35_IDS].sort())
    for (const id of V35_IDS) {
      const asset = WORKOUT_GUIDE_ASSETS[id]
      expect(asset.matchReview).toBe('accepted-v3.5')
      expect(asset.matchConfidence).toBe('high')
      expect(asset.aliasReview).toBeTruthy()
      expect(animationCandidatesFor(id).some(candidate => candidate.provider === 'workout_guide' && candidate.available)).toBe(true)
    }
    for (const row of WORKOUT_GUIDE_V35_BLOCKED_ALIASES) {
      expect(WORKOUT_GUIDE_ASSETS[row.pt650Id]?.sourceSlug).not.toBe(row.sourceSlug)
    }
    expect(WORKOUT_GUIDE_ASSETS['1719']).toBeUndefined()
    expect(WORKOUT_GUIDE_ASSETS['0091']).toBeUndefined()
    expect(WORKOUT_GUIDE_ASSETS['0123']).toBeUndefined()
  })

  it('keeps modern provider precedence after legacy SVG retirement', () => {
    expect(animationAssetFor('0662')?.provider).toBe('pt650_opengym3d')
    expect(animationAssetFor('0025')).toBeNull()
    expect(animationAssetFor('0043')?.provider).toBe('workout_guide')
    expect(animationAssetFor('3360')?.provider).toBe('pt650_opengym3d')
  })
})
