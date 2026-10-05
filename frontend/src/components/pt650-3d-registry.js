const OPENGYM3D_COMMIT = 'ea3a60130fdcfb3c4771e44d09f84ebab4ee9bae'
const OPENGYM3D_RAW = 'https://raw.githubusercontent.com/AssiamahS/opengym3d/' + OPENGYM3D_COMMIT

export const PT650_3D_MODELS = Object.freeze({
  '0662': Object.freeze({
    id: 'push-up-3d-v1',
    exercise: 'push-up',
    medium: 'interactive-glb',
    engine: 'three-js',
    asset: OPENGYM3D_RAW + '/motions/cc0/mesh2motion/human-addon-animations.glb',
    clip: 'Pushup',
    source: 'Mesh2Motion via OpenGym3D',
    sourceRepo: 'AssiamahS/opengym3d',
    sourceCommit: OPENGYM3D_COMMIT,
    upstreamAsset: 'motions/cc0/mesh2motion/human-addon-animations.glb',
    license: 'CC0-1.0',
    provenance: 'OpenGym3D asset library: motion/cc0/pushup',
    version: 1,
  }),
})

export const threeDModelFor = exerciseId =>
  PT650_3D_MODELS[String(exerciseId || '')] || null
