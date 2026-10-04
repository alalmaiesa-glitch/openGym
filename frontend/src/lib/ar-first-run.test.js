import { afterEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import ar from '../locales/ar.js'
import { _setLangState, dateLocale, t } from './i18n-core.js'
import { fmtDate } from './format.js'

afterEach(() => _setLangState('en', {}, null, null))

describe('Arabic first-run experience', () => {
  it('uses Saudi Arabic with an explicit Gregorian calendar', () => {
    _setLangState('ar', ar, null, null)
    expect(dateLocale()).toBe('ar-SA-u-ca-gregory-nu-latn')
    expect(fmtDate('2026-10-04', true, true)).toContain('2026')
  })

  it('uses clear Arabic onboarding and gym language', () => {
    _setLangState('ar', ar, null, null)
    expect(t('Your workouts. Your weights. Your profile.')).toBe('تدريبك. أوزانك. تقدمك.')
    expect(t('Load starter plan')).toBe('اختيار برنامج جاهز')
    expect(t('At the gym')).toBe('في النادي')
    expect(t('Check in')).toBe('تسجيل الحضور')
    expect(t('Choose a different workout')).toBe('اختر حصة مختلفة')
  })

  it('keeps machine-readable codes and server addresses LTR inside RTL screens', () => {
    const login = readFileSync(new URL('../views/Login.jsx', import.meta.url), 'utf8')
    const mobile = readFileSync(new URL('../views/MobileOnboarding.jsx', import.meta.url), 'utf8')
    const password = readFileSync(new URL('../components/PasswordAuth.jsx', import.meta.url), 'utf8')
    expect(login).toContain('className="input" dir="ltr" placeholder={t(\'Invite code\')}')
    expect(mobile).toContain('className="input" dir="ltr" placeholder={t(\'Server address (e.g. gym.example.com)\')}')
    expect(mobile).toContain('className="input" dir="ltr" placeholder={t(\'Pairing code\')}')
    expect(password).toContain("direction: 'ltr'")
  })
})
