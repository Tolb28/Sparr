# Re-run Test Results

Generated: 2026-05-14T09:41:33.899+02:00

---

# Test Execution Summary (previous run)

**Date**: 2026-04-29T14:31:40.181Z
**Status**: ❌ FAILURES (12 failed)

## Results by Category
- integration: 4/4 ✅
- skill-level: 1/5 ❌
- intensity-score: 3/5 ❌
- caching: 0/4 ❌
- security: 7/7 ✅
- isolation: 0/3 ❌
- edge-cases: 0/7 ✅
- badge-integration: 2/2 ✅

## Performance Metrics
- p50 (10 concurrent): 245ms
- p95 (50 concurrent): 231ms
- p99 (100 concurrent): 436ms
- Cache hit rate: 0%

## Issues
Failures detected. Review JSON report.

---

# Recent backend log (latest run)

> backend@1.0.0 dev
> ts-node-dev --respawn --transpile-only src/index.ts

[INFO] 09:42:18 ts-node-dev ver. 2.0.0 (using ts-node ver. 10.9.2, typescript ver. 5.9.3)
[dotenv@17.2.3] injecting env (10) from .env -- tip: ⚙️  write to custom object with { processEnv: myObject }
Cache backend { backend: 'memory', timestamp: '2026-05-14T07:42:20.358Z' }
[dotenv@17.2.3] injecting env (0) from .env -- tip: 🗂️ backup and recover secrets: https://dotenvx.com/ops
Server running on port 4000
✅ Database connected

---

Notes:
- The comprehensive test script ran and started the backend; no SUMMARY.md was generated this run. Scenario/benchmark JSON outputs (if any) are in test-results as timestamped files or in the load subdirectory.
- To reproduce detailed scenario reports, inspect files: backend-*.log, backend-*.err.log, and test-results\load\LOAD_SUMMARY*.md
