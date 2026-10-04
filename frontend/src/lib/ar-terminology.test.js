import { describe, expect, it } from 'vitest'
import ar from '../locales/ar.js'

describe('Arabic product terminology', () => {
  it('distinguishes exercise, workout and routine concepts clearly', () => {
    expect(ar.Exercises).toBe('التمارين')
    expect(ar.Workout).toBe('حصة تدريبية')
    expect(ar.Workouts).toBe('الحصص التدريبية')
    expect(ar.Routine).toBe('برنامج تدريبي')
    expect(ar.Routines).toBe('البرامج التدريبية')
  })

  it('uses clear Arabic terms for common training methods', () => {
    expect(ar.Cardio).toBe('تمارين هوائية')
    expect(ar.Superset).toBe('مجموعة مزدوجة')
    expect(ar['Drop-set']).toBe('مجموعة إسقاط')
    expect(ar['Rest-pause']).toBe('راحة واستكمال')
  })

  it('does not regress to the first-pass transliterations', () => {
    const values = Object.values(ar).join(' ')
    for (const term of ['روتين', 'كارديو', 'سوبر سِت', 'ريست بوز', 'برنامج تدريبيات']) {
      expect(values, term).not.toContain(term)
    }
  })
})
