import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import ar from '../locales/ar.js'

describe('Arabic settings, account and sync experience', () => {
  it('uses session terminology in settings and account-management flows', () => {
    expect(ar['Weigh in before workouts']).toBe('تسجيل الوزن قبل الحصص')
    expect(ar['During a workout']).toBe('أثناء الحصة التدريبية')
    expect(ar['Discard the running workout']).toBe('تجاهل الحصة الجارية')
    expect(ar['Last workout']).toBe('آخر حصة تدريبية')
    expect(ar['Add this device\'s workouts to your profile?']).toContain('حصص هذا الجهاز')
  })

  it('uses clear sync and backup wording', () => {
    expect(ar['All synced']).toBe('المزامنة مكتملة')
    expect(ar['Not on your server yet: {0}']).toContain('لم تصل')
    expect(ar['Not everything is on your server yet']).toContain('جميع التغييرات')
    expect(ar['No account, no cloud — back it up anytime with Export below.']).toContain('نسخة احتياطية')
    expect(ar['Export with photos & videos (.zip)']).toContain('نسخة كاملة')
  })

  it('keeps account ids, pairing codes, invite codes and reminder times LTR', () => {
    const settings = readFileSync(new URL('../views/Settings.jsx', import.meta.url), 'utf8')
    expect(settings).toContain('className="acct-id" dir="ltr"')
    expect(settings).toContain('className="card" dir="ltr"')
    expect(settings).toContain('className="input" dir="ltr" placeholder={t(\'Invite code\')}')
    expect((settings.match(/type="time" className="timef" dir="ltr"/g) || [])).toHaveLength(2)
  })

  it('isolates server hostnames from surrounding RTL sync text', () => {
    const sync = readFileSync(new URL('../components/ServerSync.jsx', import.meta.url), 'utf8')
    expect(sync).toContain('<bdi dir="ltr">{hostOf(sync.server)}</bdi>')
    expect(sync).toContain('<bdi dir="ltr">{k.server ? hostOf(k.server) : \'\'}</bdi>')
  })

  it('keeps passkey and device-link language understandable in Arabic', () => {
    expect(ar['Passkeys']).toBe('مفاتيح المرور')
    expect(ar['None yet — add one to sign in without your password.']).toContain('لا توجد مفاتيح مرور بعد')
    expect(ar['A one-time code lets your phone or another computer sign in with a passkey of its own.']).toContain('رمز استخدام لمرة واحدة')
  })
})
