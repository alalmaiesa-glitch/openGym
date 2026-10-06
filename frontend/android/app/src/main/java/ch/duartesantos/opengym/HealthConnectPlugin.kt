package ch.duartesantos.opengym

import android.content.Intent
import androidx.activity.result.ActivityResult
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.changes.DeletionChange
import androidx.health.connect.client.changes.UpsertionChange
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.BodyFatRecord
import androidx.health.connect.client.records.BodyTemperatureRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateVariabilityRmssdRecord
import androidx.health.connect.client.records.OxygenSaturationRecord
import androidx.health.connect.client.records.Record
import androidx.health.connect.client.records.RespiratoryRateRecord
import androidx.health.connect.client.records.RestingHeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.request.ChangesTokenRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.security.MessageDigest
import java.time.Duration
import java.time.Instant
import kotlin.reflect.KClass

@CapacitorPlugin(name = "HealthConnect")
class HealthConnectPlugin : Plugin() {
    private data class Spec(
        val key: String,
        val recordType: KClass<out Record>,
        val objectKind: String
    )

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val prefs by lazy {
        context.getSharedPreferences("pt650-health-connect", android.content.Context.MODE_PRIVATE)
    }
    private val tokenPrefix = "changes-token."

    private val specs = listOf(
        Spec("weight", WeightRecord::class, "observation"),
        Spec("body_fat", BodyFatRecord::class, "observation"),
        Spec("resting_hr", RestingHeartRateRecord::class, "observation"),
        Spec("hrv_rmssd", HeartRateVariabilityRmssdRecord::class, "observation"),
        Spec("spo2", OxygenSaturationRecord::class, "observation"),
        Spec("respiratory_rate", RespiratoryRateRecord::class, "observation"),
        Spec("body_temperature", BodyTemperatureRecord::class, "observation"),
        Spec("sleep", SleepSessionRecord::class, "observation"),
        Spec("exercise", ExerciseSessionRecord::class, "activity")
    )

    private fun status(): Int = HealthConnectClient.getSdkStatus(context)

    private fun client(): HealthConnectClient = HealthConnectClient.getOrCreate(context)

    private fun permissions(): Set<String> =
        specs.map { HealthPermission.getReadPermission(it.recordType) }.toSet()

    @PluginMethod
    fun isAvailable(call: PluginCall) {
        val sdkStatus = status()
        call.resolve(JSObject().apply {
            put("available", sdkStatus == HealthConnectClient.SDK_AVAILABLE)
            put("platform", "android")
            put("adapterVersion", 1)
            put("sdkStatus", sdkStatus)
            put("providerUpdateRequired", sdkStatus == HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED)
        })
    }

    @PluginMethod
    fun requestAuthorization(call: PluginCall) {
        if (status() != HealthConnectClient.SDK_AVAILABLE) {
            call.reject("Health Connect is unavailable on this device", "health-connect-unavailable")
            return
        }
        scope.launch {
            try {
                val granted = client().permissionController.getGrantedPermissions()
                if (granted.containsAll(permissions())) {
                    resolvePermissions(call, granted, requested = false)
                    return@launch
                }
                val contract = PermissionController.createRequestPermissionResultContract()
                val intent = contract.createIntent(context, permissions())
                activity.runOnUiThread {
                    startActivityForResult(call, intent, "permissionResult")
                }
            } catch (e: Exception) {
                call.reject(e.message ?: "Health Connect permission check failed", "health-connect-permission-error", e)
            }
        }
    }

    @ActivityCallback
    private fun permissionResult(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        if (status() != HealthConnectClient.SDK_AVAILABLE) {
            call.reject("Health Connect became unavailable", "health-connect-unavailable")
            return
        }
        scope.launch {
            try {
                val granted = client().permissionController.getGrantedPermissions()
                resolvePermissions(call, granted, requested = true)
            } catch (e: Exception) {
                call.reject(e.message ?: "Health Connect permission result failed", "health-connect-permission-error", e)
            }
        }
    }

    private fun resolvePermissions(call: PluginCall, granted: Set<String>, requested: Boolean) {
        val required = permissions()
        call.resolve(JSObject().apply {
            put("authorizationRequested", requested)
            put("granted", JSArray(granted.sorted()))
            put("required", JSArray(required.sorted()))
            put("allGranted", granted.containsAll(required))
        })
    }

    @PluginMethod
    fun queryKeys(call: PluginCall) {
        call.resolve(JSObject().apply {
            put("keys", JSArray(specs.map { it.key }))
        })
    }

    @PluginMethod
    fun readChanges(call: PluginCall) {
        if (status() != HealthConnectClient.SDK_AVAILABLE) {
            call.reject("Health Connect is unavailable on this device", "health-connect-unavailable")
            return
        }
        val key = call.getString("key") ?: ""
        val spec = specs.firstOrNull { it.key == key }
        if (spec == null) {
            call.reject("Unknown Health Connect query key", "invalid-query-key")
            return
        }
        val requested = call.getInt("limit") ?: if (spec.objectKind == "activity") 250 else 1000
        val limit = requested.coerceIn(1, if (spec.objectKind == "activity") 250 else 1000)

        scope.launch {
            try {
                val health = client()
                val granted = health.permissionController.getGrantedPermissions()
                val requiredPermission = HealthPermission.getReadPermission(spec.recordType)
                if (!granted.contains(requiredPermission)) {
                    call.resolve(emptyBatch(spec, granted, "permission-not-granted"))
                    return@launch
                }

                val committed = prefs.getString(tokenPrefix + spec.key, null)
                if (committed == null) {
                    val token = health.getChangesToken(ChangesTokenRequest(setOf(spec.recordType)))
                    val start = Instant.now().minus(Duration.ofDays(30))
                    val response = health.readRecords(
                        ReadRecordsRequest(
                            recordType = spec.recordType,
                            timeRangeFilter = TimeRangeFilter.after(start),
                            pageSize = limit
                        )
                    )
                    if (response.pageToken != null) {
                        call.reject(
                            "Initial Health Connect backfill exceeds the safe V1 batch size",
                            "health-connect-backfill-too-large"
                        )
                        return@launch
                    }
                    call.resolve(batchFromRecords(spec, response.records, emptyList(), token, false, granted, true))
                    return@launch
                }

                val response = health.getChanges(committed)
                if (response.changesTokenExpired) {
                    prefs.edit().remove(tokenPrefix + spec.key).apply()
                    call.reject("Health Connect change token expired; retry to rebuild the 30-day cursor", "health-connect-cursor-expired")
                    return@launch
                }
                if (response.changes.size > limit) {
                    call.reject("Health Connect change batch exceeds the safe V1 limit", "health-connect-batch-too-large")
                    return@launch
                }

                val records = mutableListOf<Record>()
                val deletions = mutableListOf<String>()
                response.changes.forEach { change ->
                    when (change) {
                        is UpsertionChange -> records.add(change.record)
                        is DeletionChange -> deletions.add(change.recordId)
                    }
                }
                call.resolve(
                    batchFromRecords(
                        spec,
                        records,
                        deletions,
                        response.nextChangesToken,
                        response.hasMore,
                        granted,
                        false
                    )
                )
            } catch (e: SecurityException) {
                call.reject("Health Connect permission was revoked", "health-connect-permission-revoked", e)
            } catch (e: Exception) {
                call.reject(e.message ?: "Health Connect query failed", "health-connect-query-error", e)
            }
        }
    }

    @PluginMethod
    fun commitToken(call: PluginCall) {
        val key = call.getString("key") ?: ""
        val token = call.getString("token") ?: ""
        if (specs.none { it.key == key } || token.isBlank() || token.length > 8192) {
            call.reject("Invalid Health Connect cursor", "invalid-health-connect-cursor")
            return
        }
        prefs.edit().putString(tokenPrefix + key, token).apply()
        call.resolve(JSObject().apply {
            put("committed", true)
            put("key", key)
        })
    }

    private fun emptyBatch(spec: Spec, granted: Set<String>, reason: String): JSObject =
        JSObject().apply {
            put("key", spec.key)
            put("objectKind", spec.objectKind)
            put("observations", JSArray())
            put("activities", JSArray())
            put("deletions", JSArray())
            put("granted", JSArray(granted.sorted()))
            put("queriedAt", Instant.now().toString())
            put("reason", reason)
            put("hasMore", false)
        }

    private fun batchFromRecords(
        spec: Spec,
        records: List<Record>,
        deletedIds: List<String>,
        nextToken: String,
        hasMore: Boolean,
        granted: Set<String>,
        initial: Boolean
    ): JSObject {
        val observations = JSArray()
        val activities = JSArray()
        var highWatermark: Instant? = null

        records.forEach { record ->
            val end = endTime(record)
            if (end != null && (highWatermark == null || end.isAfter(highWatermark))) highWatermark = end
            when (record) {
                is ExerciseSessionRecord -> activities.put(activity(record))
                else -> observation(record)?.let { observations.put(it) }
            }
        }

        val deletions = JSArray()
        deletedIds.forEach { id ->
            if (id.isNotBlank()) {
                deletions.put(JSObject().apply {
                    put("objectKind", spec.objectKind)
                    put("externalKey", id)
                })
            }
        }

        return JSObject().apply {
            put("key", spec.key)
            put("objectKind", spec.objectKind)
            put("observations", observations)
            put("activities", activities)
            put("deletions", deletions)
            put("nextToken", nextToken)
            put("granted", JSArray(granted.sorted()))
            put("queriedAt", Instant.now().toString())
            put("hasMore", hasMore)
            put("initialBackfill", initial)
            highWatermark?.let { put("highWatermark", it.toString()) }
        }
    }

    private fun observation(record: Record): JSObject? {
        val (metric, value, unit, start, end, aggregation) = when (record) {
            is WeightRecord -> Sextuple("weight_kg", record.weight.inKilograms, "kg", record.time, record.time, "sample")
            is BodyFatRecord -> Sextuple("body_fat_pct", record.percentage.value, "%", record.time, record.time, "sample")
            is RestingHeartRateRecord -> Sextuple("resting_hr_bpm", record.beatsPerMinute.toDouble(), "bpm", record.time, record.time, "sample")
            is HeartRateVariabilityRmssdRecord -> Sextuple("hrv_rmssd_ms", record.heartRateVariabilityMillis, "ms", record.time, record.time, "sample")
            is OxygenSaturationRecord -> Sextuple("spo2_pct", record.percentage.value, "%", record.time, record.time, "sample")
            is RespiratoryRateRecord -> Sextuple("respiratory_rate", record.rate, "/min", record.time, record.time, "sample")
            is BodyTemperatureRecord -> Sextuple("body_temp_c", record.temperature.inCelsius, "°C", record.time, record.time, "sample")
            is SleepSessionRecord -> Sextuple(
                "sleep_duration_min",
                Duration.between(record.startTime, record.endTime).toMillis() / 60000.0,
                "min",
                record.startTime,
                record.endTime,
                "session"
            )
            else -> return null
        }

        val external = record.metadata.id
        if (external.isBlank()) return null
        val fingerprint = sha256(listOf(metric, start.toString(), end.toString(), "%.6f".format(java.util.Locale.US, value), unit).joinToString("|"))

        return JSObject().apply {
            put("externalKey", external)
            put("metric", metric)
            put("valueNum", value)
            put("unit", unit)
            put("startedAt", start.toString())
            put("endedAt", end.toString())
            put("aggregation", aggregation)
            put("confidence", 0.95)
            put("quality", 0.95)
            put("scopeKey", "metric:$metric")
            put("dedupeFingerprint", fingerprint)
            put("metadata", provenance(record))
        }
    }

    private fun activity(record: ExerciseSessionRecord): JSObject {
        val type = exerciseType(record.exerciseType)
        val durationSec = Duration.between(record.startTime, record.endTime).seconds.coerceAtLeast(0)
        val external = record.metadata.id
        val fingerprint = sha256(listOf(type, record.startTime.toString(), record.endTime.toString()).joinToString("|"))
        return JSObject().apply {
            put("externalKey", external)
            put("activityType", type)
            put("title", record.title?.toString()?.take(120) ?: "Health Connect Workout")
            put("startedAt", record.startTime.toString())
            put("endedAt", record.endTime.toString())
            put("durationSec", durationSec)
            put("verification", "source_attested")
            put("confidence", 0.95)
            put("quality", 0.95)
            put("scopeKey", "activity:$type")
            put("dedupeFingerprint", fingerprint)
            put("metadata", provenance(record))
        }
    }

    private fun exerciseType(type: Int): String = when (type) {
        ExerciseSessionRecord.EXERCISE_TYPE_RUNNING -> "run"
        ExerciseSessionRecord.EXERCISE_TYPE_WALKING -> "walk"
        ExerciseSessionRecord.EXERCISE_TYPE_BIKING -> "cycling"
        ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING_OPEN_WATER,
        ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING_POOL -> "swimming"
        ExerciseSessionRecord.EXERCISE_TYPE_HIKING -> "hiking"
        ExerciseSessionRecord.EXERCISE_TYPE_ROWING_MACHINE -> "rowing"
        ExerciseSessionRecord.EXERCISE_TYPE_ELLIPTICAL -> "elliptical"
        ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING -> "strength_training"
        ExerciseSessionRecord.EXERCISE_TYPE_HIGH_INTENSITY_INTERVAL_TRAINING -> "hiit"
        ExerciseSessionRecord.EXERCISE_TYPE_YOGA -> "yoga"
        ExerciseSessionRecord.EXERCISE_TYPE_PILATES -> "pilates"
        else -> "other"
    }

    private fun provenance(record: Record): JSObject =
        JSObject().apply {
            put("healthConnectRecordType", record::class.simpleName ?: "Record")
            put("sourcePackage", record.metadata.dataOrigin.packageName)
            put("recordingMethod", record.metadata.recordingMethod)
            record.metadata.device?.let { device ->
                device.manufacturer?.let { put("deviceManufacturer", it) }
                device.model?.let { put("deviceModel", it) }
                put("deviceType", device.type)
            }
            record.metadata.clientRecordId?.let { put("clientRecordId", it) }
        }

    private fun endTime(record: Record): Instant? = when (record) {
        is WeightRecord -> record.time
        is BodyFatRecord -> record.time
        is RestingHeartRateRecord -> record.time
        is HeartRateVariabilityRmssdRecord -> record.time
        is OxygenSaturationRecord -> record.time
        is RespiratoryRateRecord -> record.time
        is BodyTemperatureRecord -> record.time
        is SleepSessionRecord -> record.endTime
        is ExerciseSessionRecord -> record.endTime
        else -> null
    }

    private fun sha256(value: String): String =
        MessageDigest.getInstance("SHA-256")
            .digest(value.toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it) }

    private data class Sextuple(
        val first: String,
        val second: Double,
        val third: String,
        val fourth: Instant,
        val fifth: Instant,
        val sixth: String
    )
}
