import { describe, expect, it } from 'vitest'
import { EXIDX } from '../lib/exercises.js'
import { PT650_3D_MODELS } from './pt650-3d-registry.js'
import { PT650_ANIMATION_MODELS } from './pt650-animation-registry.js'
import {
  EXERCISE_ANIMATIC_ASSETS,
  WORKOUT_GUIDE_ASSETS,
  GYM_VISUAL_ASSETS,
} from './pt650-animation-assets.js'
import { buildAnimationCoverageReport } from './pt650-animation-coverage.js'

describe('PT650 animation coverage gap baseline V1', () => {
  const report = buildAnimationCoverageReport()

  it('locks the current catalogue and resolved animation baseline', () => {
    expect(report.total).toBe(1327)
    expect(report.covered).toBe(62)
    expect(report.uncovered).toBe(1265)
    expect(report.coveragePct).toBe(4.67)
    expect(report.selectedByProvider).toEqual({
      pt650_opengym3d: 6,
      pt650_authored_svg: 4,
      workout_guide: 52,
    })
  })

  it('surfaces the largest body-part gaps deterministically', () => {
    expect(report.byBodyPart.slice(0, 6).map(x => [x.key, x.missing])).toEqual([
      ['upper arms', 284],
      ['upper legs', 204],
      ['back', 190],
      ['waist', 158],
      ['chest', 151],
      ['shoulders', 133],
    ])
  })

  it('surfaces the largest equipment gaps deterministically', () => {
    expect(report.byEquipment.slice(0, 8).map(x => [x.key, x.missing])).toEqual([
      ['body weight', 297],
      ['dumbbell', 286],
      ['cable', 148],
      ['barbell', 147],
      ['leverage machine', 80],
      ['band', 54],
      ['smith machine', 48],
      ['kettlebell', 40],
    ])
  })

  it('keeps every provider mapping attached to a real PT650 catalogue exercise', () => {
    const mappedIds = new Set([
      ...Object.keys(PT650_3D_MODELS),
      ...Object.keys(PT650_ANIMATION_MODELS),
      ...Object.keys(EXERCISE_ANIMATIC_ASSETS),
      ...Object.keys(WORKOUT_GUIDE_ASSETS),
      ...Object.keys(GYM_VISUAL_ASSETS),
    ])
    for (const id of mappedIds) expect(EXIDX[id], id).toBeTruthy()
    expect(Object.keys(WORKOUT_GUIDE_ASSETS)).toHaveLength(53)
  })
})
