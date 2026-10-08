import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const history = readFileSync(resolve(process.cwd(), 'src/views/History.jsx'), 'utf8')
const settings = readFileSync(resolve(process.cwd(), 'src/views/Settings.jsx'), 'utf8')
const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

describe('PT650 History & Settings Redesign V5', () => {
  it('gives History a compact Sport Tech shell while keeping workout rows and actions', () => {
    expect(history).toContain('className="pt650-history-v5"')
    expect(history).toContain('pt650-history-summary')
    expect(history).toContain('pt650-history-list')
    expect(history).toContain('logPastWorkoutSheet')
    expect(history).toContain('workoutDetailSheet(w)')
  })

  it('wraps Settings without changing its Section/Row contracts', () => {
    expect(settings).toContain('className="narrow pt650-settings-v5"')
    expect(settings).toContain('pt650-settings-head')
    expect(settings).toContain("<Section title={t('General')}")
    expect(settings).toContain("<Section title={t('During a workout')}")
    expect(settings).toContain("<Section title={t('Appearance')}")
    expect(settings).toContain("<Section title={t('Data')}")
  })

  it('keeps typography controlled and utility surfaces compact', () => {
    expect(css).toContain('PT650 History & Settings Redesign V5')
    expect(css).toContain('.pt650-history-title h1,.pt650-settings-title h1')
    expect(css).toContain('font-size:24px')
    expect(css).toContain('.pt650-settings-v5 .lrow{')
    expect(css).toContain('min-height:53px')
  })

  it('preserves section semantics used by Settings integration tests', () => {
    expect(css).toContain('.pt650-settings-v5 .sect-t')
    expect(css).toContain('.pt650-settings-v5 .sect-b')
    expect(css).toContain('.pt650-settings-v5 .lrow-t')
  })

  it('keeps mobile-first behavior without oversized controls', () => {
    expect(css).toContain('@media (max-width:520px)')
    expect(css).toContain('.pt650-history-add{width:100%}')
  })
})
