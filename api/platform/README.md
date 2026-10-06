# PT650 Platform Core

This directory is the boundary between the original single-instance training tracker and the
network-scale PT650 platform.

## Why this exists

The legacy API stores accounts and profile state as JSON files under `DATA_DIR`. That is a good
fit for a personal/self-hosted tracker and must remain supported, but it is not the storage model
for sponsored walking challenges, rewards, equipment intelligence, marketplaces or millions of
activity events.

All new network features therefore follow this rule:

> No PT650 network-scale feature may add globally shared activity, rewards, equipment intelligence
> or marketplace state to the legacy JSON files.

The network platform is designed around stateless API instances, PostgreSQL for durable relational
facts, object storage for short-lived evidence, an asynchronous queue, and read-optimised rollups.

## Hot path

```text
mobile/web
   |
   v
edge / API gateway
   |
   v
stateless activity ingest
   |---- idempotency guard
   |---- append activity event
   |---- append transactional outbox
   |
   +--> 202 Accepted

outbox workers
   |---- evidence verification / fraud checks
   |---- challenge progress
   |---- reward settlement
   |---- equipment usage rollups
   +---- notifications
```

Manufacturer dashboards never query raw activity rows. They read privacy-filtered daily rollups.

## Reliability rules

- Every mobile activity submission carries an idempotency key.
- The database duplicate guard and the activity event are committed in one transaction.
- Reward history is append-only. Corrections are reversal entries, never edits.
- A sponsored reward is reserved when a user enrolls. If funding is exhausted, enrollment is
  refused before the user performs the challenge.
- Challenge enrollment freezes the exact reward, verification method and disclosure the user saw.
- A reward is settled once. Retries use the same idempotency key.
- Heavy work leaves the request through a transactional outbox.
- Raw GPS routes and machine photos are evidence artifacts with short retention. Durable activity
  stores metrics and hashes, not a lifetime location trail.
- Equipment/manufacturer analytics expose aggregates only after a privacy threshold is met.

## Trust rules

PT650 never pays for praise. Equipment feedback reward quality is based on verification and
completeness, not whether the rating is positive or negative. Sponsored content and sponsored
research must be labelled. A sponsor cannot buy a higher Equipment Score or suppress legitimate
negative feedback.

For goal-based rewards the contract shown before enrollment is the contract settled afterwards:
goal, time window, verification method, reward, sponsor and any limit are all explicit.

## Scale shape

The first production target for the network platform is **10 million activity events/day** with a
burst design target of **5,000 ingest requests/second**. These are engineering targets, not claims
of measured capacity. Production release requires load tests against the actual managed database,
queue and object store.

The schema is ready for:

- monthly event partitions;
- horizontal stateless API replicas;
- connection pooling;
- async verification and reward workers;
- object-storage/CDN offload;
- manufacturer/gym dashboards on rollups rather than hot facts;
- independent retention of raw evidence;
- later stream/warehouse replication without changing the client event contract.

## Deployment components

Production should use managed components rather than one large VM:

| Concern | Production role |
| --- | --- |
| Edge | CDN/WAF, TLS, coarse rate limiting |
| API | Stateless Node containers/serverless workers |
| Database | Managed PostgreSQL with HA + connection pooler |
| Queue | Managed durable queue/stream |
| Cache | Redis-compatible cache for hot public/catalog reads and distributed rate limits |
| Evidence | S3-compatible object storage with lifecycle deletion |
| Analytics | Read replica/warehouse fed asynchronously |
| Observability | Metrics, traces, logs, alerting |
| Secrets | Managed secret store/KMS |

No vendor is hard-wired at this layer. The database schema and event contract stay portable.

## SLO gates before a wide commercial launch

A production environment must demonstrate, under realistic load:

- activity ingest p95 <= 250 ms for accepted requests;
- no duplicate reward settlement under retry storms;
- reward visible within 5 seconds of verified completion for instant challenges;
- no loss when workers restart after the API has accepted an event;
- graceful queue backlog handling;
- database failover and restore drills;
- evidence lifecycle deletion;
- privacy threshold enforcement on manufacturer analytics;
- sustained target traffic plus at least 3x short burst traffic.

Until those load/failure tests run against the chosen managed infrastructure, the architecture is
**scale-ready by design**, not yet capacity-certified.
