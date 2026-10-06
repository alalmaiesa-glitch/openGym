import { afterEach, describe, expect, it } from 'vitest'
import arLocale from '../locales/ar.js'
import arInstructions from '../instr/ar.js'
import arNames from '../exercise-names/ar.js'
import pt650NativeArInstructions from './pt650-native-instr-ar.js'
import { CATALOGUE, EXIDX, searchExercises, searchScore } from './exercises.js'
import { _setLangState, exerciseNameFor, exerciseNameSearchText } from './i18n-core.js'

afterEach(() => _setLangState('en', {}, null, null))

const allArInstructions = { ...arInstructions, ...pt650NativeArInstructions }

describe('Arabic exercise library', () => {
  it('covers every built-in exercise with an Arabic title and Arabic instructions', () => {
    expect(CATALOGUE).toHaveLength(1326)
    for (const ex of CATALOGUE) {
      expect(arNames[ex.id], ex.id + ' ' + ex.n).toEqual(expect.any(String))
      expect(arNames[ex.id], ex.id + ' ' + ex.n).toMatch(/[\u0600-\u06FF]/)
      expect(allArInstructions[ex.id], ex.id + ' ' + ex.n).toEqual(expect.any(Array))
      expect(allArInstructions[ex.id].length, ex.id + ' ' + ex.n).toBeGreaterThan(0)
      expect(allArInstructions[ex.id].every(step => typeof step === 'string' && step.trim())).toBe(true)
    }
  })

  it('keeps the English canonical title searchable beside Arabic', () => {
    _setLangState('ar', arLocale, allArInstructions, arNames, false, false)
    const bench = EXIDX['0025']
    expect(exerciseNameFor(bench)).toBe('ضغط الصدر بالبار')
    const corpus = exerciseNameSearchText(bench)
    expect(corpus).toContain('ضغط الصدر بالبار')
    expect(corpus).toContain('barbell bench press')
    expect(searchScore(bench, 'صدر بار')).toBeGreaterThan(0)
    expect(searchScore(bench, 'bench press')).toBeGreaterThan(0)
  })

  it('finds catalogue exercises by Arabic muscle and equipment terms', () => {
    _setLangState('ar', arLocale, allArInstructions, arNames, false, false)
    const hits = searchExercises(CATALOGUE, 'صدر دمبل')
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.some(ex => ex.eq === 'dumbbell' && (ex.bp === 'chest' || ex.tg === 'pectorals'))).toBe(true)
  })

  it('normalizes common Arabic spelling variants in search', () => {
    _setLangState('ar', arLocale, allArInstructions, arNames, false, false)
    expect(searchExercises(CATALOGUE, 'اكتاف').length).toBeGreaterThan(0)
    expect(searchExercises(CATALOGUE, 'أكتاف').length).toBeGreaterThan(0)
  })
})
