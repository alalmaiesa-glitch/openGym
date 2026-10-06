import { describe, expect, it } from 'vitest'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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

  it('hashes a local capture without copying or publishing it', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pt650-capture-'))
    try {
      const video = join(dir, 'forward-lunge.mp4')
      writeFileSync(video, Buffer.from('pt650-owned-capture-test'))
      const script = new URL('../../scripts/ingest-pt650-owned-capture.mjs', import.meta.url)
      const run = spawnSync(process.execPath, [script.pathname, '3470', video], {
        encoding: 'utf8',
      })
      expect(run.status).toBe(0)
      const result = JSON.parse(run.stdout)
      expect(result).toMatchObject({
        exerciseId: '3470',
        status: 'captured',
        format: 'mp4',
        sourceVideoPublished: false,
        rawCaptureCommitted: false,
        manifestUpdated: false,
      })
      expect(result.videoSha256).toMatch(/^[0-9a-f]{64}$/)
      expect(manifest.captures.find(x => x.exerciseId === '3470')?.status).toBe('awaiting-owned-capture')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
