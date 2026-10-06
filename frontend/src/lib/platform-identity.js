import { useEffect, useSyncExternalStore } from 'react'
import { onPlatformAuthChange, platformSession, platformUser } from './platform-auth.js'

let state = { ready: false, session: null }
let started = false
let authOff = null
const listeners = new Set()

const emit = next => {
  state = next
  for (const fn of listeners) fn()
}

async function validate(candidate) {
  if (!candidate?.access_token) {
    emit({ ready: true, session: null })
    return
  }
  const user = await platformUser(candidate)
  if (!user?.id) {
    emit({ ready: true, session: null })
    return
  }
  emit({ ready: true, session: { ...candidate, user } })
}

function start() {
  if (started) return
  started = true
  authOff = onPlatformAuthChange(candidate => { validate(candidate).catch(() => emit({ ready: true, session: null })) })
  platformSession()
    .then(validate)
    .catch(() => emit({ ready: true, session: null }))
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function usePlatformIdentity() {
  useEffect(() => { start() }, [])
  return useSyncExternalStore(subscribe, () => state, () => state)
}

// Test/support only: lets a full module teardown release the browser listener if needed.
export function stopPlatformIdentity() {
  authOff?.()
  authOff = null
  started = false
  state = { ready: false, session: null }
}
