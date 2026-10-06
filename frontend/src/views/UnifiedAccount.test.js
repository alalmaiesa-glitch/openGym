import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const store = readFileSync(resolve(process.cwd(), 'src/store/useStore.js'), 'utf8')
const settings = readFileSync(resolve(process.cwd(), 'src/views/Settings.jsx'), 'utf8')
const auth = readFileSync(resolve(process.cwd(), 'src/lib/platform-auth.js'), 'utf8')
const identity = readFileSync(resolve(process.cwd(), 'src/lib/platform-identity.js'), 'utf8')

describe('PT650 unified account V1', () => {
  it('does not force GitHub Pages into guest mode anymore', () => {
    const demoBlock = store.slice(store.indexOf('if (DEMO) {'), store.indexOf('// Opened from a device-link', store.indexOf('if (DEMO) {')))
    expect(demoBlock).toContain('setGuest(false)')
    expect(demoBlock).not.toContain('setGuest(true)')
    expect(demoBlock).not.toContain('resetDemo()')
  })

  it('keeps a single platform session observable across the app and browser tabs', () => {
    expect(identity).toContain('platformStoredSession()')
    expect(identity).toContain('onPlatformAuthChange')
    expect(auth).toContain("window.addEventListener('storage', storage)")
    expect(auth).toContain('platformStoredSession()')
  })

  it('exposes the PT650 account and sign-out in settings', () => {
    expect(settings).toContain('function PlatformAccountSection')
    expect(settings).toContain('Move · Rewards · Nutrition · Health · Machine Scan')
    expect(settings).toContain('platformSignOut()')
    expect(settings).toContain('لن نحذف سجل التدريب المحلي')
  })
})
