import { platformConfig, platformSession } from './platform-auth.js'

function fail(message, status, code, data) {
  return Object.assign(new Error(message), { status, code, data: data || {} })
}

export async function platformApi(action, { method = 'GET', body, timeout = 30000 } = {}) {
  const session = await platformSession()
  if (!session?.access_token) throw fail('PT650 account required', 401, 'auth')

  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), timeout)
  try {
    const response = await fetch(platformConfig.functionUrl + '/' + encodeURIComponent(action), {
      method,
      signal: ctl.signal,
      headers: {
        apikey: platformConfig.publishableKey,
        Authorization: 'Bearer ' + session.access_token,
        'Content-Type': 'application/json'
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {})
    })
    let data = null
    try { data = await response.json() } catch {}
    if (!response.ok) throw fail(data?.error || ('HTTP ' + response.status), response.status, data?.code || 'platform-error', data)
    if (!data || typeof data !== 'object') throw fail('Invalid PT650 platform response', response.status, 'bad-response')
    return data
  } catch (e) {
    if (e?.name === 'AbortError') throw fail('PT650 platform timed out', 0, 'timeout')
    throw e
  } finally {
    clearTimeout(timer)
  }
}
