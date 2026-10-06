import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const app = readFileSync(resolve(process.cwd(), 'src/App.jsx'), 'utf8')
const home = readFileSync(resolve(process.cwd(), 'src/views/Home.jsx'), 'utf8')
const move = readFileSync(resolve(process.cwd(), 'src/views/Move.jsx'), 'utf8')
const auth = readFileSync(resolve(process.cwd(), 'src/lib/platform-auth.js'), 'utf8')
const platformApi = readFileSync(resolve(process.cwd(), 'src/lib/platform-api.js'), 'utf8')

describe('PT650 Move platform surface', () => {
  it('is reachable from Home', () => {
    expect(app).toContain('<Route path="/move" element={<Move />} />')
    expect(home).toContain("nav('/move')")
    expect(home).toContain('PT650 Move')
  })

  it('uses a real platform account even when the rest of GitHub Pages is a local demo', () => {
    expect(move).toContain('platformSignIn')
    expect(move).toContain('platformSignUp')
    expect(move).toContain('platformStoredSession')
    expect(move).not.toContain("from '../lib/demo.js'")
    expect(move).not.toContain('disabled={sending || DEMO}')
  })

  it('tracks GPS only for an active walking session and sends it to the Edge API', () => {
    expect(move).toContain('navigator.geolocation.watchPosition')
    expect(move).toContain('navigator.geolocation?.clearWatch')
    expect(move).toContain('enableHighAccuracy: true')
    expect(move).toContain("platformApi('session'")
  })

  it('shows exact reward and verification terms before enrollment', () => {
    expect(move).toContain('reward_display')
    expect(move).toContain('verification_disclosure')
    expect(move).toContain("platformApi('enroll'")
    expect(move).toContain('المكافأة محجوزة لك')
  })

  it('keeps administrator credentials out of browser code', () => {
    expect(auth).toContain('sb_publishable_')
    expect(auth).not.toContain('SERVICE_ROLE')
    expect(auth).not.toContain('sb_secret_')
    expect(platformApi).toContain("Authorization: 'Bearer ' + session.access_token")
    expect(platformApi).toContain('platformConfig.publishableKey')
  })

  it('states the raw-route privacy rule in the athlete-facing UI', () => {
    expect(move).toContain('لا يحتفظ PT650 بمسار GPS الخام')
    expect(move).toContain('does not retain the raw GPS route')
  })
})
