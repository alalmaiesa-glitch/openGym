import { Capacitor, registerPlugin } from '@capacitor/core'
import { platformApi } from './platform-api.js'

const AppleHealth = registerPlugin('AppleHealth')

export async function appleHealthCapability() {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
    return { available: false, reason: 'ios-native-required' }
  }
  try {
    const result = await AppleHealth.isAvailable()
    return { available: result?.available === true, ...result }
  } catch (error) {
    return { available: false, reason: error?.code || 'healthkit-unavailable' }
  }
}

export async function syncAppleHealth() {
  const capability = await appleHealthCapability()
  if (!capability.available) {
    throw Object.assign(new Error('Apple Health requires the PT650 iPhone app'), {
      code: capability.reason || 'ios-native-required'
    })
  }

  // HealthKit deliberately keeps read authorization opaque. A completed sheet is not proof
  // that any read permission was granted.
  const permission = await AppleHealth.requestAuthorization()
  const changes = await AppleHealth.readChanges({ limit: 100 })
  const observations = Array.isArray(changes?.observations) ? changes.observations : []
  const activities = Array.isArray(changes?.activities) ? changes.activities : []
  const deletions = Array.isArray(changes?.deletions) ? changes.deletions : []
  const installationId = String(changes?.installationId || '').toLowerCase()

  if (!/^[a-f0-9-]{36}$/.test(installationId)) {
    throw Object.assign(new Error('Invalid Apple Health installation identity'), { code: 'bad-native-id' })
  }

  // Opaque HKQueryAnchor bytes never leave the device. The server receives only safe progress
  // metadata. The device anchors are advanced strictly after atomic server ingest succeeds.
  const cursor = {
    adapterVersion: 1,
    installationId,
    queryKeys: Object.keys(changes?.nextAnchors || {}).sort(),
    counts: {
      observations: observations.length,
      activities: activities.length,
      deletions: deletions.length
    }
  }

  const result = await platformApi('wearable-native-ingest', {
    method: 'POST',
    timeout: 60000,
    body: {
      provider: 'apple_health',
      permissionState: {
        authorizationRequested: permission?.authorizationRequested === true,
        requestCompleted: permission?.requestCompleted === true,
        readAuthorizationOpaque: true,
        readableData: observations.length + activities.length > 0,
        observedAt: changes?.queriedAt || new Date().toISOString()
      },
      cursorKey: 'apple_health:' + installationId,
      cursor,
      highWatermark: changes?.highWatermark || null,
      observations,
      activities,
      deletions
    }
  })

  await AppleHealth.commitAnchors({ anchors: changes?.nextAnchors || {} })
  return { ...result, anchorCommitted: true }
}
