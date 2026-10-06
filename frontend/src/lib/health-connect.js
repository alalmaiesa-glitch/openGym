import { Capacitor, registerPlugin } from '@capacitor/core'
import { platformApi } from './platform-api.js'

const HealthConnect = registerPlugin('HealthConnect')

export async function healthConnectCapability() {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return { available: false, reason: 'android-native-required' }
  }
  try {
    const result = await HealthConnect.isAvailable()
    return {
      available: result?.available === true,
      ...result,
      reason: result?.available === true
        ? null
        : result?.providerUpdateRequired
          ? 'health-connect-update-required'
          : 'health-connect-unavailable'
    }
  } catch (error) {
    return { available: false, reason: error?.code || 'health-connect-unavailable' }
  }
}

export async function syncHealthConnect() {
  const capability = await healthConnectCapability()
  if (!capability.available) {
    throw Object.assign(new Error(
      capability.reason === 'health-connect-update-required'
        ? 'Health Connect needs to be installed or updated'
        : 'Health Connect requires the PT650 Android app'
    ), { code: capability.reason || 'android-native-required' })
  }

  const permission = await HealthConnect.requestAuthorization()
  const granted = Array.isArray(permission?.granted) ? permission.granted : []
  const query = await HealthConnect.queryKeys()
  const keys = Array.isArray(query?.keys) ? query.keys : []

  let insertedObservations = 0
  let insertedActivities = 0
  let received = 0
  let active = false
  let committed = 0

  for (const key of keys) {
    // Health Connect deletions do not expose record type. PT650 therefore uses one differential
    // cursor per record type so every deletion keeps an unambiguous canonical object kind.
    for (let page = 0; page < 20; page += 1) {
      const changes = await HealthConnect.readChanges({
        key,
        limit: key === 'exercise' ? 250 : 1000
      })
      const observations = Array.isArray(changes?.observations) ? changes.observations : []
      const activities = Array.isArray(changes?.activities) ? changes.activities : []
      const deletions = Array.isArray(changes?.deletions) ? changes.deletions : []
      const nextToken = String(changes?.nextToken || '')

      // A denied per-type read permission returns no cursor. Do not manufacture a connection.
      if (!nextToken) break

      const cursor = {
        adapterVersion: 1,
        queryKey: key,
        initialBackfill: changes?.initialBackfill === true,
        hasMore: changes?.hasMore === true,
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
          provider: 'health_connect',
          permissionState: {
            authorizationRequested: permission?.authorizationRequested === true,
            allGranted: permission?.allGranted === true,
            granted,
            readableData: observations.length + activities.length > 0,
            observedAt: changes?.queriedAt || new Date().toISOString()
          },
          cursorKey: 'health_connect:' + key,
          cursor,
          highWatermark: changes?.highWatermark || null,
          observations,
          activities,
          deletions
        }
      })

      // Differential progress advances on-device only after the server transaction succeeds.
      await HealthConnect.commitToken({ key, token: nextToken })
      committed += 1
      active = active || result?.status === 'active'
      insertedObservations += Number(result?.inserted?.observations || 0)
      insertedActivities += Number(result?.inserted?.activities || 0)
      received += observations.length + activities.length + deletions.length

      if (changes?.hasMore !== true) break
      if (page === 19) {
        throw Object.assign(new Error('Health Connect has more changes than the safe sync window'), {
          code: 'health-connect-backpressure'
        })
      }
    }
  }

  return {
    status: active ? 'active' : 'pending',
    granted,
    allGranted: permission?.allGranted === true,
    received,
    inserted: { observations: insertedObservations, activities: insertedActivities },
    cursorsCommitted: committed
  }
}
