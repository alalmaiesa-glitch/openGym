import { afterEach, describe, expect, it } from 'vitest'
import ar from '../locales/ar.js'
import { buildStarterPlan, starterPlanDays } from './starter.js'
import { _setLangState, t } from './i18n-core.js'

afterEach(() => _setLangState('en', {}, null, null))

describe('Arabic starter plans', () => {
  it('starts a three-day plan on Sunday for a Sunday-first profile', () => {
    expect(starterPlanDays('ppl', 0)).toEqual([0, 2, 4])
    expect(starterPlanDays('full-body', 0)).toEqual([0, 2, 4])
    expect(starterPlanDays('upper-lower', 0)).toEqual([0, 1, 3, 4])
  })

  it('keeps the original Monday schedule as the compatibility default', () => {
    expect(starterPlanDays('ppl')).toEqual([1, 3, 5])
  })

  it('persists Arabic routine names when the active language is Arabic', () => {
    _setLangState('ar', ar, null, null)
    const plan = buildStarterPlan('ppl', { weekStart: 0, nameOf: name => t(name) })
    expect(plan.routines.map(r => r.name)).toEqual(['يوم الدفع', 'يوم السحب', 'يوم الأرجل'])
    expect(plan.schedule.map(s => s.day)).toEqual([0, 2, 4])
  })

  it('localizes every starter routine family used by the chooser', () => {
    _setLangState('ar', ar, null, null)
    expect(buildStarterPlan('upper-lower', { weekStart: 0, nameOf: t }).routines.map(r => r.name))
      .toEqual(['الجزء العلوي A', 'الجزء السفلي A', 'الجزء العلوي B', 'الجزء السفلي B'])
    expect(buildStarterPlan('full-body', { weekStart: 0, nameOf: t }).routines.map(r => r.name))
      .toEqual(['الجسم كامل A', 'الجسم كامل B', 'الجسم كامل C'])
  })
})
