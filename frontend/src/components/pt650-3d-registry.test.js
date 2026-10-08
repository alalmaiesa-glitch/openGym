import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { PT650_3D_MODELS, threeDModelFor } from './pt650-3d-registry.js'

describe('PT650 3D motion cleanup', () => {
  it('has zero live registrations and no bundled 3D asset directory', () => {
    expect(PT650_3D_MODELS).toEqual({})
    for (const id of ['0662', '3360', '0685', 'pt650-0001', 'pt650-0002', 'pt650-0003']) {
      expect(threeDModelFor(id)).toBeNull()
    }
    expect(existsSync(resolve(process.cwd(), 'public/pt650-3d'))).toBe(false)
  })
})
