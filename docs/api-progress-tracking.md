# Progress Tracking API

## Endpoints

### GET /api/auth/gamification/profiles/:profileId/progress?range=week

Fetch progress metrics and historical snapshots for a profile.

#### Parameters

| Parameter | Type | Required | Default | Valid Values |
|-----------|------|----------|---------|--------------|
| profileId | number | yes | — | positive integer |
| range | string | no | week | week, month, year, lifetime |

#### Authentication
- Required: Bearer token (JWT)
- Header: `Authorization: Bearer <token>`
- User can only access own profile (unless admin)

#### Request Examples

```bash
# Fetch this week's progress
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/auth/gamification/profiles/123/progress?range=week"

# Fetch this month's progress
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/auth/gamification/profiles/123/progress?range=month"

# Fetch this year's progress
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/auth/gamification/profiles/123/progress?range=year"

# Fetch all-time progress
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/auth/gamification/profiles/123/progress?range=lifetime"
```

#### Response Schema

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
    },
    {
      "snapshot_date": "2026-04-15",
      "workouts_completed": 1,
      "club_sessions": 1,
      "streak_days": 2,
      "interactions_count": 3,
      "skill_level": 15,
      "intensity_score": 30,
      "score": 15
    }
  ]
}
```

#### Metrics Explained

| Metric | Type | Range | Description |
|--------|------|-------|-------------|
| workouts_completed | integer | 0-∞ | Total workouts completed |
| total_hours | number | 0-∞ | Total training hours (computed from duration_seconds) |
| streak_days | integer | 0-∞ | Current consecutive days trained |
| club_sessions | integer | 0-∞ | Club training sessions attended |
| interactions_count | integer | 0-∞ | Total likes/comments made |
| posts_created | integer | 0-∞ | Posts created by user |
| friends_count | integer | 0-∞ | Accepted friend connections |
| clubs_joined | integer | 0-∞ | Clubs joined |
| skill_level | integer | 0-100 | Technical proficiency (composite) |
| intensity_score | integer | 0-100 | Workout difficulty/intensity (composite) |
| score | integer | 0-∞ | Gamification score (weighted sum) |

#### Skill Level (0-100)

Composite score measuring technical boxing proficiency.

**Components**:
- 30% Unique techniques completed (max 50 techniques)
- 30% Community engagement (max 100 interactions)
- 20% Practice frequency (max 200 workouts)
- 20% Consistency bonus (max 30-day streak)

**Examples**:
- New user (0 workouts, 0 techniques) → skill_level = 0
- Intermediate (50 techniques, 100 workouts, 50 interactions, 10-day streak) → skill_level ≈ 50
- Advanced (100+ techniques, 300+ workouts, 100+ interactions, 30-day streak) → skill_level ≈ 90-100

#### Intensity Score (0-100)

Composite score measuring typical workout difficulty.

**Components**:
- 25% Average workout duration (capped at 60 minutes)
- 25% Workout complexity (capped at 10 components per session)
- 25% Rep/set volume (capped at 1000 total volume)
- 25% User skill level (0-100)

**Examples**:
- New user, no workouts → intensity_score = 0
- Beginner with short, simple workouts → intensity_score 10-30
- Intermediate with balanced workouts → intensity_score 40-60
- Advanced with long, complex workouts + high skill → intensity_score 80-100

#### Snapshot Array

Each snapshot represents daily aggregated metrics for a single date.

| Field | Type | Description |
|-------|------|-------------|
| snapshot_date | date (YYYY-MM-DD) | Date of the snapshot |
| workouts_completed | integer | Workouts that day |
| club_sessions | integer | Club sessions that day |
| streak_days | integer | Consecutive days trained (as of that date) |
| interactions_count | integer | Interactions that day |
| skill_level | integer | Skill level as of that date (0-100) |
| intensity_score | integer | Intensity as of that date (0-100) |
| score | integer | Daily gamification points |

#### Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | All metrics fetched |
| 400 | Bad Request | Invalid profileId or range |
| 401 | Unauthorized | Missing auth token |
| 403 | Forbidden | Accessing another user's profile |
| 500 | Server Error | Database error, metric computation failed |

#### Error Response

```json
{
  "statusCode": 400,
  "message": "Invalid profile ID: must be positive integer",
  "code": "INVALID_INPUT",
  "timestamp": "2026-04-20T19:00:00.000Z"
}
```

#### Caching Behavior

- Response cached for 1 hour (3600000 ms)
- Cache key: `progress:{profileId}:{range}`
- Cache invalidated on:
  - Workout completion (logs `cache_miss` on next fetch)
  - Manual cache clear (admin only)
- Cache hits (<5ms) logged as `cache_hit`

#### Rate Limiting

No rate limiting implemented yet. Future: 60 requests per minute per profile.

---

### Other Endpoints

#### GET /api/auth/gamification/badges

Fetch all available badges with progress.

#### GET /api/auth/gamification/profiles/:profileId/badges

Fetch badges earned by a profile.

#### POST /api/auth/gamification/profiles/:profileId/progress/recalculate

Force recalculation of metrics for a profile (admin only).

---

## Implementation Details

### Database Schema

#### profile_progress_snapshots

Daily aggregated metrics for each profile.

```sql
CREATE TABLE profile_progress_snapshots (
  id_profile_progress_snapshots BIGINT PRIMARY KEY,
  profile_id BIGINT NOT NULL,
  snapshot_date DATE NOT NULL,
  workouts_completed INTEGER DEFAULT 0,
  club_sessions INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  interactions_count INTEGER DEFAULT 0,
  skill_level INTEGER DEFAULT 0,
  intensity_score INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (profile_id, snapshot_date)
);
```

### Computation

Metrics are computed using a pluggable system:

```typescript
// Each metric is self-contained
interface MetricDefinition {
  key: string;
  name: string;
  compute(profileId: number, context?: MetricComputationContext): Promise<number>;
  validate(value: number): boolean;
}

// All metrics registered in METRICS array
export const METRICS: MetricDefinition[] = [
  WorkoutsCompletedMetric,
  TotalHoursMetric,
  StreakDaysMetric,
  ClubSessionsMetric,
  InteractionsCountMetric,
  SkillLevelMetric,
  IntensityScoreMetric,
];
```

### Caching

Implemented with Redis (if available) or in-memory fallback:

```typescript
// Redis
if (process.env.REDIS_URL) {
  cacheService = new RedisCacheService(redisClient);
} else {
  cacheService = new MemoryCacheService();
}

// Usage
const progress = await getProfileProgressCached(profileId, range);
```

### Security

1. **Input Validation**
   - profileId must be positive integer
   - range must be one of (week, month, year, lifetime)
   - Errors returned as 400 Bad Request

2. **Authorization**
   - User can only access own profile
   - Admin flag (from JWT) allows access to any profile
   - Errors returned as 401 Unauthorized or 403 Forbidden

3. **Error Handling**
   - Errors logged with context (profileId, metric, endpoint)
   - No sensitive data (tokens, emails) logged
   - Client receives safe error messages

---

## Testing

Run integration tests: `.\backend\test-progress.ps1`

See `docs/phase-6-testing.md` for detailed test procedure.

---

## Migration Notes

To deploy on production:

1. Run migration to add skill_level + intensity_score columns
2. Verify Redis connection (if using)
3. Recompute metrics for all users
4. Monitor performance (target: <50ms)

See deployment guide below.
