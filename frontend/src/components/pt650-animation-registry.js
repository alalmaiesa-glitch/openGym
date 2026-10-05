export const PT650_ANIMATION_MODELS = Object.freeze({
  '0025': Object.freeze({
    id: 'bench-press-v1',
    exercise: 'barbell bench press',
    medium: 'authored-svg-motion',
    provenance: 'PT650 original',
    version: 1,
    target: ['pectorals', 'triceps'],
  }),
  '0043': Object.freeze({
    id: 'full-squat-v1',
    exercise: 'barbell full squat',
    medium: 'authored-svg-motion',
    provenance: 'PT650 original',
    version: 1,
    target: ['quads', 'glutes'],
  }),
  '0662': Object.freeze({
    id: 'push-up-v1',
    exercise: 'push-up',
    medium: 'authored-svg-motion',
    provenance: 'PT650 original',
    version: 1,
    target: ['pectorals', 'triceps'],
  }),
})

export const animatedModelFor = exerciseId =>
  PT650_ANIMATION_MODELS[String(exerciseId || '')] || null
