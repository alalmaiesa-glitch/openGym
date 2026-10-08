// Removed public PT650/OpenGym3D demo registrations; exercise catalogue is unchanged.
export const PT650_3D_MODELS = Object.freeze({})
export const threeDModelFor = exerciseId => PT650_3D_MODELS[String(exerciseId || '')] || null
