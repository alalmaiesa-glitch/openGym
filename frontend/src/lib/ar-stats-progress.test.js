import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import ar from '../locales/ar.js'
import { statsPeriodLabel } from './stats-period.js'

describe('Arabic Stats and progress experience', () => {
  it('uses readable Arabic period labels instead of English abbreviations', () => {
    expect(statsPeriodLabel('30d', 'ar')).toBe('30 يوم')
    expect(statsPeriodLabel('90d', 'ar')).toBe('90 يوم')
    expect(statsPeriodLabel('1m', 'ar')).toBe('شهر')
    expect(statsPeriodLabel('3m', 'ar')).toBe('3 أشهر')
    expect(statsPeriodLabel('1y', 'ar')).toBe('سنة')
    expect(statsPeriodLabel('90d', 'en')).toBe('90d')
  })

  it('uses workout/session terminology in analytics metrics', () => {
    expect(ar['{0} workout']).toBe('{0} حصة تدريبية')
    expect(ar['{0} workouts']).toBe('{0} حصص تدريبية')
    expect(ar['Estimated 1RM per workout']).toContain('لكل حصة')
    expect(ar['Average effort per workout']).toContain('كل حصة')
    expect(ar['Longest hold per workout']).toContain('كل حصة')
    expect(ar['Most reps in a set per workout']).toContain('كل حصة')
  })

  it('uses semantically correct Arabic analytics labels', () => {
    expect(ar['Top set']).toBe('أفضل مجموعة')
    expect(ar['Weight 30d']).toBe('تغيّر الوزن خلال 30 يومًا')
    expect(ar['Structural balance']).toBe('توازن القوة')
    expect(ar['Where the sets land']).toBe('توزيع المجموعات حسب الجهد')
    expect(ar['{0} of {1} finished sets rated']).toContain('من أصل')
  })

  it('routes chart and heatmap dates through locale-aware formatting', () => {
    const lineChart = readFileSync(new URL('../components/LineChart.jsx', import.meta.url), 'utf8')
    const heatmap = readFileSync(new URL('../components/Heatmap.jsx', import.meta.url), 'utf8')
    expect(lineChart).toContain("txt: fmtDate(isoOf(dd))")
    expect(lineChart).not.toContain("dd.getDate() + ' ' + t(MONTHS[dd.getMonth()])")
    expect(heatmap).toContain("title={fmtDate(key, true, true)")
  })

  it('isolates mixed Latin metric values inside the RTL Stats screen', () => {
    const stats = readFileSync(new URL('../views/Stats.jsx', import.meta.url), 'utf8')
    expect(stats).toContain('<bdi dir="ltr">{fmtNum(row.est)} {S.unit}</bdi>')
    expect(stats).toContain('<bdi dir="ltr">{hd} {binLabel(b)}</bdi>')
  })
})
