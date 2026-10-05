import { afterEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import ar from '../locales/ar.js'
import { _setLangState, PRODUCT_NAME, t } from './i18n-core.js'

afterEach(() => _setLangState('en', {}, null, null))

describe('PT650 visible product identity', () => {
  it('uses PT650 as the product name in translated UI text', () => {
    expect(PRODUCT_NAME).toBe('PT650')
    expect(t('Made with openGym')).toBe('Made with PT650')
    _setLangState('ar', ar, null, null)
    expect(t('Made with openGym')).toBe('تم إنشاؤها باستخدام PT650')
  })

  it('does not rename the legacy backup folder path', () => {
    _setLangState('ar', ar, null, null)
    expect(t('Saves a dated copy to Documents/openGym after finishing a workout or editing a routine, and keeps the newest {0} — point a sync app at that folder, or copy it out by hand.', 14))
      .toContain('Documents/openGym')
  })

  it('brands the browser, PWA and login screen as PT650', () => {
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8')
    const manifest = JSON.parse(readFileSync(new URL('../../public/manifest.json', import.meta.url), 'utf8'))
    const login = readFileSync(new URL('../views/Login.jsx', import.meta.url), 'utf8')
    expect(html).toContain('<title>PT650</title>')
    expect(html).toContain('apple-mobile-web-app-title" content="PT650"')
    expect(manifest.name).toBe('PT650')
    expect(manifest.short_name).toBe('PT650')
    expect(login).toContain('>PT650</h1>')
  })
})
