import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { WORKOUT_GUIDE_ASSETS } from './pt650-animation-assets.js'

describe('PT650 full removal of Workout Guide animation assets V1–V3.6', () => {
  it('keeps no published SVG frames or exercise mappings', () => {
    expect(WORKOUT_GUIDE_ASSETS).toEqual({})
    expect(existsSync(resolve(process.cwd(), 'public/pt650-media/workout-guide/v1'))).toBe(false)
  })
})
