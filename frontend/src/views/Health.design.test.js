import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const app = readFileSync(resolve(process.cwd(), 'src/App.jsx'), 'utf8')
const home = readFileSync(resolve(process.cwd(), 'src/views/Home.jsx'), 'utf8')
const health = readFileSync(resolve(process.cwd(), 'src/views/Health.jsx'), 'utf8')
const settings = readFileSync(resolve(process.cwd(), 'src/views/Settings.jsx'), 'utf8')

describe('PT650 Health & Endurance Core V1 UI', () => {
  it('is reachable from Home and the signed-in router', () => {
    expect(app).toContain("import Health from './views/Health.jsx'")
    expect(app).toContain('<Route path="/health" element={<Health />} />')
    expect(home).toContain("nav('/health')")
    expect(home).toContain('PT650 Health')
  })

  it('uses the authenticated Edge Health APIs rather than direct database access', () => {
    expect(health).toContain("platformApi('health-summary')")
    expect(health).toContain("platformApi('health-activities')")
    expect(health).toContain("platformApi('health-adapters')")
    expect(health).not.toContain('SUPABASE_SERVICE_ROLE_KEY')
  })

  it('distinguishes adapter availability from account-level connection state', () => {
    expect(health).toContain("x.status === 'active'")
    expect(health).toContain("x.status === 'planned'")
    expect(health).toContain('connectedProviders.has(x.provider)')
    expect(health).toContain('Connected means this account has source data')
    expect(health).toContain('Available means the adapter is implemented')
    expect(health).toContain('Planned means it is not enabled yet')
  })

  it('states route privacy and avoids medical-diagnosis claims', () => {
    expect(health).toContain('الموقع الخام لا يُخزن داخل سجل Health')
    expect(health).toContain('Raw location is not stored inside the Health record')
    expect(health).toContain('ليست تشخيصًا طبيًا')
    expect(health).toContain('not medical diagnoses')
  })

  it('marks Health live in unified-account settings', () => {
    expect(settings).toContain('Move · Rewards · Health')
    expect(settings).toContain('Nutrition · Wearables')
  })
})
