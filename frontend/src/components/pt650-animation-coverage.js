import { CATALOGUE } from '../lib/exercises.js'
import { animationAssetFor } from './pt650-animation-provider.js'

const round2 = value => Math.round(value * 100) / 100

function summarize(rows, key) {
  const buckets = new Map()
  for (const row of rows) {
    const value = String(row[key] || 'unknown')
    const bucket = buckets.get(value) || { key: value, total: 0, covered: 0, missing: 0, coveragePct: 0 }
    bucket.total += 1
    if (row.covered) bucket.covered += 1
    else bucket.missing += 1
    buckets.set(value, bucket)
  }

  return [...buckets.values()]
    .map(bucket => Object.freeze({
      ...bucket,
      coveragePct: bucket.total ? round2(bucket.covered / bucket.total * 100) : 0,
    }))
    .sort((a, b) => b.missing - a.missing || b.total - a.total || a.key.localeCompare(b.key))
}

export function buildAnimationCoverageReport(exercises = CATALOGUE) {
  const rows = exercises.map(exercise => {
    const asset = animationAssetFor(exercise.id)
    return Object.freeze({
      id: String(exercise.id),
      bodyPart: exercise.bp || 'unknown',
      equipment: exercise.eq || 'unknown',
      covered: !!asset,
      provider: asset?.provider || null,
    })
  })

  const coveredRows = rows.filter(row => row.covered)
  const selectedByProvider = coveredRows.reduce((acc, row) => {
    acc[row.provider] = (acc[row.provider] || 0) + 1
    return acc
  }, {})

  return Object.freeze({
    total: rows.length,
    covered: coveredRows.length,
    uncovered: rows.length - coveredRows.length,
    coveragePct: rows.length ? round2(coveredRows.length / rows.length * 100) : 0,
    selectedByProvider: Object.freeze({ ...selectedByProvider }),
    byBodyPart: Object.freeze(summarize(rows, 'bodyPart')),
    byEquipment: Object.freeze(summarize(rows, 'equipment')),
  })
}
