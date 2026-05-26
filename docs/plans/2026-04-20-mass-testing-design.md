# Mass Testing Plan Design — Progress Tracking System

**Date**: 2026-04-20  
**Status**: Approved  
**Environment**: Local Development (localhost:3000)  
**Pass Rate Target**: 100%

## Overview

Comprehensive automated testing for Sparr progress tracking system (frontend + backend), covering integration, calculations, caching, security, edge cases, and performance.

## Test Architecture

### Test Layers
1. **Integration Tests** — API endpoint contracts, response schemas, metric validation
2. **Calculation Tests** — Skill Level (0-100), Intensity Score (0-100), weighted scoring
3. **Cache Tests** — Hit/miss behavior, 1-hour TTL, pattern invalidation
4. **Security Tests** — Authorization (own/other/admin), input validation, cross-profile isolation
5. **Edge Case Tests** — Zero values, max streaks, timezone boundaries
6. **Load Tests** — 10, 50, 100 concurrent requests, latency percentiles
7. **Badge Integration** — Progress milestones trigger badge unlocks

### Automation Stack
- **Orchestration**: PowerShell (`test-comprehensive.ps1`)
- **API Testing**: Node.js helper utilities
- **Test Definitions**: JSON scenario files with assertions
- **Execution**: Parallel where possible, sequential for dependent tests

---

## Test Scenarios (10 Categories)

### 1. Frontend + Backend Integration
**Goal**: Verify UI displays progress data correctly from API

**Tests**:
- CalendarScreen renders ProgressHeaderCard
- Charts (LineChart, BarChart) populate with metrics
- Timeframe toggle (week/month/year/lifetime) triggers API calls
- MetricCardsRow displays all 10 metrics
- BadgeProgressWidget shows unlocked badges

**Assertions**: Response matches schema, UI elements render without errors

---

### 2. Skill Level Calculations
**Goal**: Validate 0-100 composite scoring with 4 components

**Tests**:
- New user (0 workouts, 0 techniques): skill_level = 0
- Beginner (10 techniques, 20 workouts, 10 interactions, 3-day streak): skill_level ≈ 20
- Intermediate (40 techniques, 100 workouts, 50 interactions, 15-day streak): skill_level ≈ 50
- Advanced (80+ techniques, 200+ workouts, 100+ interactions, 30-day streak): skill_level ≈ 90
- Component breakdown (30% techniques, 30% interactions, 20% workouts, 20% streak)
- Capping at 100 (values >100 don't overflow)

**Assertions**: Formula matches algorithm, edge cases handled

---

### 3. Intensity Score Calculations
**Goal**: Validate 0-100 composite with skill dependency

**Tests**:
- New user (no workouts): intensity_score = 0
- Simple workouts (30-min, 2 components, 50 reps): intensity_score ≈ 20
- Complex workouts (60-min, 8 components, 200 reps, high skill): intensity_score ≈ 80
- Dependency on skill_level (intensity uses computed skill_level)
- Capping at 100

**Assertions**: Formula matches algorithm, dependencies work

---

### 4. Cache Behavior
**Goal**: Verify 1-hour TTL cache, hit/miss logging, invalidation

**Tests**:
- First request: cache miss, slow response, `cache_miss` logged
- Second request (within 1 hour): cache hit, fast response (<10ms), `cache_hit` logged
- Create workout: triggers invalidation (`progress:{profileId}:*`)
- Subsequent request: cache miss (recomputed), slow response
- After 1 hour: cache expired, recomputed on next request

**Assertions**: Timing, log messages, hit rate >80%

---

### 5. Authorization & Security
**Goal**: Prevent unauthorized access

**Tests**:
- Own profile (token from profile A accessing profile A): 200 OK
- Other profile (token from profile A accessing profile B): 403 Forbidden
- No token: 401 Unauthorized
- Invalid token: 401 Unauthorized
- Admin token accessing other profile: 200 OK (admin override)

**Assertions**: HTTP status codes correct, no data leakage

---

### 6. Cross-Profile Isolation
**Goal**: Ensure profiles see only their own metrics

**Tests**:
- Create 5 test profiles with different data
- Profile A: 10 workouts, skill_level = 40
- Profile B: 20 workouts, skill_level = 60
- Verify Profile A sees own metrics (10 workouts, 40 skill)
- Verify Profile B sees own metrics (20 workouts, 60 skill)
- Profiles cannot see each other's data

**Assertions**: Metrics isolated by profileId

---

### 7. Metric Edge Cases
**Goal**: Handle boundary conditions

**Tests**:
- Zero workouts: metrics default to 0, no division errors
- Zero interactions: interactions_count = 0
- Max streak (30+ days): streak_days capped correctly
- Empty snapshots (no workouts on certain date): snapshot_date in array with 0 metrics
- Negative values: rejected or clamped to 0
- Decimal precision (total_hours): correctly computed from duration_seconds

**Assertions**: No runtime errors, values within expected ranges

---

### 8. Snapshot Date Accuracy & Timezone
**Goal**: Validate daily snapshots, date boundaries, timezone handling

**Tests**:
- Snapshots for each date in range (week = 7 days, month = 30 days, etc.)
- Snapshot dates sorted ascending
- Metrics aggregated correctly per date
- Timezone handling: local date or UTC (verify consistency)
- Date boundary: workout at 23:59 vs 00:01 next day

**Assertions**: Date sequences correct, no gaps, timezone consistent

---

### 9. Badge Unlock Triggers
**Goal**: Verify progress milestones trigger badge awards

**Tests**:
- Create workout completing technique → badge progress increments
- Reach badge unlock threshold → badge status changes to "unlocked"
- BadgeProgressWidget displays unlocked badges
- Notification shown on profile screen
- Badge appears in badge count

**Assertions**: Badge unlock logic triggered, state persisted

---

### 10. Performance Benchmarking
**Goal**: Meet performance targets

**Tests**:
- Single cached request: <50ms
- Single uncached request: <200ms
- p50 latency (10 concurrent): <30ms
- p95 latency (10 concurrent): <75ms
- p99 latency (100 concurrent): <100ms
- 100 concurrent requests: <1% error rate
- Memory stability: no leaks over 1000 requests
- Cache hit ratio: >80%

**Assertions**: All targets met

---

## Test Data Strategy

### Phase 1: Database Seeding
```
5 test profiles:
  - test_user_1: minimal data (2 workouts, 1 skill point)
  - test_user_2: moderate data (50 workouts, skill_level=40)
  - test_user_3: active user (100 workouts, skill_level=70)
  - test_user_4: max metrics (200+ workouts, skill_level=90+)
  - test_user_5: isolated user (no interactions)

Pre-made workouts per profile:
  - 10-20 workouts with varying:
    - Duration (15-90 minutes)
    - Components (1-10)
    - Volume (20-300 reps/sets)
    - Techniques (1-5 per workout)

Interactions & posts:
  - 5-50 interactions (likes/comments)
  - 1-10 posts per profile
  - Club memberships, friend connections
```

### Phase 2: API-Driven Generation
```
For each test scenario:
  - Create fresh workout via /api/auth/training/...
  - Add interactions via /api/auth/interactions/...
  - Create/update badges via gamification endpoints
  - Use snapshot endpoints to validate state
```

---

## Test Execution Flow

```
┌─ SETUP PHASE
│  ├─ Start backend (npm run dev)
│  ├─ Verify DB connectivity
│  ├─ Seed test profiles + data
│  └─ Generate JWTs for 5 profiles
│
├─ TEST EXECUTION (7 phases)
│  ├─ Integration Tests (verify schema, UI rendering)
│  ├─ Calculation Tests (skill level, intensity, scoring)
│  ├─ Cache Tests (hit/miss, TTL, invalidation)
│  ├─ Security Tests (auth, isolation, input validation)
│  ├─ Edge Case Tests (boundary conditions)
│  ├─ Load Tests (concurrent requests, latency)
│  └─ Badge Integration Tests (unlock triggers)
│
├─ RESULTS AGGREGATION
│  ├─ Console output (real-time)
│  ├─ Log file (detailed)
│  ├─ JSON summary (machine-readable)
│  └─ HTML/Markdown report (human-readable)
│
└─ CLEANUP PHASE
   ├─ Archive test data
   └─ Generate final report
```

---

## Deliverables

### Test Files
- `backend/tests/test-comprehensive.ps1` — Main orchestration script
- `backend/tests/test-data-seeder.js` — Data generation utility
- `backend/tests/test-scenarios.json` — Test case definitions
- `backend/tests/test-runner.js` — API test executor
- `backend/tests/performance-benchmarks.js` — Load testing utility

### Reports
- `backend/test-results/comprehensive-<timestamp>.log` — Detailed execution log
- `backend/test-results/comprehensive-<timestamp>.json` — Structured results
- `backend/test-results/SUMMARY.md` — Executive summary

---

## Success Criteria

✅ **100% Pass Rate** — All test categories passing  
✅ **Performance** — Cached <50ms, uncached <200ms, p99 <100ms  
✅ **Load** — 100 concurrent without errors  
✅ **Security** — 0 unauthorized access incidents  
✅ **Coverage** — All 10 scenario categories tested  
✅ **Documentation** — Clear pass/fail report with metrics  

---

## Timeline

- **Phase 1**: Test infrastructure + data seeder (2-3 hours)
- **Phase 2**: Integration + calculation tests (2-3 hours)
- **Phase 3**: Security + cache + edge case tests (2-3 hours)
- **Phase 4**: Load + performance tests (1-2 hours)
- **Phase 5**: Badge integration tests (1 hour)
- **Phase 6**: Report generation + analysis (30 minutes)

**Total**: ~10-12 hours estimated

---

## Notes

- All tests run locally (no staging dependency)
- Test data seeded to DB, not mocked (tests real queries)
- Parallel execution where safe (load tests, security tests independent)
- Sequential where dependent (e.g., cache tests require setup order)
- Cleanup removes test data to keep DB clean
- Reports archived for trend analysis across test runs
