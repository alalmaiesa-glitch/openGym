import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MACHINE_SCAN_MAX_IMAGE_BYTES,
  MACHINE_SCAN_TARGETS,
  normalizeRecognition,
  recognitionPrompt,
  validateMachineImage,
} from '../machine-scan.js'

test('machine scan targets are a small closed vocabulary', () => {
  assert.ok(MACHINE_SCAN_TARGETS.length >= 7)
  assert.equal(new Set(MACHINE_SCAN_TARGETS.map(x => x.id)).size, MACHINE_SCAN_TARGETS.length)
  const prompt = recognitionPrompt()
  for (const target of MACHINE_SCAN_TARGETS) assert.match(prompt, new RegExp(target.id))
  assert.match(prompt, /machineId must be null/i)
  assert.match(prompt, /Do not identify or describe any person/i)
})

test('image validation accepts bounded supported input and rejects unsafe input', () => {
  const ok = validateMachineImage({ mime: 'image/jpeg', imageBase64: Buffer.from('small-jpeg').toString('base64') })
  assert.equal(ok.ok, true)
  assert.equal(validateMachineImage({ mime: 'image/gif', imageBase64: 'AAAA' }).code, 'bad-image-type')
  assert.equal(validateMachineImage({ mime: 'image/jpeg', imageBase64: '%%%not-base64%%%' }).code, 'bad-image')
  const huge = Buffer.alloc(MACHINE_SCAN_MAX_IMAGE_BYTES + 1).toString('base64')
  assert.equal(validateMachineImage({ mime: 'image/jpeg', imageBase64: huge }).code, 'bad-image-size')
})

test('recognition fails closed below confidence or outside the catalogue', () => {
  assert.deepEqual(
    normalizeRecognition('{"machineId":"chest_press","confidence":0.91,"evidence":["two handles"],"uncertain":false}'),
    { machineId: 'chest_press', confidence: 0.91, evidence: ['two handles'], uncertain: false }
  )
  assert.equal(normalizeRecognition('{"machineId":"chest_press","confidence":0.64,"evidence":[]}').machineId, null)
  assert.equal(normalizeRecognition('{"machineId":"invented_machine","confidence":0.99,"evidence":[]}').machineId, null)
  assert.equal(normalizeRecognition('not json').machineId, null)
})
