# Instant Live Load Testing

## Preconditions
- Backend running on `http://localhost:4000`
- A live session exists (`sessionId`)
- Teacher access token (for approval storm)

## 1) Join Request Throughput
Simulate `N` students requesting join in parallel.

```bash
cd /Users/thekalyugh/Desktop/Projects/pcm-v2/apps/backend
npm run load:join -- --sessionId <SESSION_ID> --count 100 --concurrency 20
```

Optional env-based run:

```bash
LIVE_SESSION_ID=<SESSION_ID> LOAD_COUNT=100 LOAD_CONCURRENCY=20 npm run load:join
```

Output includes:
- success/fail counts
- avg, P50, P95, P99 latency
- throughput req/s

## 2) Approval Storm
Approves all current pending requests concurrently.

```bash
cd /Users/thekalyugh/Desktop/Projects/pcm-v2/apps/backend
npm run load:approve -- --sessionId <SESSION_ID> --token <TEACHER_ACCESS_TOKEN> --concurrency 15
```

Optional env-based run:

```bash
LIVE_SESSION_ID=<SESSION_ID> TEACHER_ACCESS_TOKEN=<JWT> LOAD_CONCURRENCY=15 npm run load:approve
```

Output includes:
- approve success/fail counts
- avg, P50, P95, P99 latency
- approvals/s

## 3) Manual UI/LiveKit Test
- Open one teacher tab: `/live/<SESSION_ID>?mode=teacher`
- Open 20+ student tabs: `/live/<SESSION_ID>`
- Validate:
  - teacher video remains stable
  - approvals remain responsive
  - stage transitions are smooth
  - memory/CPU do not grow uncontrollably

## 4) Basic System Monitoring
In terminal while running tests:

```bash
top
```

Watch:
- backend CPU/memory
- Docker LiveKit CPU/memory
- network usage spikes

