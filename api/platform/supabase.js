const DEFAULT_TIMEOUT_MS = 12000

const baseUrl = () => String(process.env.PT650_SUPABASE_URL || '').replace(/\/$/, '')
const serviceKey = () => String(process.env.PT650_SUPABASE_SERVICE_ROLE_KEY || '')

export function platformConfigured() {
  return /^https:\/\//i.test(baseUrl()) && serviceKey().length >= 20
}

export class PlatformError extends Error {
  constructor(message, code = 'platform-error', status = 503) {
    super(message)
    this.name = 'PlatformError'
    this.code = code
    this.status = status
  }
}

export async function platformRpc(name, params = {}, { fetchImpl = globalThis.fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (!platformConfigured()) {
    throw new PlatformError('PT650 platform service is not configured', 'platform-unavailable', 503)
  }

  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), timeoutMs)
  timer.unref?.()

  try {
    const response = await fetchImpl(baseUrl() + '/rest/v1/rpc/' + encodeURIComponent(name), {
      method: 'POST',
      signal: ctl.signal,
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey(),
        Authorization: 'Bearer ' + serviceKey()
      },
      body: JSON.stringify(params)
    })

    const raw = await response.text()
    let data = null
    try { data = raw ? JSON.parse(raw) : null } catch { /* provider shape handled below */ }

    if (!response.ok) {
      throw new PlatformError(
        'PT650 platform database request failed',
        response.status === 429 ? 'platform-rate-limit' : 'platform-upstream',
        response.status === 429 ? 429 : 503
      )
    }

    return data
  } catch (e) {
    if (e instanceof PlatformError) throw e
    if (e?.name === 'AbortError') throw new PlatformError('PT650 platform database timed out', 'platform-timeout', 504)
    throw new PlatformError('PT650 platform database is unreachable', 'platform-network', 503)
  } finally {
    clearTimeout(timer)
  }
}
