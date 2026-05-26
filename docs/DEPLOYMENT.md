# Deployment Guide: Progress Tracking System

This guide covers deploying the new progress tracking system (Phases 1-7) to production.

## Pre-Deployment Checklist

### Code Review
- [ ] All 15 todos completed (Phases 1-7)
- [ ] npm run build successful
- [ ] No TypeScript errors (strict mode)
- [ ] All endpoints tested (see test-progress.ps1)
- [ ] Load test passed (100 concurrent <p99 100ms)
- [ ] No SQL injection vulnerabilities (all parameterized)
- [ ] Error messages safe (no schema exposure)

### Database
- [ ] Migration script tested locally: `2026-04-20_1845_add_skill_intensity_metrics.sql`
- [ ] Backup taken of production database
- [ ] Rollback plan documented (see below)

### Infrastructure
- [ ] Redis available (if using Redis cache)
- [ ] Environment variables set:
  - `REDIS_URL` (optional; uses in-memory if not set)
  - `CACHE_TTL_MS` (optional; defaults to 3600000)
- [ ] Error logging configured (logs should go to monitoring system)
- [ ] Monitoring/alerting set up for:
  - Metric computation time (alert if >5s)
  - Cache hit rate (alert if <60%)
  - Database query time (alert if >1s)

## Deployment Steps

### Step 1: Prepare Production Database

1. Stop backend processes
2. Backup database:
   ```bash
   pg_dump -U postgres -h prod-db.example.com -d sparr > sparr-backup-2026-04-20.sql
   ```
3. Apply migration:
   ```sql
   -- Run this on production database
   ALTER TABLE profile_progress_snapshots
   ADD COLUMN skill_level INTEGER DEFAULT 0 NOT NULL,
   ADD COLUMN intensity_score INTEGER DEFAULT 0 NOT NULL;
   
   CREATE INDEX idx_profile_progress_snapshots_skill 
   ON profile_progress_snapshots(profile_id, skill_level);
   ```
4. Verify schema:
   ```sql
   SELECT column_name, data_type FROM information_schema.columns
   WHERE table_name = 'profile_progress_snapshots'
   ORDER BY ordinal_position;
   ```

### Step 2: Deploy Code

1. Build Docker image (if using Docker):
   ```bash
   cd backend
   npm run build
   docker build -t sparr-backend:v2.0.0 .
   docker tag sparr-backend:v2.0.0 sparr-backend:latest
   docker push sparr-backend:v2.0.0
   ```

2. Update backend deployment:
   ```bash
   # If using Docker Compose
   docker-compose -f docker-compose.prod.yml up -d
   
   # Or if using Kubernetes
   kubectl set image deployment/sparr-backend \
     sparr-backend=sparr-backend:v2.0.0
   ```

3. Verify deployment:
   ```bash
   # Check backend is running
   curl -H "Authorization: Bearer TOKEN" \
     "https://api.sparr.com/api/auth/gamification/profiles/123/progress?range=week"
   ```

### Step 3: Recompute Metrics (Initial Population)

Run for all existing profiles to populate new metrics:

```bash
# Option A: Using API endpoint (if available)
for profile_id in $(psql -c "SELECT id_profiles FROM profiles;" | tail -n +3); do
  curl -X POST -H "Authorization: Bearer ADMIN_TOKEN" \
    "https://api.sparr.com/api/auth/gamification/profiles/$profile_id/progress/recalculate"
done

# Option B: Using database script
psql -c "
  SELECT profile_id FROM profile_progress_snapshots 
  GROUP BY profile_id
" | while read pid; do
  # Call metric computation for each profile
done
```

### Step 4: Monitor & Verify

1. Check error logs for any failures:
   ```bash
   tail -f /var/log/sparr/backend.log | grep "error\|ERROR"
   ```

2. Verify metrics are populating:
   ```sql
   SELECT COUNT(*), AVG(skill_level), AVG(intensity_score)
   FROM profile_progress_snapshots
   WHERE snapshot_date >= CURRENT_DATE - 1;
   ```

3. Test endpoints:
   - Own profile: should work
   - Other profile: should return 403
   - Invalid range: should return 400
   - Large load: monitor response times

4. Monitor cache performance:
   ```bash
   tail -f /var/log/sparr/backend.log | grep "cache_hit\|cache_miss"
   # Expect: 80%+ cache_hit ratio
   ```

## Post-Deployment

### 1. Performance Validation

**Target Metrics**:
- Single request: <50ms (with cache)
- p95 latency: <75ms
- p99 latency: <100ms
- Cache hit rate: 80%+

**Monitoring**:
```sql
-- Check daily metrics
SELECT 
  DATE(created_at) as date,
  COUNT(*) as requests,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000) as avg_ms
FROM api_requests
WHERE endpoint = '/progress'
GROUP BY DATE(created_at);
```

### 2. Error Rate Monitoring

**Alert if**:
- Error rate >1% (check logs)
- Metric computation >5s (watch for slow queries)
- Cache miss rate >40% (indicates cache churn)
- Database connections maxed (connection pool exhaustion)

### 3. Gradual Rollout (Optional)

Instead of full deployment, use feature flag or canary:

```typescript
// Feature flag example
if (process.env.ENABLE_NEW_PROGRESS_METRICS === 'true') {
  // Use new cached endpoint
  const progress = await getProfileProgressCached(profileId, range);
} else {
  // Use old endpoint
  const progress = await getProfileProgress(profileId, range);
}
```

## Rollback Plan

If deployment fails or performance degrades:

### Immediate Rollback

1. Stop new backend:
   ```bash
   docker stop sparr-backend
   ```

2. Revert to previous version:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --no-build
   # Or
   kubectl rollout undo deployment/sparr-backend
   ```

3. Verify old endpoints work:
   ```bash
   curl -H "Authorization: Bearer TOKEN" \
     "https://api.sparr.com/api/auth/gamification/profiles/123/progress"
   ```

### Database Rollback

If new columns cause issues, remove them:

```sql
ALTER TABLE profile_progress_snapshots
DROP COLUMN skill_level,
DROP COLUMN intensity_score;
```

Then restore from backup:
```bash
psql -U postgres -h prod-db.example.com -d sparr < sparr-backup-2026-04-20.sql
```

## Verification Checklist

After deployment (complete within 24 hours):

- [ ] All endpoints responding (200 OK)
- [ ] Authorization working (403 for other profiles)
- [ ] Input validation working (400 for invalid input)
- [ ] Cache working (cache_hit logged for repeated requests)
- [ ] Error handling working (errors logged, no schema exposure)
- [ ] Performance targets met (<50ms, p99 <100ms)
- [ ] Cache hit rate >80%
- [ ] No memory leaks (check memory usage stable over time)
- [ ] No database connection exhaustion
- [ ] No error rate spike

## Operational Notes

### Cache Management

**Clear cache** (if needed):
```bash
# Redis
redis-cli FLUSHDB

# In-memory (requires restart)
# Cache auto-clears on app restart
```

**Monitor cache**:
```bash
# Check Redis memory
redis-cli INFO memory

# Check cache hit rate
tail -f /var/log/sparr/backend.log | \
  grep -o "cache_hit\|cache_miss" | \
  sort | uniq -c
```

### Query Optimization

If metric computation is slow:

1. Check for missing indexes:
   ```sql
   CREATE INDEX idx_workout_completions_profile 
   ON workout_completions(profile_id, completed_at);
   ```

2. Profile slow queries:
   ```sql
   -- Enable query logging
   SET log_statement = 'all';
   SET log_duration = on;
   ```

3. Analyze query plans:
   ```sql
   EXPLAIN ANALYZE SELECT ... FROM profile_progress_snapshots ...;
   ```

## Support

If issues arise:

1. Check logs: `/var/log/sparr/backend.log`
2. Review errors: Look for error codes in API responses
3. Run diagnostics:
   ```bash
   .\backend\test-progress.ps1 -AllowMutation
   ```
4. Contact: backend team (with logs)

---

## Timeline

- **Code Complete**: Phase 7 ✅
- **Staging Test**: 1-2 days
- **Production Deploy**: 1 day
- **Monitoring**: 7 days (post-deploy)

Total: ~10 days from complete to fully validated.
