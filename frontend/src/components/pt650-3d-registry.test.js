import { describe, expect, it } from 'vitest'
import { EXIDX } from '../lib/exercises.js'
import { PT650_3D_MODELS, threeDModelFor } from './pt650-3d-registry.js'

describe('PT650 3D exercise registry', () => {
  it('starts with the CC0 Mesh2Motion push-up from OpenGym3D', () => {
    expect(threeDModelFor('0662')).toMatchObject({
      id: 'push-up-3d-v1',
      exercise: 'push-up',
      medium: 'interactive-glb',
      engine: 'three-js',
      clip: 'Pushup',
      source: 'Mesh2Motion via OpenGym3D',
      license: 'CC0-1.0',
      version: 1,
    })
  })

  it('pins every remote asset to an immutable upstream commit', () => {
    for (const model of Object.values(PT650_3D_MODELS)) {
      expect(model.asset).toContain('/ea3a60130fdcfb3c4771e44d09f84ebab4ee9bae/')
      expect(model.asset).not.toContain('/main/')
    }
  })

  it('binds every 3D model to the exact PT650 catalogue exercise', () => {
    for (const [exerciseId, model] of Object.entries(PT650_3D_MODELS)) {
      expect(EXIDX[exerciseId]?.n).toBe(model.exercise)
    }
  })

  it('ships only redistributable models in the public 3D registry', () => {
    const allowed = new Set(['CC0-1.0', 'CC-BY-4.0', 'MIT', 'own'])
    for (const model of Object.values(PT650_3D_MODELS)) expect(allowed.has(model.license)).toBe(true)
  })

  it('does not pretend an exercise has 3D media when it is not registered', () => {
    expect(threeDModelFor('0001')).toBeNull()
    expect(threeDModelFor('does-not-exist')).toBeNull()
  })
})
