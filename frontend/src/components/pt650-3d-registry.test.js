import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { EXIDX } from '../lib/exercises.js'
import { PT650_3D_MODELS, threeDModelFor } from './pt650-3d-registry.js'

describe('PT650 mirrored 3D registry', () => {
  it('binds approved 3D assets to exact PT650 exercises', () => {
    expect(threeDModelFor('0662')).toMatchObject({
      id: 'push-up-3d-v3',
      exercise: 'push-up',
      humanLicense: 'CC0-1.0',
      motionLicense: 'CC0-1.0',
      version: 3,
    })
    expect(threeDModelFor('3360')).toMatchObject({
      id: 'bear-crawl-3d-v1',
      exercise: 'bear crawl',
      motion: 'Mesh2Motion Crawl',
      humanLicense: 'CC0-1.0',
      motionLicense: 'CC0-1.0',
      version: 1,
    })
    expect(threeDModelFor('0685')).toMatchObject({
      id: 'run-jog-in-place-3d-v2',
      exercise: 'run',
      camera: 'front',
      motion: 'Mesh2Motion Jog',
      upstreamExerciseSpec: 'exercises/jog.json',
      semanticBinding: 'PT650 run instructions specify jogging in place',
      humanLicense: 'CC0-1.0',
      motionLicense: 'CC0-1.0',
      version: 2,
    })

    for (const [exerciseId, model] of Object.entries(PT650_3D_MODELS)) {
      expect(EXIDX[exerciseId]?.n).toBe(model.exercise)
    }
  })

  it('serves exercise assets from the PT650 origin, not OpenGym3D at runtime', () => {
    for (const model of Object.values(PT650_3D_MODELS)) {
      expect(model.asset).toContain('pt650-3d/')
      expect(model.previewVideo).toContain('pt650-3d/')
      expect(model.poster).toContain('pt650-3d/')
      expect(model.asset).not.toMatch(/^https?:/)
      expect(model.previewVideo).not.toMatch(/^https?:/)
      expect(model.poster).not.toMatch(/^https?:/)
    }
  })

  it('records redistributable provenance and viewer metadata for every public 3D model', () => {
    for (const model of Object.values(PT650_3D_MODELS)) {
      expect(model.sourceRepo).toBe('AssiamahS/opengym3d')
      expect(model.sourceCommit).toMatch(/^[0-9a-f]{40}$/)
      expect(model.pipelineLicense).toBe('MIT')
      expect(model.humanLicense).toBe('CC0-1.0')
      expect(model.motionLicense).toBe('CC0-1.0')
      expect(model.upstreamExerciseSpec).toMatch(/^exercises\/.+\.json$/)
      expect(['front', 'side']).toContain(model.camera)
      expect(model.muscleHighlight).toBe('baked-vertex-color')
      expect(model.primaryMuscles.length).toBeGreaterThan(0)
      expect(model.viewer).toMatchObject({
        fov: expect.any(Number),
        direction: expect.any(Array),
        distance: expect.any(Number),
        orbitAzimuth: expect.any(Number),
        orbitPolar: expect.any(Number),
        zoomMin: expect.any(Number),
        zoomMax: expect.any(Number),
      })
    }
  })

  it('locks every mirrored binary with SHA256 before deployment', () => {
    const lock = JSON.parse(readFileSync(new URL('../../pt650-3d-assets.lock.json', import.meta.url), 'utf8'))
    expect(lock.format).toBe('pt650-3d-asset-lock/1')
    expect(lock.assets.map(a => a.exerciseId).sort()).toEqual(['0662', '0685', '3360'])
    for (const asset of lock.assets) {
      for (const file of Object.values(asset.files)) {
        expect(file.sha256).toMatch(/^(BOOTSTRAP|[0-9a-f]{64})$/)
      }
    }
  })

  it('keeps a rendered video fallback for devices without WebGL', () => {
    const source = readFileSync(new URL('./PT650ThreeExercise.jsx', import.meta.url), 'utf8')
    expect(source).toContain('model.previewVideo')
    expect(source).toContain('pt650-three-video')
    expect(source).toContain('playsInline')
    expect(source).toContain('muted')
  })

  it('loads the complete 3D runtime lazily from the PT650 bundle with no runtime CDN', () => {
    const source = readFileSync(new URL('./PT650ThreeExercise.jsx', import.meta.url), 'utf8')
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))
    expect(source).toContain("import('three')")
    expect(source).toContain("import('three/examples/jsm/loaders/GLTFLoader.js')")
    expect(source).toContain("import('three/examples/jsm/controls/OrbitControls.js')")
    expect(source).toContain('controls.enablePan = false')
    expect(source).toContain('controls.minAzimuthAngle')
    expect(source).toContain('controls.maxAzimuthAngle')
    expect(source).toContain('renderer.toneMapping = THREE.ACESFilmicToneMapping')
    expect(source).not.toContain('esm.sh')
    expect(source).not.toContain('@vite-ignore')
    expect(source).not.toMatch(/https?:\/\//)
    expect(pkg.dependencies.three).toBe('0.170.0')
  })


  it('ships compact in-viewer controls for playback, speed and camera reset', () => {
    const source = readFileSync(new URL('./PT650ThreeExercise.jsx', import.meta.url), 'utf8')
    expect(source).toContain('const SPEEDS = [0.5, 1, 1.5]')
    expect(source).toContain('data-pt650-control="play"')
    expect(source).toContain('data-pt650-control="restart"')
    expect(source).toContain('data-pt650-control="speed"')
    expect(source).toContain('data-pt650-control="camera-reset"')
    expect(source).toContain('mixerRef.current?.setTime(0)')
    expect(source).toContain('camera.position.copy(home.position)')
    expect(source).toContain('controls.target.copy(home.target)')
    expect(source).toContain('playing ? speed : 0')
  })

  it('does not invent 3D media for unregistered exercises', () => {
    expect(threeDModelFor('0001')).toBeNull()
    expect(threeDModelFor('does-not-exist')).toBeNull()
  })
})
