import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const read = rel => readFileSync(new URL(rel, import.meta.url), 'utf8')

describe('Arabic V1.0 release gate', () => {
  it('ships Arabic-first document and PWA metadata', () => {
    const html = read('../../index.html')
    const manifest = JSON.parse(read('../../public/manifest.json'))

    expect(html).toContain('<html lang="ar" dir="rtl">')
    expect(html).toContain('متتبع عربي للتمارين واللياقة ووزن الجسم')
    expect(manifest.lang).toBe('ar')
    expect(manifest.dir).toBe('rtl')
    expect(manifest.id).toBe('./')
    expect(manifest.description).toMatch(/[\u0600-\u06FF]/)
  })

  it('does not leak the raw English Done fallback from shared pickers', () => {
    const ui = read('../components/ui.jsx')
    expect(ui).toContain("{doneLabel || t('Done')}")
    expect(ui).not.toContain("{doneLabel || 'Done'}")
  })

  it('marks the current bottom-navigation destination for assistive technology', () => {
    const tabbar = read('../components/TabBar.jsx')
    expect(tabbar).toContain("aria-current={active ? 'page' : undefined}")
    expect(tabbar).toContain("aria-current={S.active && cur === 'workout' ? 'page' : undefined}")
  })

  it('offers this fork as the corresponding source from the running app', () => {
    const demo = read('./demo.js')
    const settings = read('../views/Settings.jsx')
    expect(demo).toContain("https://github.com/alalmaiesa-glitch/openGym")
    expect(settings).toContain('href={REPO}')
    expect(settings).not.toContain('href="https://github.com/DuarteSantos8/openGym"')
    expect(settings).toContain('الكود المصدري')
  })

  it('never auto-downloads or remotely loads the unresolved inherited exercise media', () => {
    const compose = read('../../../docker-compose.yml')
    const pages = read('../../../.github/workflows/pages.yml')
    const helper = read('../../../scripts/fetch-media.sh')
    const pkg = JSON.parse(read('../../package.json'))

    expect(compose).not.toContain('git clone --depth 1 https://github.com/hasaneyldrm/exercises-dataset')
    expect(compose).not.toMatch(/^  media:\s*$/m)
    expect(compose).not.toContain('ghcr.io/duartesantos8/opengym-')
    expect(pages).not.toContain('cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset')
    expect(pages).not.toContain('VITE_IMG_BASE:')
    expect(pages).not.toContain('VITE_GIF_BASE:')
    expect(pkg.scripts['build:mobile']).toBe('VITE_MOBILE=1 vite build && cap sync')
    expect(pkg.scripts['build:mobile']).not.toContain('hasaneyldrm/exercises-dataset')
    expect(pkg.scripts['build:mobile']).not.toContain('VITE_IMG_BASE')
    expect(pkg.scripts['build:mobile']).not.toContain('VITE_GIF_BASE')
    expect(helper).toContain('Exercise media download is disabled in this Arabic edition.')
    expect(helper).not.toContain('git clone')
  })

  it('keeps the app update channel inside this fork', () => {
    const updater = read('./update.js')
    const settings = read('../views/Settings.jsx')
    expect(updater).toContain('https://api.github.com/repos/alalmaiesa-glitch/openGym/releases/latest')
    expect(updater).toContain('https://github.com/alalmaiesa-glitch/openGym/releases')
    expect(updater).not.toContain('gitlab.com/DuarteSantos8/opengym')
    expect(settings).toContain("REPO + '/releases'")
    expect(settings).not.toContain('opengym.duarte-santos.ch/#download')
  })

  it('documents derivative licensing and the cleared-media policy', () => {
    const notice = read('../../../NOTICE.md')
    const readme = read('../../../README.md')
    expect(notice).toContain('## Arabic edition derivative')
    expect(notice).toContain('does not bundle, automatically download, or remotely load them')
    expect(readme).toContain('https://github.com/alalmaiesa-glitch/openGym')
    expect(readme).toContain('docker compose up -d --build')
  })
})
