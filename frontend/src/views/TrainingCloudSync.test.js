import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const store = readFileSync(resolve(process.cwd(), 'src/store/useStore.js'), 'utf8')
const app = readFileSync(resolve(process.cwd(), 'src/App.jsx'), 'utf8')
const settings = readFileSync(resolve(process.cwd(), 'src/views/Settings.jsx'), 'utf8')

describe('PT650 Workout Cloud Sync V1', () => {
  it('reuses the mature push/pull engine with Supabase Edge routes', () => {
    expect(store).toContain("platformApi('training-rev')")
    expect(store).toContain("platformApi('training-state')")
    expect(store).toContain('usingPlatformCloud()')
    expect(store).toContain('syncIdentity()')
  })

  it('never blind-overwrites PT650 cloud state and merges a revision conflict', () => {
    expect(store).toContain('PT650 cloud never performs a blind overwrite')
    expect(store).toContain('if (base) body.baseRev = base.rev')
    expect(store).toContain('if (e.status === 409 && e.data && attempt < 2)')
    expect(store).toContain('mergeInto(get().S, e.data.state, e.data.rev || 0)')
  })

  it('merges two non-empty copies on first cloud contact instead of picking a winner wholesale', () => {
    expect(store).toContain('const localWorthKeeping = hasData(S) || Number(S?._ts || 0) > 0')
    expect(store).toContain('if (state && localWorthKeeping)')
    expect(store).toContain('mergeInto(S, state, rev)')
  })

  it('is offline-first, coalesces writes and keeps the running workout device-local', () => {
    expect(store).toContain('const pushDelay = () => usingPlatformCloud() ? 5000 : 1500')
    expect(store).toContain("window.addEventListener('online', () => checkRev(true))")
    expect(store).toContain("const cloudState = usingPlatformCloud() ? { ...S, active: null } : S")
    expect(store).toContain("e.status == null || e.status === 0")
  })

  it('starts synchronization automatically after validated PT650 account boot', () => {
    expect(app).toContain('const syncNow = useStore(s => s.syncNow)')
    expect(app).toContain('if (!ready || !platformAuthed || !platformUid) return')
    expect(app).toContain('syncNow().catch(() => {})')
  })

  it('shows an athlete-facing sync state and manual sync action', () => {
    expect(settings).toContain("title={ar ? 'مزامنة التدريب' : 'Training sync'}")
    expect(settings).toContain('متزامن بين أجهزتك')
    expect(settings).toContain('دون اتصال — محفوظ محليًا وستتم المزامنة تلقائيًا')
    expect(settings).toContain('await syncNow()')
  })
})
