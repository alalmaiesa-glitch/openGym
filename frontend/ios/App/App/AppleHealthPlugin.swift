import Foundation
import Capacitor
import HealthKit
import CryptoKit

@objc(AppleHealthPlugin)
public class AppleHealthPlugin: CAPPlugin {
    private let healthStore = HKHealthStore()
    private let defaults = UserDefaults.standard
    private let installationKey = "pt650.appleHealth.installationId"
    private let anchorPrefix = "pt650.appleHealth.anchor."
    private let formatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    private struct QuerySpec {
        let key: String
        let type: HKSampleType
        let objectKind: String
    }

    private struct Batch {
        let observations: [[String: Any]]
        let activities: [[String: Any]]
        let deletions: [[String: Any]]
        let nextAnchor: String?
        let highWatermark: Date?
    }

    private var specs: [QuerySpec] {
        var out: [QuerySpec] = []
        func quantity(_ id: HKQuantityTypeIdentifier, _ key: String) {
            if let type = HKObjectType.quantityType(forIdentifier: id) {
                out.append(QuerySpec(key: key, type: type, objectKind: "observation"))
            }
        }
        quantity(.bodyMass, "body_mass")
        quantity(.bodyFatPercentage, "body_fat")
        quantity(.restingHeartRate, "resting_hr")
        quantity(.heartRateVariabilitySDNN, "hrv_sdnn")
        quantity(.oxygenSaturation, "spo2")
        quantity(.respiratoryRate, "respiratory_rate")
        quantity(.bodyTemperature, "body_temperature")
        if let sleep = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) {
            out.append(QuerySpec(key: "sleep", type: sleep, objectKind: "observation"))
        }
        out.append(QuerySpec(key: "workouts", type: HKObjectType.workoutType(), objectKind: "activity"))
        return out
    }

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve([
            "available": HKHealthStore.isHealthDataAvailable(),
            "platform": "ios",
            "adapterVersion": 1
        ])
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("HealthKit is unavailable on this device", "healthkit-unavailable")
            return
        }
        let readTypes = Set(specs.map { $0.type as HKObjectType })
        healthStore.requestAuthorization(toShare: [], read: readTypes) { success, error in
            if let error = error {
                call.reject(error.localizedDescription, "healthkit-authorization-error")
                return
            }
            // Completion of the HealthKit sheet is not proof that read access was granted.
            call.resolve([
                "authorizationRequested": true,
                "requestCompleted": success,
                "readAuthorizationOpaque": true
            ])
        }
    }

    @objc func readChanges(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("HealthKit is unavailable on this device", "healthkit-unavailable")
            return
        }
        let requested = call.getInt("limit") ?? 100
        let limit = max(1, min(requested, 100))
        let installationId = self.installationId()

        let group = DispatchGroup()
        let lock = NSLock()
        var observations: [[String: Any]] = []
        var activities: [[String: Any]] = []
        var deletions: [[String: Any]] = []
        var nextAnchors: [String: String] = [:]
        var errors: [Error] = []
        var highWatermark: Date?

        for spec in specs {
            group.enter()
            read(spec: spec, limit: limit) { result in
                lock.lock()
                defer {
                    lock.unlock()
                    group.leave()
                }
                switch result {
                case .failure(let error):
                    errors.append(error)
                case .success(let batch):
                    observations.append(contentsOf: batch.observations)
                    activities.append(contentsOf: batch.activities)
                    deletions.append(contentsOf: batch.deletions)
                    if let token = batch.nextAnchor { nextAnchors[spec.key] = token }
                    if let date = batch.highWatermark,
                       highWatermark == nil || date > highWatermark! {
                        highWatermark = date
                    }
                }
            }
        }

        group.notify(queue: .global(qos: .userInitiated)) {
            if let error = errors.first {
                call.reject(error.localizedDescription, "healthkit-query-error")
                return
            }
            var result: [String: Any] = [
                "adapterVersion": 1,
                "installationId": installationId,
                "observations": observations,
                "activities": activities,
                "deletions": deletions,
                "nextAnchors": nextAnchors,
                "queriedAt": self.formatter.string(from: Date())
            ]
            if let highWatermark = highWatermark {
                result["highWatermark"] = self.formatter.string(from: highWatermark)
            }
            call.resolve(result)
        }
    }

    @objc func commitAnchors(_ call: CAPPluginCall) {
        guard let anchors = call.getObject("anchors") as? [String: String] else {
            call.reject("anchors are required", "invalid-anchors")
            return
        }
        let allowed = Set(specs.map { $0.key })
        for (key, token) in anchors {
            guard allowed.contains(key), decodeAnchor(token) != nil else {
                call.reject("invalid HealthKit anchor", "invalid-anchor")
                return
            }
        }
        for (key, token) in anchors {
            defaults.set(token, forKey: anchorPrefix + key)
        }
        call.resolve(["committed": true, "count": anchors.count])
    }

    private func read(spec: QuerySpec, limit: Int, completion: @escaping (Result<Batch, Error>) -> Void) {
        let anchor = committedAnchor(for: spec.key)
        let predicate: NSPredicate?
        if anchor == nil {
            predicate = HKQuery.predicateForSamples(
                withStart: Calendar.current.date(byAdding: .day, value: -90, to: Date()),
                end: nil,
                options: .strictStartDate
            )
        } else {
            predicate = nil
        }

        let query = HKAnchoredObjectQuery(
            type: spec.type,
            predicate: predicate,
            anchor: anchor,
            limit: limit
        ) { [weak self] _, samples, deletedObjects, newAnchor, error in
            guard let self = self else { return }
            if let error = error {
                completion(.failure(error))
                return
            }

            let sampleList = samples ?? []
            var observations: [[String: Any]] = []
            var activities: [[String: Any]] = []
            for sample in sampleList {
                if spec.objectKind == "activity", let workout = sample as? HKWorkout {
                    activities.append(self.activity(from: workout))
                } else if let observation = self.observation(from: sample, specKey: spec.key) {
                    observations.append(observation)
                }
            }

            let deletions = (deletedObjects ?? []).map {
                ["objectKind": spec.objectKind, "externalKey": $0.uuid.uuidString.lowercased()]
            }
            let high = sampleList.map(\.endDate).max()
            completion(.success(Batch(
                observations: observations,
                activities: activities,
                deletions: deletions,
                nextAnchor: newAnchor.flatMap { self.encodeAnchor($0) },
                highWatermark: high
            )))
        }
        healthStore.execute(query)
    }

    private func observation(from sample: HKSample, specKey: String) -> [String: Any]? {
        var metric = ""
        var value: Double = 0
        var unit = ""
        var aggregation = "sample"

        if let q = sample as? HKQuantitySample {
            switch specKey {
            case "body_mass":
                metric = "weight_kg"
                value = q.quantity.doubleValue(for: HKUnit.gramUnit(with: .kilo))
                unit = "kg"
            case "body_fat":
                metric = "body_fat_pct"
                value = q.quantity.doubleValue(for: HKUnit.percent()) * 100.0
                unit = "%"
            case "resting_hr":
                metric = "resting_hr_bpm"
                value = q.quantity.doubleValue(for: HKUnit.count().unitDivided(by: .minute()))
                unit = "bpm"
            case "hrv_sdnn":
                metric = "hrv_sdnn_ms"
                value = q.quantity.doubleValue(for: HKUnit.secondUnit(with: .milli))
                unit = "ms"
            case "spo2":
                metric = "spo2_pct"
                value = q.quantity.doubleValue(for: HKUnit.percent()) * 100.0
                unit = "%"
            case "respiratory_rate":
                metric = "respiratory_rate"
                value = q.quantity.doubleValue(for: HKUnit.count().unitDivided(by: .minute()))
                unit = "/min"
            case "body_temperature":
                metric = "body_temp_c"
                value = q.quantity.doubleValue(for: HKUnit.degreeCelsius())
                unit = "°C"
            default:
                return nil
            }
        } else if let c = sample as? HKCategorySample, specKey == "sleep" {
            if c.value == HKCategoryValueSleepAnalysis.inBed.rawValue ||
               c.value == HKCategoryValueSleepAnalysis.awake.rawValue {
                return nil
            }
            metric = "sleep_duration_min"
            value = c.endDate.timeIntervalSince(c.startDate) / 60.0
            unit = "min"
            aggregation = "session"
        } else {
            return nil
        }

        let fingerprint = sha256([
            metric,
            formatter.string(from: sample.startDate),
            formatter.string(from: sample.endDate),
            String(format: "%.6f", value),
            unit
        ].joined(separator: "|"))

        return [
            "externalKey": sample.uuid.uuidString.lowercased(),
            "metric": metric,
            "valueNum": value,
            "unit": unit,
            "startedAt": formatter.string(from: sample.startDate),
            "endedAt": formatter.string(from: sample.endDate),
            "aggregation": aggregation,
            "confidence": 0.95,
            "quality": 0.95,
            "scopeKey": "metric:" + metric,
            "dedupeFingerprint": fingerprint,
            "metadata": provenance(for: sample)
        ]
    }

    private func activity(from workout: HKWorkout) -> [String: Any] {
        var out: [String: Any] = [
            "externalKey": workout.uuid.uuidString.lowercased(),
            "activityType": activityType(workout.workoutActivityType),
            "title": "Apple Health Workout",
            "startedAt": formatter.string(from: workout.startDate),
            "endedAt": formatter.string(from: workout.endDate),
            "durationSec": max(0, Int(workout.duration.rounded())),
            "verification": "source_attested",
            "confidence": 0.95,
            "quality": 0.95,
            "metadata": provenance(for: workout)
        ]
        if let distance = workout.totalDistance {
            out["distanceM"] = distance.doubleValue(for: .meter())
        }
        if let energy = workout.totalEnergyBurned {
            out["energyKcal"] = energy.doubleValue(for: .kilocalorie())
        }

        let fingerprint = sha256([
            out["activityType"] as? String ?? "other",
            formatter.string(from: workout.startDate),
            formatter.string(from: workout.endDate),
            String(format: "%.1f", (out["distanceM"] as? Double) ?? -1)
        ].joined(separator: "|"))
        out["dedupeFingerprint"] = fingerprint
        out["scopeKey"] = "activity:" + (out["activityType"] as? String ?? "other")
        return out
    }

    private func provenance(for sample: HKSample) -> [String: Any] {
        let source = sample.sourceRevision
        var meta: [String: Any] = [
            "healthKitType": sample.sampleType.identifier,
            "sourceName": source.source.name,
            "sourceBundleId": source.source.bundleIdentifier
        ]
        if let version = source.version { meta["sourceVersion"] = version }
        if let product = source.productType { meta["sourceProductType"] = product }
        let os = source.operatingSystemVersion
        meta["sourceOS"] = "\(os.majorVersion).\(os.minorVersion).\(os.patchVersion)"
        if let device = sample.device {
            if let x = device.manufacturer { meta["deviceManufacturer"] = x }
            if let x = device.model { meta["deviceModel"] = x }
            if let x = device.name { meta["deviceName"] = x }
            if let x = device.hardwareVersion { meta["deviceHardwareVersion"] = x }
            if let x = device.softwareVersion { meta["deviceSoftwareVersion"] = x }
        }
        return meta
    }

    private func activityType(_ type: HKWorkoutActivityType) -> String {
        switch type {
        case .running: return "run"
        case .walking: return "walk"
        case .cycling: return "cycling"
        case .swimming: return "swimming"
        case .hiking: return "hiking"
        case .rowing: return "rowing"
        case .elliptical: return "elliptical"
        case .traditionalStrengthTraining: return "strength_training"
        case .functionalStrengthTraining: return "functional_strength"
        case .highIntensityIntervalTraining: return "hiit"
        case .yoga: return "yoga"
        case .pilates: return "pilates"
        default: return "other"
        }
    }

    private func installationId() -> String {
        if let existing = defaults.string(forKey: installationKey), !existing.isEmpty {
            return existing
        }
        let value = UUID().uuidString.lowercased()
        defaults.set(value, forKey: installationKey)
        return value
    }

    private func committedAnchor(for key: String) -> HKQueryAnchor? {
        guard let token = defaults.string(forKey: anchorPrefix + key) else { return nil }
        return decodeAnchor(token)
    }

    private func encodeAnchor(_ anchor: HKQueryAnchor) -> String? {
        guard let data = try? NSKeyedArchiver.archivedData(
            withRootObject: anchor,
            requiringSecureCoding: true
        ) else { return nil }
        return data.base64EncodedString()
    }

    private func decodeAnchor(_ token: String) -> HKQueryAnchor? {
        guard let data = Data(base64Encoded: token) else { return nil }
        return try? NSKeyedUnarchiver.unarchivedObject(ofClass: HKQueryAnchor.self, from: data)
    }

    private func sha256(_ value: String) -> String {
        SHA256.hash(data: Data(value.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}
