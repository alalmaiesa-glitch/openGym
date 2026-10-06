import { createHash } from 'node:crypto'
import { createReadStream, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const frontendRoot = dirname(here)
const repoRoot = dirname(frontendRoot)
const manifestPath = join(frontendRoot, 'pt650-owned-motion.json')
const allowedExtensions = new Set(['.mp4', '.mov', '.m4v', '.webm'])

function usage() {
  console.error('Usage: node scripts/ingest-pt650-owned-capture.mjs <exerciseId> <videoPath> [--write]')
}

async function sha256File(path) {
  const hash = createHash('sha256')
  await new Promise((resolvePromise, reject) => {
    const stream = createReadStream(path)
    stream.on('data', chunk => hash.update(chunk))
    stream.on('error', reject)
    stream.on('end', resolvePromise)
  })
  return hash.digest('hex')
}

const args = process.argv.slice(2)
const write = args.includes('--write')
const positional = args.filter(x => x !== '--write')
const [exerciseId, inputPath] = positional

if (!exerciseId || !inputPath || positional.length !== 2) {
  usage()
  process.exit(2)
}

const videoPath = resolve(inputPath)
const extension = extname(videoPath).toLowerCase()
if (!allowedExtensions.has(extension)) {
  throw new Error(`unsupported capture format ${extension || '(none)'}; expected MP4, MOV, M4V or WebM`)
}

const stat = statSync(videoPath)
if (!stat.isFile() || stat.size <= 0) throw new Error('capture must be a non-empty file')

const insideRepo = !relative(repoRoot, videoPath).startsWith('..') && !isAbsolute(relative(repoRoot, videoPath))
const approvedLocalCaptureRoot = join(frontendRoot, '.pt650-captures')
const insideApprovedCaptureRoot =
  videoPath === approvedLocalCaptureRoot ||
  (!relative(approvedLocalCaptureRoot, videoPath).startsWith('..') &&
   !isAbsolute(relative(approvedLocalCaptureRoot, videoPath)))

if (insideRepo && !insideApprovedCaptureRoot) {
  throw new Error('raw PT650 capture inside the repository is allowed only under frontend/.pt650-captures/')
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
if (manifest.policy?.sourceVideoPublished !== false || manifest.policy?.publicProduct !== 'animated-only') {
  throw new Error('owned-motion privacy policy is not active')
}

const item = manifest.captures?.find(x => x.exerciseId === exerciseId)
if (!item) throw new Error(`unknown PT650 owned-motion exercise: ${exerciseId}`)
if (item.source?.kind !== 'PT650-owned-capture') throw new Error(`${exerciseId}: capture source is not PT650-owned`)
if (!['awaiting-owned-capture', 'captured'].includes(item.status)) {
  throw new Error(`${exerciseId}: ingest is not allowed from status ${item.status}`)
}

const digest = await sha256File(videoPath)
if (item.status === 'captured' && item.source.videoSha256 && item.source.videoSha256 !== digest) {
  throw new Error(`${exerciseId}: a different capture is already locked; reset explicitly before replacing it`)
}

const result = {
  exerciseId,
  status: 'captured',
  videoSha256: digest,
  bytes: stat.size,
  format: extension.slice(1),
  sourceVideoPublished: false,
  rawCaptureCommitted: false,
  fileNameDisplayedOnly: basename(videoPath),
}

if (write) {
  item.status = 'captured'
  item.source.videoSha256 = digest
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  result.manifestUpdated = true
} else {
  result.manifestUpdated = false
}

console.log(JSON.stringify(result, null, 2))
