import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const plan = readFileSync(resolve(process.cwd(), 'src/views/Plan.jsx'), 'utf8')
const stats = readFileSync(resolve(process.cwd(), 'src/views/Stats.jsx'), 'utf8')
const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

describe('PT650 Plan & Progress Redesign V4', () => {
  it('wraps the plan in the V4 Sport Tech shell without changing day/routine actions', () => {
    expect(plan).toContain('className="pt650-plan-v4"')
    expect(plan).toContain('className="pt650-plan-overview"')
    expect(plan).toContain('pt650-day-row')
    expect(plan).toContain('pt650-routine-row')
    expect(plan).toContain('dayAssignSheet(d)')
    expect(plan).toContain('dayAddRoutineSheet(d)')
    expect(plan).toContain("moveRoutine(i, -1)")
    expect(plan).toContain("moveRoutine(i, 1)")
  })

  it('keeps all major Stats analytics while adding V4 hierarchy', () => {
    expect(stats).toContain('className="pt650-progress-v4"')
    expect(stats).toContain('pt650-progress-metrics')
    expect(stats).toContain('pt650-activity-card')
    expect(stats).toContain('pt650-muscle-card')
    expect(stats).toContain('pt650-weight-progress-card')
    expect(stats).toContain('pt650-exercise-progress-card')
    expect(stats).toContain('pt650-recent-progress')
    expect(stats).toContain('<Heatmap')
    expect(stats).toContain('<BodyMap')
    expect(stats).toContain('<LineChart')
  })

  it('keeps V4 typography controlled and mobile-first', () => {
    expect(css).toContain('PT650 Plan & Progress Redesign V4')
    expect(css).toContain('.pt650-plan-head h1,.pt650-progress-head h1')
    expect(css).toContain('font-size:24px')
    expect(css).toContain('.pt650-progress-metrics')
    expect(css).toContain('@media (max-width:680px)')
  })

  it('uses compact planning surfaces instead of oversized dashboard blocks', () => {
    expect(css).toContain('.pt650-plan-overview')
    expect(css).toContain('.pt650-plan-panel')
    expect(css).toContain('.pt650-day-row.training-day::before')
    expect(css).toContain('.pt650-routine-row::before')
  })

  it('preserves card contracts used by runtime Stats tests', () => {
    expect(stats).toContain('className="card pt650-progress-card pt650-muscle-card"')
    expect(stats).toContain('className="card pt650-progress-card pt650-exercise-progress-card"')
  })
})
