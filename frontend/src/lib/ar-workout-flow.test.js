import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import ar from '../locales/ar.js'

describe('Arabic workout flow contract', () => {
  it('uses session terminology for workout-level actions', () => {
    expect(ar['Start workout']).toBe('بدء الحصة التدريبية')
    expect(ar['Finish workout']).toBe('إنهاء الحصة')
    expect(ar['Rename workout']).toBe('إعادة تسمية الحصة')
    expect(ar['Discard workout?']).toBe('تجاهل الحصة؟')
    expect(ar['Freestyle workout (pick as you go)']).toContain('حصة حرة')
    expect(ar['Add to this workout']).toBe('أضف إلى هذه الحصة')
  })

  it('keeps exercise and workout concepts distinct', () => {
    expect(ar['Add exercise']).toBe('إضافة تمرين')
    expect(ar['Remove exercise']).toBe('إزالة التمرين')
    expect(ar['Finish workout early · {0} exercises']).toContain('إنهاء الحصة')
    expect(ar['Finish workout early · {0} exercises']).toContain('تمارين')
  })

  it('uses clear Arabic effort and result language', () => {
    expect(ar['Tap how many reps you had left, or type an exact {0}.']).toContain('مستوى الجهد')
    expect(ar['Nothing left — went to failure']).toContain('الفشل')
    expect(ar['Best estimated 1RM:']).toContain('(1RM)')
    expect(ar['What you just trained']).toBe('ما درّبته في هذه الحصة')
  })

  it('keeps workout clocks and timer controls bidi-safe', () => {
    const workout = readFileSync(new URL('../views/Workout.jsx', import.meta.url), 'utf8')
    const rest = readFileSync(new URL('../components/RestTimer.jsx', import.meta.url), 'utf8')
    expect(workout).toContain('<span dir="ltr">{t}</span>')
    expect(rest).toContain('className="t" dir="ltr"')
    expect(rest).not.toContain('>15s</Button>')
  })
})
