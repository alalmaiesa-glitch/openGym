import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = dirname(here)
const lock = JSON.parse(readFileSync(join(root, 'pt650-3d-factory.lock.json'), 'utf8'))
const outDir = resolve(process.argv[2] || join(root, 'public', 'pt650-3d'))
const isHash = value => /^[0-9a-f]{64}$/i.test(value || '')
let bootstrap = false
let checked = 0

for (const asset of lock.assets) {
  for (const file of Object.values(asset.files)) {
    const path = join(outDir, file.name)
    const bytes = readFileSync(path)
    const actual = createHash('sha256').update(bytes).digest('hex')
    if (!isHash(file.sha256)) {
      bootstrap = true
      console.error(`PT650_FACTORY_HASH ${file.name} ${actual}`)
    } else if (actual !== file.sha256.toLowerCase()) {
      throw new Error(
        `PT650 3D Factory SHA256 mismatch for ${file.name}\nexpected ${file.sha256}\nactual   ${actual}`,
      )
    }
    checked++
    console.log(`verified factory output ${file.name} ${bytes.length} bytes`)
  }
}

if (bootstrap) {
  throw new Error(
    'PT650 3D Factory output lock is in bootstrap mode. Copy PT650_FACTORY_HASH values into pt650-3d-factory.lock.json and rerun.',
  )
}

console.log(`verified ${checked} PT650 3D Factory output files`)
