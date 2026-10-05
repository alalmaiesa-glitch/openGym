import { createHash } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = dirname(here)
const lockPath = join(root, 'pt650-3d-assets.lock.json')
const lock = JSON.parse(readFileSync(lockPath, 'utf8'))

const checkOnly = process.argv.includes('--check')
const outDir = checkOnly
  ? join(root, '.pt650-3d-check')
  : join(root, 'public', 'pt650-3d')

const isHash = value => /^[0-9a-f]{64}$/i.test(value || '')

async function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex')
}

async function fetchBytes(url) {
  const res = await fetch(url, {
    headers: {
      'user-agent': 'PT650-asset-mirror/1.0',
      accept: '*/*',
    },
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`download failed ${res.status} ${res.statusText}: ${url}`)
  return Buffer.from(await res.arrayBuffer())
}

await rm(outDir, { recursive: true, force: true })
await mkdir(outDir, { recursive: true })

let bootstrap = false
let copied = 0

try {
  for (const asset of lock.assets) {
    for (const [kind, file] of Object.entries(asset.files)) {
      const url = `${lock.baseUrl.replace(/\/$/, '')}/${file.name}`
      const bytes = await fetchBytes(url)
      const actual = await sha256(bytes)

      if (!isHash(file.sha256)) {
        bootstrap = true
        console.error(`PT650_ASSET_HASH ${file.name} ${actual}`)
      } else if (actual !== file.sha256.toLowerCase()) {
        throw new Error(
          `SHA256 mismatch for ${file.name}\nexpected ${file.sha256}\nactual   ${actual}\nsource   ${url}`,
        )
      }

      if (!checkOnly) {
        await writeFile(join(outDir, basename(file.name)), bytes)
      }
      copied++
      console.log(`verified ${kind.padEnd(3)} ${file.name} ${bytes.length} bytes`)
    }
  }

  if (bootstrap) {
    throw new Error(
      'PT650 3D asset lock is in bootstrap mode. Copy the PT650_ASSET_HASH values above into pt650-3d-assets.lock.json and rerun.',
    )
  }

  console.log(`${checkOnly ? 'checked' : 'mirrored'} ${copied} PT650 3D files`)
} finally {
  if (checkOnly) await rm(outDir, { recursive: true, force: true })
}
