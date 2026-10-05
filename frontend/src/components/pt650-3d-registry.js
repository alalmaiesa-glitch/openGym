const OPENGYM3D_COMMIT = 'ea3a60130fdcfb3c4771e44d09f84ebab4ee9bae'
const OPENGYM3D_PAGES = 'https://assiamahs.github.io/opengym3d/assets'

export const PT650_3D_MODELS = Object.freeze({
  '0662': Object.freeze({
    id: 'push-up-3d-v2',
    exercise: 'push-up',
    medium: 'opengym3d-rendered-glb',
    engine: 'three-js',
    asset: OPENGYM3D_PAGES + '/push_up.glb',
    previewVideo: OPENGYM3D_PAGES + '/push_up.mp4',
    poster: OPENGYM3D_PAGES + '/push_up.png',
    clip: null,
    camera: 'side',
    source: 'OpenGym3D rendered exercise asset',
    sourceRepo: 'AssiamahS/opengym3d',
    sourceCommit: OPENGYM3D_COMMIT,
    upstreamExerciseSpec: 'exercises/push_up.json',
    upstreamAsset: 'site/assets/push_up.glb',
    upstreamVideo: 'site/assets/push_up.mp4',
    pipelineLicense: 'MIT',
    human: 'MakeHuman / MPFB2 anatomical avatar',
    humanLicense: 'CC0-1.0',
    motion: 'Mesh2Motion Pushup',
    motionLicense: 'CC0-1.0',
    license: 'MIT + CC0-1.0 inputs',
    provenance: 'OpenGym3D asset library motion/cc0/pushup + MPFB2 CC0 human',
    version: 2,
  }),
})

export const threeDModelFor = exerciseId =>
  PT650_3D_MODELS[String(exerciseId || '')] || null
