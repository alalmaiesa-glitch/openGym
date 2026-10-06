import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = dirname(here)
const manifest = JSON.parse(readFileSync(join(root, 'pt650-owned-motion.json'), 'utf8'))
const registrySource = readFileSync(join(root, 'src', 'components', 'pt650-3d-registry.js'), 'utf8')

const SHA256 = /^[0-9a-f]{64}$/i
const allowedStatuses = new Set([
  'awaiting-owned-capture',
  'captured',
  'pose-extracted',
  'qa-approved',
  'registered',
])

if (manifest.format !== 'pt650-owned-motion/1') throw new Error('invalid PT650 owned-motion format')
if (manifest.policy?.allowedSource !== 'PT650-owned-capture') throw new Error('owned-motion source policy must be PT650-owned-capture')
if (manifest.policy?.publicProduct !== 'animated-only') throw new Error('PT650 public product must remain animated-only')
if (manifest.policy?.sourceVideoPublished !== false) throw new Error('source capture video must never be published')
if (manifest.policy?.requireExactExerciseBinding !== true) throw new Error('exact exercise binding must remain mandatory')

for (const item of manifest.captures || []) {
  if (!item.exerciseId || !item.exercise || !item.target) throw new Error('owned-motion entry missing exercise identity')
  if (!allowedStatuses.has(item.status)) throw new Error(`unsupported owned-motion status: ${item.status}`)
  if (item.source?.kind !== 'PT650-owned-capture') throw new Error(`${item.exerciseId}: non-owned capture source rejected`)
  if (item.source?.redistribution !== 'derived-animation-only') throw new Error(`${item.exerciseId}: source video redistribution must stay disabled`)
  if (!item.captureProtocol?.fullBodyVisible || !item.captureProtocol?.cameraFixed) {
    throw new Error(`${item.exerciseId}: capture protocol must require fixed-camera full-body footage`)
  }
  if ((item.captureProtocol?.minimumFps || 0) < 30) throw new Error(`${item.exerciseId}: capture must be at least 30 fps`)
  if (!Array.isArray(item.captureProtocol?.requiredSequence) || item.captureProtocol.requiredSequence.length < 3) {
    throw new Error(`${item.exerciseId}: capture sequence is incomplete`)
  }

  const registered = registrySource.includes(`'${item.exerciseId}': Object.freeze({`)
  const gate = item.releaseGate || {}

  if (item.status === 'awaiting-owned-capture') {
    if (item.source.videoSha256 !== null || item.source.motionSha256 !== null) {
      throw new Error(`${item.exerciseId}: awaiting capture must not contain invented hashes`)
    }
    if (registered || gate.runtimeRegistered) {
      throw new Error(`${item.exerciseId}: pending capture must not enter the public 3D registry`)
    }
    continue
  }

  if (!SHA256.test(item.source.videoSha256 || '')) throw new Error(`${item.exerciseId}: captured video SHA256 required`)
  if (['pose-extracted', 'qa-approved', 'registered'].includes(item.status) && !SHA256.test(item.source.motionSha256 || '')) {
    throw new Error(`${item.exerciseId}: extracted motion SHA256 required`)
  }
  if (item.status === 'registered') {
    if (!gate.poseExtracted || !gate.anatomyQaPassed || !gate.visualReviewPassed || !gate.runtimeRegistered || !registered) {
      throw new Error(`${item.exerciseId}: registration requires every release gate`)
    }
  } else if (registered || gate.runtimeRegistered) {
    throw new Error(`${item.exerciseId}: runtime registration is forbidden before registered status`)
  }
}

console.log(`verified ${manifest.captures.length} PT650 owned-motion capture target(s)`)
