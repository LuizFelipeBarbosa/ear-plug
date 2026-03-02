# Phase 1 Performance Summary

Baseline: `2026-03-02T05:00:37.179Z`  
After: `2026-03-02T05:08:00.406Z`  
Convex URL: `https://brilliant-cardinal-773.convex.cloud`  
Iterations: 20 (warmup 3)

| Query | Baseline p50 | After p50 | p50 delta | Baseline p95 | After p95 | p95 delta |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| events.listUpcoming | 253.80ms | 198.48ms | -21.80% | 602.99ms | 346.65ms | -42.51% |
| events.listByGenre | 113.74ms | 104.57ms | -8.06% | 190.11ms | 124.27ms | -34.63% |
| events.search | 112.23ms | 107.68ms | -4.05% | 190.04ms | 163.09ms | -14.18% |
| events.listNearby | 110.60ms | 108.12ms | -2.24% | 184.44ms | 193.93ms | +5.15% |
| venues.list | 103.79ms | 106.50ms | +2.61% | 116.33ms | 123.41ms | +6.09% |

## Notes

- p50 improved by at least 20% for 1/5 benchmarked queries.
- p95 improved by at least 20% for 2/5 benchmarked queries.
- Largest gains were on `events.listUpcoming` (p50 and p95) and `events.listByGenre` (p95).
- `events.listNearby` and `venues.list` regressed slightly at p95; monitor Convex insights/logs after rollout and consider tighter scan limits or geo-prefiltering follow-up work if these paths are latency-sensitive.
