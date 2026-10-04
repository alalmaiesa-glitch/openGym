import { describe, expect, it } from 'vitest'
import coachCss from '../coach.css?raw'

describe('RTL-safe Coach CSS', () => {
  it('uses logical alignment for Arabic-facing controls', () => {
    expect(coachCss).toContain('text-align:start')
    expect(coachCss).toContain('text-align:end')
    expect(coachCss).toContain('padding-inline-start:18px')
    expect(coachCss).toContain('inset-inline:0')
  })

  it('uses logical bubble corners and inline offsets', () => {
    expect(coachCss).toContain('border-end-start-radius:6px')
    expect(coachCss).toContain('border-end-end-radius:6px')
    expect(coachCss).toContain('inset-inline-start:8px')
  })

  it('does not reintroduce physical left/right text alignment or spacing', () => {
    expect(coachCss).not.toMatch(/text-align\s*:\s*(left|right)/)
    expect(coachCss).not.toMatch(/padding-(left|right)\s*:/)
    expect(coachCss).not.toMatch(/margin-(left|right)\s*:/)
    expect(coachCss).not.toMatch(/border-bottom-(left|right)-radius\s*:/)
  })
})
