import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const workout = readFileSync(resolve(process.cwd(), 'src/views/Workout.jsx'), 'utf8')
const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

describe('PT650 Workout Experience Redesign V3', () => {
  it('scopes the active session to the Sport Tech V3 shell', () => {
    expect(workout).toContain('className="narrow pt650-workout-v3"')
    expect(workout).toContain('data-workout-view=')
    expect(workout).toContain('pt650-workout-head')
    expect(workout).toContain('pt650-session-identity')
  })

  it('keeps the live exercise and set logging contracts intact', () => {
    expect(workout).toContain('workout-exercise-head')
    expect(workout).toContain('workout-exercise-tags')
    expect(workout).toContain('workout-sets-card')
    expect(workout).toContain("onToggle(i)")
    expect(workout).toContain("onField(i, col.f")
    expect(workout).toContain("finishWorkout")
  })

  it('gives navigation and completion explicit V3 surfaces', () => {
    expect(workout).toContain('workout-unit-counter')
    expect(workout).toContain('workout-card-nav')
    expect(workout).toContain('workout-add-exercise')
    expect(workout).toContain('workout-session-note')
    expect(workout).toContain('workout-finish')
  })

  it('keeps typography compact and set rows mobile-first', () => {
    expect(css).toContain('PT650 Workout Experience Redesign V3')
    expect(css).toContain('.pt650-workout-v3 .workout-exercise-head>div:first-child')
    expect(css).toContain('font-size:18px!important')
    expect(css).toContain('.pt650-workout-v3 .workout-sets-card')
    expect(css).toContain('@media (max-width:420px)')
  })

  it('redesigns rest/work timers without changing timer logic', () => {
    expect(css).toContain('body:has(.pt650-workout-v3) #timer')
    expect(css).toContain('body:has(.pt650-workout-v3) #timer.working')
  })

  it('does not leave the start chooser on the old visual shell', () => {
    expect(workout).toContain('className="narrow pt650-start-workout-v3"')
    expect(css).toContain('.pt650-start-workout-v3>.card')
  })
})
