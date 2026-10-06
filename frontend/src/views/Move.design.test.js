import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const app = readFileSync(resolve(process.cwd(), 'src/App.jsx'), 'utf8')
const home = readFileSync(resolve(process.cwd(), 'src/views/Home.jsx'), 'utf8')
const move = readFileSync(resolve(process.cwd(), 'src/views/Move.jsx'), 'utf8')

describe('PT650 Move V1 surface', () => {
  it('is reachable from the signed-in app and Home', () => {
    expect(app).toContain('<Route path="/move" element={<Move />} />')
    expect(home).toContain("nav('/move')")
    expect(home).toContain('PT650 Move')
  })

  it('tracks GPS only while a walking session is active', () => {
    expect(move).toContain('navigator.geolocation.watchPosition')
    expect(move).toContain('navigator.geolocation?.clearWatch')
    expect(move).toContain('enableHighAccuracy: true')
    expect(move).toContain("api('/api/move/session'")
  })

  it('shows the reward contract before enrollment', () => {
    expect(move).toContain('reward_display')
    expect(move).toContain('verification_disclosure')
    expect(move).toContain("api('/api/move/enroll'")
    expect(move).toContain('المكافأة محجوزة لك')
  })

  it('does not pretend rewards work in the static demo', () => {
    expect(move).toContain('DEMO')
    expect(move).toContain('التسجيل والمكافآت يتطلبان حساب PT650 متصلًا بالخادم')
    expect(move).toContain('disabled={sending || DEMO}')
  })

  it('states the raw-route privacy rule in the athlete-facing UI', () => {
    expect(move).toContain('لا يحتفظ بمسار GPS الخام')
    expect(move).toContain('discards the raw GPS route after verification')
  })
})
