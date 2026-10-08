import { describe, expect, it } from 'vitest'
import { CATALOGUE } from '../lib/exercises.js'
import { PT650_3D_MODELS } from './pt650-3d-registry.js'
import { PT650_ANIMATION_MODELS } from './pt650-animation-registry.js'
import { EXERCISE_ANIMATIC_ASSETS, WORKOUT_GUIDE_ASSETS, GYM_VISUAL_ASSETS } from './pt650-animation-assets.js'
import { buildAnimationCoverageReport } from './pt650-animation-coverage.js'

describe('PT650 public exercise motion removal coverage', () => {
  const report = buildAnimationCoverageReport()
  it('retains 1,327 catalogue exercises but zero demonstrations', () => {
    expect(CATALOGUE).toHaveLength(1327)
    expect(report.total).toBe(1327)
    expect(report.covered).toBe(0)
    expect(report.uncovered).toBe(1327)
    expect(report.coveragePct).toBe(0)
    expect(report.selectedByProvider).toEqual({})
    for (const row of report.byEquipment) expect(row.missing).toBe(row.total)
    for (const row of report.byBodyPart) expect(row.missing).toBe(row.total)
  })
  it('retains no imported exercise motion mappings from any source', () => {
    for (const assets of [PT650_3D_MODELS, PT650_ANIMATION_MODELS, EXERCISE_ANIMATIC_ASSETS, WORKOUT_GUIDE_ASSETS, GYM_VISUAL_ASSETS]) {
      expect(Object.keys(assets)).toHaveLength(0)
    }
  })
})
