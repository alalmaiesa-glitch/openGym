const PROJECT_URL = (import.meta.env.VITE_PT650_SUPABASE_URL || 'https://dbqeigdhabysxcwutrbc.supabase.co').replace(/\/$/, '')
const PUBLISHABLE_KEY = import.meta.env.VITE_PT650_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_j03HP9UQCP1_QzNh3A6LWg_dOFzDdK4'
const STORAGE_KEY = 'pt650_platform_session_v1'
const AUTH_EVENT = 'pt650-platform-auth'

const authHeaders = token => ({
  apikey: PUBLISHABLE_KEY,
  'Content-Type': 'application/json',
  ...(token ? { Authorization: 'Bearer ' + token } : {})
})

const save = session => {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {}
  try { window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: session || null })) } catch {}
  return session || null
}

export function platformStoredSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    return session?.access_token && session?.refresh_token ? session : null
  } catch { return null }
}

async function authRequest(path, { method = 'POST', body, token } = {}) {
  const response = await fetch(PROJECT_URL + '/auth/v1/' + path, {
    method,
    headers: authHeaders(token),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  })
  let data = null
  try { data = await response.json() } catch {}
  if (!response.ok) {
    const message = data?.msg || data?.message || data?.error_description || data?.error || ('HTTP ' + response.status)
    const error = Object.assign(new Error(message), { status: response.status, code: data?.error_code || data?.code || 'auth-error' })
    throw error
  }
  return data
}

function normalizedSession(data) {
  if (!data?.access_token || !data?.refresh_token) return null
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Number(data.expires_at) || Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600),
    token_type: data.token_type || 'bearer',
    user: data.user || null
  }
}

export async function platformSignIn(email, password) {
  const data = await authRequest('token?grant_type=password', {
    body: { email: String(email || '').trim(), password: String(password || '') }
  })
  const session = normalizedSession(data)
  if (!session) throw Object.assign(new Error('No session returned'), { code: 'auth-no-session' })
  return save(session)
}

export async function platformSignUp(email, password) {
  const data = await authRequest('signup', {
    body: { email: String(email || '').trim(), password: String(password || '') }
  })
  const session = normalizedSession(data)
  if (session) return { session: save(session), needsConfirmation: false, user: data.user || session.user }
  return { session: null, needsConfirmation: !!data?.user, user: data?.user || null }
}

export async function platformRefresh(session = platformStoredSession()) {
  if (!session?.refresh_token) return save(null)
  try {
    const data = await authRequest('token?grant_type=refresh_token', {
      body: { refresh_token: session.refresh_token }
    })
    const next = normalizedSession(data)
    return next ? save(next) : save(null)
  } catch (e) {
    if (e?.status === 400 || e?.status === 401) save(null)
    throw e
  }
}

export async function platformSession({ refresh = true } = {}) {
  const current = platformStoredSession()
  if (!current) return null
  const expiresMs = (Number(current.expires_at) || 0) * 1000
  if (!refresh || expiresMs > Date.now() + 90_000) return current
  try { return await platformRefresh(current) }
  catch { return null }
}

export async function platformUser(session) {
  const current = session || await platformSession()
  if (!current?.access_token) return null
  try {
    const data = await authRequest('user', { method: 'GET', token: current.access_token })
    return data || null
  } catch (e) {
    if (e?.status === 401) save(null)
    return null
  }
}

export async function platformSignOut() {
  const session = platformStoredSession()
  try {
    if (session?.access_token) await authRequest('logout', { token: session.access_token })
  } catch {}
  save(null)
}

export function onPlatformAuthChange(fn) {
  const handler = e => fn(e.detail || null)
  window.addEventListener(AUTH_EVENT, handler)
  return () => window.removeEventListener(AUTH_EVENT, handler)
}

export const platformConfig = Object.freeze({
  url: PROJECT_URL,
  publishableKey: PUBLISHABLE_KEY,
  functionUrl: PROJECT_URL + '/functions/v1/pt650-platform'
})
