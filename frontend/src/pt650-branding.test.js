import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('PT650 visible product branding', () => {
  it('uses PT650 as the top-level visible product name', () => {
    const home = readFileSync(new URL('./views/Home.jsx', import.meta.url), 'utf8')
    const onboarding = readFileSync(new URL('./views/MobileOnboarding.jsx', import.meta.url), 'utf8')
    const login = readFileSync(new URL('./views/Login.jsx', import.meta.url), 'utf8')

    expect(home).toContain('<h1>PT650</h1>')
    expect(home).not.toContain(": 'openGym'")
    expect(home).not.toContain("user ? t('Hi {0}', user.name) : 'PT650'")
    expect(onboarding).toContain('>PT650</h1>')
    expect(login).toContain('>PT650</h1>')
  })
})
