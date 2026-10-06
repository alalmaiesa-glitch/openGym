import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const loginSource = readFileSync(resolve(process.cwd(), 'src/views/Login.jsx'), 'utf8')
const cssSource = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')
const appSource = readFileSync(resolve(process.cwd(), 'src/App.jsx'), 'utf8')

describe('PT650 login design', () => {
  it('uses the dedicated responsive login composition', () => {
    expect(loginSource).toContain('className="login-page"')
    expect(loginSource).toContain('className="login-hero"')
    expect(loginSource).toContain('className="login-panel"')
    expect(loginSource).toContain('className="login-actions"')
    expect(cssSource).toContain('#app:has(>.login-page)')
    expect(cssSource).toContain('grid-template-columns:minmax(0,1.14fr) minmax(360px,.86fr)')
    expect(cssSource).toContain('@media (max-width:820px)')
  })

  it('keeps the public entry screen free of people, photos and decorative video', () => {
    expect(loginSource).not.toMatch(/<img\b/i)
    expect(loginSource).not.toMatch(/<video\b/i)
    expect(loginSource).not.toMatch(/backgroundImage/i)
  })

  it('exposes a direct preview route even when a session is already active', () => {
    expect(appSource).toContain('<Route path="/login-preview" element={<Login />} />')
    expect(appSource).toContain("loc.pathname !== '/login-preview'")
  })

  it('does not expose repository or self-hosting links on the PT650 login', () => {
    expect(loginSource).not.toContain('Self-host it in a minute')
    expect(loginSource).not.toContain('REPO')
    expect(loginSource).not.toContain('self-hosting')
  })

  it('preserves every existing entry path', () => {
    expect(loginSource).toContain('passkeyLogin()')
    expect(loginSource).toContain('openPasswordSignIn()')
    expect(loginSource).toContain('Create new profile')
    expect(loginSource).toContain('openDeviceLinkRedeem')
    expect(loginSource).toContain('setGuest(true)')
    expect(loginSource).toContain('Start the demo')
  })
})
