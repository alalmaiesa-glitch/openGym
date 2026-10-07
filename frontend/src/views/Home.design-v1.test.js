import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const home = readFileSync(resolve(process.cwd(), 'src/views/Home.jsx'), 'utf8')
const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

describe('PT650 Sport Tech home V1', () => {
  it('keeps the home hierarchy mobile-first and intentionally compact', () => {
    expect(home).toContain('className="narrow pt650-home-v1"')
    expect(home).toContain('className="pt650-today-shell"')
    expect(home).toContain('className="pt650-performance-strip"')
    expect(css).toContain('.pt650-home-head h1')
    expect(css).toContain('font-size:24px')
    expect(css).toContain('@media (max-width:380px)')
  })

  it('exposes exactly four primary module cards', () => {
    expect((home.match(/className="pt650-module-card/g) || []).length).toBe(4)
    expect(home).toContain("nav('/plan')")
    expect(home).toContain("nav('/library')")
    expect(home).toContain("nav('/machine-scan')")
    expect(home).toContain("nav('/move')")
  })

  it('keeps Health secondary rather than competing with the four primary modules', () => {
    expect(home).toContain('className="pt650-health-ribbon"')
    expect(home).toContain("nav('/health')")
  })

  it('turns the bottom navigation into the compact PT650 dock', () => {
    expect(css).toContain('PT650 Sport Tech UI Redesign V1')
    expect(css).toContain('width:min(calc(100% - 16px),544px)')
    expect(css).toContain('border-radius:22px')
  })

  it('preserves the alternate-workout door and live workout row contracts', () => {
    expect(home).toContain('className="today-row pt650-today-card"')
    expect(home).toContain("t('Choose a different workout')")
    expect(home).toContain("nav('/workout')")
  })
})
