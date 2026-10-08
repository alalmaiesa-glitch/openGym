// Retired schematic motion is no longer available in the public app.
export const PT650_ANIMATION_MODELS = Object.freeze({})
export const animatedModelFor = exerciseId => PT650_ANIMATION_MODELS[String(exerciseId || '')] || null
