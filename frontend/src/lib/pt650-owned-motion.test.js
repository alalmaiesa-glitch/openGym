import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { EXIDX } from './exercises.js'
import { threeDModelFor } from '../components/pt650-3d-registry.js'

const manifest = JSON.parse(readFileSync(new URL('../../pt650-owned-motion.json', import.meta.url), 'utf8'))

describe('PT650 owned motion lane', () => {
  it('starts with an exact existing PT650 forward-lunge target', () => {
    const item = manifest.captures.find(x => x.exerciseId === '3470')
    expect(item).toMatchObject({
      exerciseId: '3470',
      exercise: 'forward lunge (male)',
      target: 'forward lunge',
      movementPattern: 'lunge',
      equipment: 'body weight',
      status: 'awaiting-owned-capture',
      source: {
        kind: 'PT650-owned-capture',
        videoSha256: null,
        motionSha256: null,
        redistribution: 'derived-animation-only',
      },
    })
    expect(EXIDX['3470']).toMatchObject({
      n: 'forward lunge (male)',
      eq: 'body weight',
      tg: 'glutes',
    })
  })

  it('does not expose pending capture work as public 3D media', () => {
    const pending = manifest.captures.filter(x => x.status !== 'registered')
    expect(pending.length).toBeGreaterThan(0)
    for (const item of pending) {
      expect(item.releaseGate.runtimeRegistered).toBe(false)
      expect(threeDModelFor(item.exerciseId)).toBeNull()
    }
  })

  it('keeps capture footage private and the product animated-only', () => {
    expect(manifest.policy).toMatchObject({
      allowedSource: 'PT650-owned-capture',
      publicProduct: 'animated-only',
      sourceVideoPublished: false,
      requireExactExerciseBinding: true,
    })
  })
})
