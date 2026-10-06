import * as cfgStore from './coach/config.js'
import { baseUrlFor } from './coach/core/providers.js'

export const MACHINE_SCAN_MAX_IMAGE_BYTES = 1500 * 1024
export const MACHINE_SCAN_LIMIT_PER_HOUR = 20
const TIMEOUT_MS = 45000
const SUPPORTED_PROVIDERS = new Set(['openai', 'anthropic', 'gemini', 'compatible'])
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])

export const MACHINE_SCAN_TARGETS = Object.freeze([
  { id: 'chest_press', label: 'seated chest press machine', cue: 'back pad; two press handles around chest height; user presses forward' },
  { id: 'lat_pulldown', label: 'lat pulldown station', cue: 'overhead cable; long or neutral-grip bar; thigh restraint pads; downward pull' },
  { id: 'leg_press_45', label: '45 degree leg press', cue: 'large foot platform on an inclined sled; reclined back pad' },
  { id: 'leg_extension', label: 'seated leg extension', cue: 'seat and back pad; roller pad in front of lower shins; knee extension' },
  { id: 'seated_leg_curl', label: 'seated leg curl', cue: 'seat; thigh restraint; lower-leg roller; knee flexion' },
  { id: 'shoulder_press', label: 'seated shoulder press machine', cue: 'back pad; handles start around shoulder level and travel upward' },
  { id: 'seated_row', label: 'seated row machine', cue: 'seated pulling station; lever/cable handles travel toward torso; may have chest support' }
])

const targetIds = new Set(MACHINE_SCAN_TARGETS.map(x => x.id))
const hourBuckets = new Map()

function bucketFor(uid, now = Date.now()) {
  const hour = Math.floor(now / 3600000)
  const current = hourBuckets.get(uid)
  if (!current || current.hour !== hour) {
    const fresh = { hour, count: 0 }
    hourBuckets.set(uid, fresh)
    return fresh
  }
  return current
}

export function consumeMachineScanBudget(uid, now = Date.now()) {
  const bucket = bucketFor(uid, now)
  if (bucket.count >= MACHINE_SCAN_LIMIT_PER_HOUR) return false
  bucket.count += 1
  return true
}

export function validateMachineImage({ mime, imageBase64 }) {
  if (!ALLOWED_MIME.has(mime)) return { ok: false, code: 'bad-image-type' }
  if (typeof imageBase64 !== 'string' || !/^[A-Za-z0-9+/=\r\n]+$/.test(imageBase64)) {
    return { ok: false, code: 'bad-image' }
  }
  let bytes
  try { bytes = Buffer.from(imageBase64, 'base64') } catch { return { ok: false, code: 'bad-image' } }
  if (!bytes.length || bytes.length > MACHINE_SCAN_MAX_IMAGE_BYTES) return { ok: false, code: 'bad-image-size' }
  return { ok: true, bytes: bytes.length }
}

export function recognitionPrompt() {
  const options = MACHINE_SCAN_TARGETS
    .map(x => `- ${x.id}: ${x.label}. Visual cues: ${x.cue}`)
    .join('\n')
  return `Identify the gym machine in the image. Choose ONLY one of the following PT650 machine IDs when the image clearly matches it:
${options}

Return exactly one JSON object:
{"machineId":"one_of_the_ids_or_null","confidence":0.0,"evidence":["short visual cue","short visual cue"],"uncertain":true}

Rules:
- machineId must be null when the machine is not one of the listed targets or the photo is ambiguous.
- confidence is a number from 0 to 1.
- if confidence is below 0.65, machineId must be null and uncertain must be true.
- evidence may contain at most 3 short observations visible in the image.
- Do not identify or describe any person in the image.
- Do not prescribe exercise technique, weight, sets, reps, health advice, or injury advice.
- Do not guess from gym branding alone.`
}

const trimFence = raw => String(raw || '').trim()
  .replace(/^\s*\`\`\`(?:json)?\s*/i, '')
  .replace(/\s*\`\`\`\s*$/, '')

export function normalizeRecognition(raw) {
  let parsed
  try { parsed = typeof raw === 'string' ? JSON.parse(trimFence(raw)) : raw } catch { return { machineId: null, confidence: 0, evidence: [], uncertain: true } }
  const confidence = Math.max(0, Math.min(1, Number(parsed?.confidence) || 0))
  const machineId = targetIds.has(parsed?.machineId) && confidence >= 0.65 && parsed?.uncertain !== true ? parsed.machineId : null
  const evidence = Array.isArray(parsed?.evidence)
    ? parsed.evidence.filter(x => typeof x === 'string').map(x => x.slice(0, 120)).slice(0, 3)
    : []
  return { machineId, confidence, evidence, uncertain: !machineId || parsed?.uncertain === true }
}

function keyFor(resolved) {
  return resolved?.auth?.token || ''
}

function requestFor(provider, { base, key, model, mime, imageBase64, prompt }) {
  const dataUrl = `data:${mime};base64,${imageBase64}`
  if (provider === 'openai' || provider === 'compatible') {
    return {
      url: base + '/v1/chat/completions',
      init: {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(key ? { authorization: 'Bearer ' + key } : {})
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'You are PT650 Machine Scan. Classify only; never invent a machine or training prescription.' },
            { role: 'user', content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: dataUrl } }
            ] }
          ],
          response_format: { type: 'json_object' },
          ...(provider === 'compatible' ? { max_tokens: 350, temperature: 0 } : { max_completion_tokens: 350 })
        })
      },
      read: data => data?.choices?.[0]?.message?.content
    }
  }

  if (provider === 'anthropic') {
    return {
      url: base + '/v1/messages',
      init: {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          max_tokens: 350,
          system: 'You are PT650 Machine Scan. Classify only; never invent a machine or training prescription.',
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mime, data: imageBase64 } },
              { type: 'text', text: prompt }
            ]
          }]
        })
      },
      read: data => (data?.content || []).filter(x => x?.type === 'text').map(x => x.text || '').join('')
    }
  }

  if (provider === 'gemini') {
    return {
      url: base + `/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      init: {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: 'You are PT650 Machine Scan. Classify only; never invent a machine or training prescription.' }] },
          contents: [{
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { mimeType: mime, data: imageBase64 } }
            ]
          }],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 350 }
        })
      },
      read: data => data?.candidates?.[0]?.content?.parts?.map(x => x?.text || '').join('')
    }
  }

  return null
}

async function invokeVision(provider, payload, fetchImpl = globalThis.fetch) {
  const request = requestFor(provider, payload)
  if (!request) return { ok: false, code: 'vision-unavailable' }
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS)
  try {
    const response = await fetchImpl(request.url, { ...request.init, signal: ctl.signal })
    const text = await response.text()
    let data = null
    try { data = JSON.parse(text) } catch { /* handled below */ }
    if (!response.ok) return { ok: false, code: 'provider-error', status: response.status }
    const answer = request.read(data)
    if (!answer) return { ok: false, code: 'provider-shape' }
    return { ok: true, recognition: normalizeRecognition(answer) }
  } catch (e) {
    return { ok: false, code: e?.name === 'AbortError' ? 'timeout' : 'network' }
  } finally {
    clearTimeout(timer)
  }
}

export function machineScanRoutes({ json, readBody, readSession }) {
  return {
    'POST /api/machine-scan/analyze': async (req, res) => {
      const user = readSession(req)
      if (!user) return json(res, 401, { error: 'not signed in', code: 'auth' })
      const body = await readBody(req)
      const image = validateMachineImage(body)
      if (!image.ok) return json(res, 400, { error: 'invalid machine image', code: image.code })

      const cfg = cfgStore.load()
      const provider = cfg.provider
      if (!cfgStore.isEnabled() || !cfgStore.isConnected() || !SUPPORTED_PROVIDERS.has(provider)) {
        return json(res, 409, { error: 'vision recognition is not configured', code: 'vision-unavailable' })
      }

      const model = cfgStore.modelFor(cfg)
      const base = baseUrlFor(provider, cfg)
      if (!model || !base) return json(res, 409, { error: 'vision recognition is not configured', code: 'vision-unavailable' })

      const resolved = cfgStore.credentialFor(user.id)
      if (!resolved.ok) return json(res, 409, { error: 'provider account is not available for this profile', code: 'vision-unavailable' })
      if (!consumeMachineScanBudget(user.id)) {
        return json(res, 429, { error: 'machine scan limit reached', code: 'rate-limit', retryAfter: 3600 })
      }
      cfgStore.bindInstanceCredential(user.id)

      const result = await invokeVision(provider, {
        base,
        key: keyFor(resolved),
        model,
        mime: body.mime,
        imageBase64: body.imageBase64,
        prompt: recognitionPrompt()
      })

      if (!result.ok) {
        const status = result.code === 'timeout' ? 504 : result.code === 'vision-unavailable' ? 409 : 502
        return json(res, status, { error: 'machine recognition failed', code: result.code })
      }

      json(res, 200, {
        ok: true,
        recognition: result.recognition,
        imageStored: false,
        provider
      })
    }
  }
}

export const _test = { requestFor, invokeVision }
