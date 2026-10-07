import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const library = readFileSync(resolve(process.cwd(), 'src/views/Library.jsx'), 'utf8')
const sheets = readFileSync(resolve(process.cwd(), 'src/sheets.jsx'), 'utf8')
const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

describe('PT650 Exercise Experience Redesign V2', () => {
  it('extends the Sport Tech library without replacing its functional contracts', () => {
    expect(library).toContain('library-page pt650-library-v2')
    expect(library).toContain('className="library-resultbar"')
    expect(library).toContain('data-pt650-motion=')
    expect(library).toContain("exerciseDetailSheet(e)")
    expect(library).toContain("addToRoutineSheet(e)")
  })

  it('gives exercise detail a dedicated hierarchy around the existing actions', () => {
    expect(sheets).toContain('className="pt650-exercise-detail-v2"')
    expect(sheets).toContain('className="exercise-detail-media"')
    expect(sheets).toContain('className="exercise-detail-tags"')
    expect(sheets).toContain('className="exercise-detail-actions"')
    expect(sheets).toContain('className="exercise-detail-panel exercise-detail-howto"')
    expect(sheets).toContain('<Media ex={ex} />')
    expect(sheets).toContain("addToRoutineSheet(ex)")
    expect(sheets).toContain("exerciseHistorySheet(ex.id)")
  })

  it('keeps title sizes controlled rather than returning to oversized headings', () => {
    expect(css).toContain('PT650 Exercise Experience V2')
    expect(css).toContain('.pt650-library-v2 .library-title-group h1{')
    expect(css).toContain('font-size:24px')
    expect(css).toContain('.pt650-exercise-detail-v2 .exercise-detail-title h3{')
    expect(css).toContain('font-size:22px')
  })

  it('styles the exercise sheet as a compact mobile-first Sport Tech surface', () => {
    expect(css).toContain('.sheet:has(.pt650-exercise-detail-v2)')
    expect(css).toContain('.exercise-detail-performance{')
    expect(css).toContain('.exercise-detail-actions{')
    expect(css).toContain('.exercise-detail-howto .steps-list{')
    expect(css).toContain('@media (max-width:420px)')
  })

  it('preserves the clean modern-media pending state inside redesigned details', () => {
    expect(css).toContain('.exercise-detail-media .pt650-media-pending')
    expect(css).toContain('.exercise-detail-media .pt650-provider-frames')
  })
})
