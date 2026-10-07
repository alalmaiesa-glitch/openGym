import { PT650_3D_MODELS } from './pt650-3d-registry.js'
import { PT650_ANIMATION_MODELS } from './pt650-animation-registry.js'
import {
  EXERCISE_ANIMATIC_ASSETS,
  WORKOUT_GUIDE_ASSETS,
  GYM_VISUAL_ASSETS,
} from './pt650-animation-assets.js'

export const PT650_ANIMATION_PROVIDERS = Object.freeze({
  exercise_animatic: Object.freeze({
    id: 'exercise_animatic',
    name: 'Exercise Animatic',
    priority: 500,
    status: 'planned',
    renderer: 'video',
    source: 'https://www.exerciseanimatic.com/free-fitness-exercise-videos',
    licence: 'commercial-bundle-licence-required',
    attributionRequired: false,
    shareAlike: false,
    version: 1,
    assetStatus: 'awaiting-licence-and-ingest',
  }),
  pt650_opengym3d: Object.freeze({
    id: 'pt650_opengym3d',
    name: 'PT650 / OpenGym3D',
    priority: 400,
    status: 'active',
    renderer: 'three',
    source: 'https://github.com/AssiamahS/opengym3d',
    licence: 'MIT pipeline + CC0 motion/human inputs',
    attributionRequired: false,
    shareAlike: false,
    version: 1,
    assetStatus: 'ready',
  }),
  pt650_authored_svg: Object.freeze({
    id: 'pt650_authored_svg',
    name: 'PT650 Authored SVG',
    priority: 300,
    status: 'active',
    renderer: 'svg',
    source: 'PT650',
    licence: 'PT650 original',
    attributionRequired: false,
    shareAlike: false,
    version: 1,
    assetStatus: 'ready',
  }),
  workout_guide: Object.freeze({
    id: 'workout_guide',
    name: 'Workout Guide',
    priority: 200,
    status: 'active',
    renderer: 'frame-sequence',
    source: 'https://github.com/bryllim/workout-guide',
    licence: 'MIT code; CC BY-SA 4.0 visual assets',
    attributionRequired: true,
    shareAlike: true,
    version: 1,
    assetStatus: 'partial-ingest-v2.1',
  }),
  gymvisual: Object.freeze({
    id: 'gymvisual',
    name: 'GymVisual',
    priority: 100,
    status: 'planned',
    renderer: 'video',
    source: 'https://gymvisual.com/',
    licence: 'per-asset commercial licence required',
    attributionRequired: false,
    shareAlike: false,
    version: 1,
    assetStatus: 'gap-fill-only',
  }),
})

export const PT650_ANIMATION_FALLBACK_CHAIN = Object.freeze(
  Object.values(PT650_ANIMATION_PROVIDERS)
    .slice()
    .sort((a, b) => b.priority - a.priority)
    .map(provider => provider.id)
)

const PROVIDER_ASSET_MAPS = Object.freeze({
  exercise_animatic: EXERCISE_ANIMATIC_ASSETS,
  pt650_opengym3d: PT650_3D_MODELS,
  pt650_authored_svg: PT650_ANIMATION_MODELS,
  workout_guide: WORKOUT_GUIDE_ASSETS,
  gymvisual: GYM_VISUAL_ASSETS,
})

function providerCanRender(provider) {
  return provider?.status === 'active'
}

function normalizedAsset(provider, exerciseId, sourceAsset) {
  if (!provider || !sourceAsset) return null
  const status = String(sourceAsset.assetStatus || sourceAsset.status || 'ready')
  return Object.freeze({
    exerciseId: String(exerciseId),
    provider: provider.id,
    providerName: provider.name,
    renderer: sourceAsset.renderer || provider.renderer,
    priority: provider.priority,
    providerStatus: provider.status,
    assetStatus: status,
    available: providerCanRender(provider) && status === 'ready',
    version: Number(sourceAsset.version || provider.version || 1),
    licence: sourceAsset.licence || sourceAsset.license || provider.licence,
    licenceUrl: sourceAsset.licenceUrl || sourceAsset.licenseUrl || provider.licenceUrl || null,
    licenceSource: sourceAsset.licenceSource || sourceAsset.licenseSource || provider.source,
    attribution: sourceAsset.attribution || null,
    sourceCommit: sourceAsset.sourceCommit || null,
    sourceVersion: sourceAsset.sourceVersion || null,
    pt650Changes: sourceAsset.pt650Changes || null,
    attributionRequired: sourceAsset.attributionRequired ?? provider.attributionRequired,
    shareAlike: sourceAsset.shareAlike ?? provider.shareAlike,
    source: sourceAsset.source || provider.source,
    provenance: sourceAsset.provenance || null,
    asset: sourceAsset,
  })
}

export function animationCandidatesFor(exerciseId) {
  const id = String(exerciseId || '')
  if (!id) return []

  return PT650_ANIMATION_FALLBACK_CHAIN
    .map(providerId => {
      const provider = PT650_ANIMATION_PROVIDERS[providerId]
      const sourceAsset = PROVIDER_ASSET_MAPS[providerId]?.[id]
      return normalizedAsset(provider, id, sourceAsset)
    })
    .filter(Boolean)
}

export function animationAssetFor(exerciseId) {
  return animationCandidatesFor(exerciseId).find(candidate => candidate.available) || null
}

export function animationAvailability(exerciseId) {
  const candidates = animationCandidatesFor(exerciseId)
  const selected = candidates.find(candidate => candidate.available) || null
  return Object.freeze({
    exerciseId: String(exerciseId || ''),
    available: !!selected,
    provider: selected?.provider || null,
    renderer: selected?.renderer || null,
    assetStatus: selected?.assetStatus || 'unavailable',
    version: selected?.version || null,
    fallbackChain: PT650_ANIMATION_FALLBACK_CHAIN,
    candidates,
  })
}

export const hasAnimationFor = exerciseId => !!animationAssetFor(exerciseId)
