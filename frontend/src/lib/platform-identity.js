import { useEffect, useState } from 'react'
import { onPlatformAuthChange, platformSession, platformStoredSession } from './platform-auth.js'

export function usePlatformIdentity() {
  const [state, setState] = useState(() => ({
    ready: false,
    session: platformStoredSession()
  }))

  useEffect(() => {
    let alive = true
    const apply = session => {
      if (alive) setState({ ready: true, session: session || null })
    }

    const off = onPlatformAuthChange(apply)
    platformSession().then(apply).catch(() => apply(null))

    return () => {
      alive = false
      off?.()
    }
  }, [])

  return state
}
