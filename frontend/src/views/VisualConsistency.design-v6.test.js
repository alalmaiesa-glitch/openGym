import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = file => readFileSync(resolve(process.cwd(), file), 'utf8')
const css = read('src/index.css')
const checkIn = read('src/views/CheckIn.jsx')
const routine = read('src/views/RoutineEdit.jsx')
const muscles = read('src/views/Muscles.jsx')
const balance = read('src/views/StructuralBalance.jsx')
const coachSetup = read('src/views/CoachSetup.jsx')

describe('PT650 Visual QA & Consistency V6', () => {
  it('closes the remaining legacy-looking secondary routes', () => {
    expect(checkIn).toContain('pt650-checkin-v6')
    expect(routine).toContain('pt650-routine-v6')
    expect(muscles).toContain('pt650-muscles-v6')
    expect(balance).toContain('pt650-balance-v6')
    expect(coachSetup).toContain('pt650-coach-setup-v6')
  })

  it('removes the oversized inline Check In title contract', () => {
    expect(checkIn).toContain('className="pt650-checkin-title"')
    expect(checkIn).not.toContain("h1 style={{ fontSize: 28 }}")
  })

  it('gives the routine editor consistent settings, exercise and action surfaces', () => {
    expect(routine).toContain('pt650-routine-settings')
    expect(routine).toContain('pt650-routine-exercises')
    expect(routine).toContain('pt650-routine-exercise')
    expect(routine).toContain('pt650-routine-actions')
    expect(routine).toContain('moveSupersetUnit')
    expect(routine).toContain('exercisePicker')
  })

  it('normalizes secondary and feature-page title scale', () => {
    expect(css).toContain('PT650 Visual QA & Consistency V6')
    expect(css).toContain('.pt650-secondary-title h1,.pt650-checkin-title h1')
    expect(css).toContain('.machine-scan-head h1,.move-head h1,.health-head h1')
    expect(css).toContain('font-size:24px')
    expect(css).toContain('font-size:22px')
  })

  it('keeps layout direction-safe with logical properties', () => {
    expect(css).toContain('margin-inline-start:10px')
    expect(css).toContain('inset-inline-start:0')
    expect(css).toContain('[dir="rtl"] .pt650-secondary-head')
  })

  it('styles empty and no-data states instead of leaving legacy bare blocks', () => {
    expect(css).toContain('.pt650-muscle-explorer-shell .empty')
    expect(css).toContain('.pt650-history-empty')
    expect(css).toContain('.pt650-checkin-v6>.muted.small')
  })
})
