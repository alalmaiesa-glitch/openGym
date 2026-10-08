import { describe, expect, it } from 'vitest'
import { CATALOGUE, EXIDX } from './exercises.js'
import arNames from '../exercise-names/ar.js'
import arInstr from '../instr/ar.js'
import { threeDModelFor } from '../components/pt650-3d-registry.js'

describe('PT650 native exercise catalogue', () => {
  it('adds Jumping Jack as an exact first-party catalogue row', () => {
    const ex = EXIDX['pt650-0001']
    expect(ex).toMatchObject({
      id: 'pt650-0001',
      n: 'jumping jack',
      bp: 'cardio',
      eq: 'body weight',
      native: true,
    })
    expect(CATALOGUE.some(x => x.id === 'pt650-0001')).toBe(true)
    expect(arNames['pt650-0001']).toBe('قفز فتح وضم')
    expect(arInstr['pt650-0001']).toHaveLength(4)
  })

  it('retains the native row but removes its former 3D demonstration', () => {
    expect(threeDModelFor('pt650-0001')).toBeNull()
  })
})
