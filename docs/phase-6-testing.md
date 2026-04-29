# Phase 6: Integration & Testing (Progress Endpoint)

This document captures how to verify the Sparr backend progress endpoint and where test results are logged.

## Prerequisites
- Backend running (`cd backend && npm run dev`)
- Redis available (cache checks rely on it)
- Valid JWTs for:
  - `SPARR_TOKEN` (own profile)
  - `SPARR_OTHER_TOKEN` (different user)
  - `SPARR_ADMIN_TOKEN` (admin, optional)
- A valid profile ID (`SPARR_PROFILE_ID`)

## Test Script (PowerShell)
Run the script from the repository root:

```powershell
.\backend\test-progress.ps1 `
  -ProfileId $env:SPARR_PROFILE_ID `
  -Token $env:SPARR_TOKEN `
  -OtherToken $env:SPARR_OTHER_TOKEN `
  -AdminToken $env:SPARR_ADMIN_TOKEN `
  -AllowMutation
```

Logs are written to `backend/test-results/progress-tests-<timestamp>.log`.

## Expected Response Shape
```json
{
  "range": "week",
  "metrics": {
    "workouts_completed": 5,
    "total_hours": 3.5,
    "streak_days": 7,
    "club_sessions": 2,
    "interactions_count": 10,
    "posts_created": 1,
    "friends_count": 3,
    "clubs_joined": 1,
    "skill_level": 45,
    "intensity_score": 62,
    "score": 103
  },
  "snapshots": [
    {
      "snapshot_date": "2026-04-14",
      "workouts_completed": 1,
      "club_sessions": 0,
      "streak_days": 1,
      "interactions_count": 2,
      "skill_level": 10,
      "intensity_score": 25,
      "score": 10
    }
  ]
}
```

## Coverage Checklist
- Timeframes: week, month, year, lifetime (plus weekly/monthly aliases)
- Authorization: own/other/admin/no token/invalid token
- Validation: profileId + range validation
- Metrics: all 7 metrics + computed totals present
- Snapshots: includes skill_level + intensity_score
- Caching: cache hit/miss (check server logs for `cache_hit`/`cache_miss`)
- Load: p95/p99 response times (script captures)

## Results
Fill in after running the script:

| Date | Environment | Log Path | Pass | Fail | Warn |
|------|-------------|----------|------|------|------|
|      |             |          |      |      |      |

## Notes
- Cache invalidation test mutates data; omit `-AllowMutation` to skip.
- If snapshot counts are lower than the range length, confirm daily recalculations are occurring.
