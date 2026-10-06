import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { EXIDX } from './exercises.js'
import { MACHINE_CATALOG, MACHINE_BY_ID, machinePrescription, calibrateNextLoad, roundLoad } from './machine-scan.js'

describe('PT650 Machine Scan catalogue', () => {
  it('ships reviewed machine targets mapped to real PT650 exercises', () => {
    expect(MACHINE_CATALOG.length).toBeGreaterThanOrEqual(7)
    expect(new Set(MACHINE_CATALOG.map(x => x.id)).size).toBe(MACHINE_CATALOG.length)
    for (const machine of MACHINE_CATALOG) {
      expect(MACHINE_BY_ID[machine.id]).toBe(machine)
      expect(EXIDX[machine.exerciseId], machine.id).toBeTruthy()
      expect(machine.setup.ar.length).toBeGreaterThanOrEqual(3)
      expect(machine.technique.ar.length).toBeGreaterThanOrEqual(3)
      expect(machine.mistakes.ar.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('uses the most recent completed load instead of guessing from body weight', () => {
    const machine = MACHINE_BY_ID.chest_press
    const S = {
      unit: 'kg',
      bodyweight: [{ d: '2026-10-01', w: 82 }],
      workouts: [{
        d: '2026-10-05',
        entries: [{
          id: machine.exerciseId,
          sets: [
            { w: 30, r: 12, done: true },
            { w: 35, r: 10, done: true },
            { w: 35, r: 9, done: true },
          ],
        }],
      }],
    }
    const p = machinePrescription(S, machine)
    expect(p.load).toMatchObject({ mode: 'history', value: 35, unit: 'kg', date: '2026-10-05' })
  })

  it('does not invent a numeric load for a first-time machine user', () => {
    const p = machinePrescription({
      unit: 'kg',
      bodyweight: [{ d: '2026-10-01', w: 82 }],
      workouts: [],
    }, MACHINE_BY_ID.leg_press_45)
    expect(p.load).toMatchObject({ mode: 'calibrate', value: null, unit: 'kg', bodyWeight: 82 })
  })
})

describe('PT650 first-set load calibration', () => {
  it('reduces a load that is too heavy', () => {
    expect(calibrateNextLoad({ weight: 50, reps: 6, rir: 1, repsMin: 8, repsMax: 12 }))
      .toEqual({ action: 'reduce', factor: 0.9 })
    expect(roundLoad(45, 'kg')).toBe(45)
  })

  it('keeps a clean working load near the target effort', () => {
    expect(calibrateNextLoad({ weight: 50, reps: 10, rir: 2, repsMin: 8, repsMax: 12 }))
      .toEqual({ action: 'keep', factor: 1 })
  })

  it('increases an easy top-of-range set', () => {
    expect(calibrateNextLoad({ weight: 50, reps: 12, rir: 4, repsMin: 8, repsMax: 12 }))
      .toEqual({ action: 'increase', factor: 1.1 })
    expect(roundLoad(55, 'kg')).toBe(55)
    expect(roundLoad(121, 'lb')).toBe(120)
  })
})

describe('Machine Scan route and capture surface', () => {
  const app = readFileSync(resolve(process.cwd(), 'src/App.jsx'), 'utf8')
  const home = readFileSync(resolve(process.cwd(), 'src/views/Home.jsx'), 'utf8')
  const view = readFileSync(resolve(process.cwd(), 'src/views/MachineScan.jsx'), 'utf8')

  it('is reachable from Home and supports the rear camera on mobile', () => {
    expect(app).toContain('<Route path="/machine-scan" element={<MachineScan />} />')
    expect(home).toContain("nav('/machine-scan')")
    expect(view).toContain('capture="environment"')
    expect(view).toContain('accept="image/jpeg,image/png,image/webp"')
  })

  it('keeps a manual fallback when AI recognition is unavailable or uncertain', () => {
    expect(view).toContain('setManual(true)')
    expect(view).toContain('MACHINE_CATALOG.map')
    expect(view).toContain('recognition?.machineId')
  })
})
