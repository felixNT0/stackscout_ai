# Load Testing

StackScout AI includes a [k6](https://k6.io) load test script for validating performance before launch.

## Setup

```bash
# Install k6 (macOS)
brew install k6

# Or see https://k6.io/docs/get-started/installation/
```

## Run

```bash
# Against local dev server (start `pnpm dev` first)
k6 run loadtest/k6-script.js

# Against staging/production
BASE_URL=https://your-app.vercel.app k6 run loadtest/k6-script.js

# Heavier test: 50 virtual users for 2 minutes
k6 run --vus 50 --duration 2m loadtest/k6-script.js
```

## What it tests

- Public page load times (landing, features, pricing, auth pages)
- `/api/health` endpoint availability
- Error rate and p95 latency thresholds

## Thresholds

| Metric | Target |
|--------|--------|
| p95 response time | < 2s |
| Error rate | < 5% |

## Notes

- Authenticated endpoints are not covered (they need session cookies). Extend the script with a login flow if needed.
- Job search hits external provider APIs — those have their own rate limits and are cached via `src/lib/cache/job-cache.ts`.
