import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { EXIDX } from '../lib/exercises.js'
import { PT650_3D_MODELS, threeDModelFor } from './pt650-3d-registry.js'

describe('PT650 OpenGym3D registry', () => {
  it('binds the first final 3D asset to the exact PT650 exercise', () => {
    const model = threeDModelFor('0662')
    expect(model).toMatchObject({
      id: 'push-up-3d-v2',
      exercise: 'push-up',
      medium: 'opengym3d-rendered-glb',
      sourceRepo: 'AssiamahS/opengym3d',
      humanLicense: 'CC0-1.0',
      motionLicense: 'CC0-1.0',
      version: 2,
    })
    expect(EXIDX['0662']?.n).toBe(model.exercise)
  })

  it('uses the final rendered exercise outputs, not the raw motion pack', () => {
    const model = threeDModelFor('0662')
    expect(model.asset).toMatch(/\/assets\/push_up\.glb$/)
    expect(model.previewVideo).toMatch(/\/assets\/push_up\.mp4$/)
    expect(model.poster).toMatch(/\/assets\/push_up\.png$/)
    expect(model.asset).not.toContain('/motions/')
  })

  it('records provenance and redistributable licences for every public 3D model', () => {
    for (const [exerciseId, model] of Object.entries(PT650_3D_MODELS)) {
      expect(EXIDX[exerciseId]?.n).toBe(model.exercise)
      expect(model.sourceRepo).toBeTruthy()
      expect(model.sourceCommit).toMatch(/^[0-9a-f]{40}$/)
      expect(model.pipelineLicense).toBe('MIT')
      expect(model.humanLicense).toBe('CC0-1.0')
      expect(model.motionLicense).toBe('CC0-1.0')
    }
  })

  it('keeps a rendered 3D video fallback for devices without WebGL', () => {
    const source = readFileSync(new URL('./PT650ThreeExercise.jsx', import.meta.url), 'utf8')
    expect(source).toContain('model.previewVideo')
    expect(source).toContain('pt650-three-video')
    expect(source).toContain('playsInline')
    expect(source).toContain('muted')
  })

  it('does not pretend an exercise has 3D media when it is not registered', () => {
    expect(threeDModelFor('0001')).toBeNull()
    expect(threeDModelFor('does-not-exist')).toBeNull()
  })
})
