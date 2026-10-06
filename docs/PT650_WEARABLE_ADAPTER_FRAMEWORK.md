# PT650 Wearable Adapter Framework V1

PT650 uses one normalized Health & Endurance model for every wearable, health platform, OAuth service, and activity-file importer.

This framework is intentionally provider-neutral. Apple HealthKit, Android Health Connect, Huawei Health, Garmin, Strava, FIT, GPX, and TCX must plug into the same contracts rather than creating provider-specific data islands.

## Security boundary

- Browser/mobile clients authenticate with the PT650 Supabase user JWT.
- Browser/mobile clients never receive the Supabase service-role key.
- OAuth access, refresh, ID, and webhook secrets are stored only in Supabase Vault.
- Ordinary PT650 tables store only Vault secret UUID references and token expiry metadata.
- Decrypted tokens are available only to service-role RPCs used by trusted Edge/worker code.
- Native permission state is metadata, not proof that health data was read. A provider is shown as Connected only after the account has an actual source/connection.
- Raw GPS/location streams never live inline in Health stream JSON. Location data requires a protected artifact.

## Registry

`pt650.health_adapter_registry` is the authoritative adapter catalogue.

Each adapter declares:

- provider id and display name
- transport: first-party / native bridge / OAuth / file import / manual
- auth strategy
- sync strategy
- adapter version
- capabilities
- default dedupe priority
- backfill horizon
- whether a native shell is required
- whether OAuth credentials require the token vault
- lifecycle status: active / planned / disabled

Status is a product truth flag: Planned must never be presented as Connected.

## Connections

`pt650.health_connections` represents one user's link to one provider/account/device context.

It contains safe operational metadata only:

- provider
- source id
- connection mode
- external account key
- permission/scopes metadata
- active/pending/paused/revoked/error state
- optional priority override
- token expiry timestamp
- last/next sync timestamps
- last error code

It never contains an OAuth token.

## Token Vault

`pt650.health_connection_token_refs` stores only Vault UUID references.

Server-only RPCs:

- `pt650_wearable_store_token`
- `pt650_wearable_get_token`
- `pt650_wearable_revoke_tokens`

OAuth adapters must rotate the existing Vault secret instead of creating new plaintext token columns.

Never log a decrypted token, authorization header, provider refresh token, or webhook secret.

## Sync cursors

`pt650.health_sync_cursors` maintains one cursor per connection + logical stream.

Examples:

- activity cursor
- sleep cursor
- body/weight cursor
- heart-rate cursor
- provider-specific page token

A cursor is committed only after normalized data has been durably ingested.

## Durable sync jobs

`pt650.health_sync_jobs` is the asynchronous work queue.

Supported job classes:

- incremental
- backfill
- webhook
- manual
- reconcile

Properties:

- dedupe key prevents duplicate work
- `FOR UPDATE SKIP LOCKED` supports multiple workers
- 5-minute leases prevent double-processing
- expired leases are reclaimable
- retries use `not_before`
- max attempts lead to `dead`, never an infinite retry loop
- worker id must match the lease when completing a job

Provider adapters should enqueue work; they should not keep long provider HTTP requests inside a user-facing request when asynchronous execution is possible.

## Exact-provider dedupe

Existing `pt650.health_import_keys` remains the hard idempotency layer for a provider's own external record id.

Same provider + same external id must always resolve to the same PT650 target record.

## Cross-source dedupe

Cross-provider dedupe is deliberately non-destructive.

Tables:

- `health_dedupe_groups`
- `health_dedupe_members`

An adapter may submit a conservative SHA-256 fingerprint for records that are likely to represent the same real-world event.

PT650:

1. keeps every source record and provenance,
2. groups candidates,
3. chooses one Primary read-model candidate using effective source priority and quality,
4. hides non-primary candidates from normal summary/activity reads,
5. never deletes the underlying candidate merely because another source wins.

Adapters must not emit a cross-source fingerprint when identity is uncertain.

## Source priority

Default precedence is a dedupe/read-model preference, not a universal claim that one vendor is scientifically more accurate.

Initial defaults:

- PT650 Move: 1000
- PT650 Workout: 950
- Apple Health: 850
- Android Health Connect: 850
- Huawei Health: 840
- Garmin: 820
- Strava: 760
- FIT: 720
- TCX: 700
- GPX: 650
- Manual: 400

Users may override priority globally or by scope through `health_source_preferences`.

Examples of future scope keys:

- `activity`
- `observation`
- `metric:weight_kg`
- `metric:sleep_duration_min`
- `activity:run`

A disabled/deprioritized source remains preserved as provenance.

## Safe account-facing API

The authenticated Edge API exposes only safe metadata/control:

- `GET wearable-framework`
- `POST wearable-priority`

It does not expose:

- Vault secret ids
- decrypted tokens
- refresh tokens
- raw sync cursors
- worker job payloads
- service-role credentials

## Native adapter contract

Apple HealthKit, Android Health Connect, and Huawei Health run through the native app shells.

A native adapter must:

1. request only required permissions,
2. report permission/capability state,
3. read incremental data using the platform's native cursor/anchor mechanism where available,
4. normalize records into PT650 Health/Endurance envelopes,
5. preserve source/device provenance,
6. use provider-native identifiers for exact idempotency,
7. commit its PT650 cursor only after successful ingest,
8. avoid copying raw location tracks into ordinary Health JSON,
9. never claim a permission or measurement that the OS did not grant/return.

## OAuth adapter contract

Garmin and Strava must:

1. complete authorization server-side,
2. place OAuth secrets in Supabase Vault,
3. enqueue incremental/backfill sync work,
4. refresh tokens only inside trusted worker/Edge code,
5. rotate Vault secrets atomically,
6. map upstream rate limits into retry scheduling,
7. revoke local Vault material when the provider connection is disconnected.

## File adapter contract

FIT / GPX / TCX imports:

- treat the file hash + contained record id/time as the provider idempotency basis,
- parse in bounded chunks,
- normalize before writing canonical records,
- use protected artifacts for raw route data when retained,
- never trust embedded filenames/metadata as executable paths.

## Implementation order

1. Wearable Adapter Framework V1 — this document.
2. Apple HealthKit Adapter V1.
3. Android Health Connect Adapter V1.
4. Huawei Health Adapter V1.
5. Garmin OAuth Adapter.
6. Strava OAuth Adapter.
7. FIT / GPX / TCX import adapters.
8. Reconciliation tuning and provider-specific source priorities using real production evidence.
