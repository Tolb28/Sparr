#!/usr/bin/env node

require('ts-node/register/transpile-only');

const { pool } = require('../src/config/db');
const { recalculateProfileGamification } = require('../src/services/gamificationService');

const DEFAULT_TARGET_WORKOUTS = 12;
const DEFAULT_HISTORY_DAYS = 14;

function parseArgs() {
  const args = process.argv.slice(2);
  const includeClubProfiles = args.includes('--include-club-profiles');

  const targetIndex = args.findIndex((arg) => arg === '--target-workouts');
  const historyIndex = args.findIndex((arg) => arg === '--history-days');

  const targetWorkouts =
    targetIndex >= 0 && Number.isFinite(Number(args[targetIndex + 1]))
      ? Math.max(1, Math.floor(Number(args[targetIndex + 1])))
      : DEFAULT_TARGET_WORKOUTS;

  const historyDays =
    historyIndex >= 0 && Number.isFinite(Number(args[historyIndex + 1]))
      ? Math.max(1, Math.floor(Number(args[historyIndex + 1])))
      : DEFAULT_HISTORY_DAYS;

  return {
    includeClubProfiles,
    targetWorkouts,
    historyDays,
  };
}

async function ensureTableExists(tableName) {
  const result = await pool.query(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name = $1
     ) AS exists`,
    [tableName]
  );
  return Boolean(result.rows[0]?.exists);
}

async function ensureColumnExists(tableName, columnName) {
  const result = await pool.query(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = $1
         AND column_name = $2
     ) AS exists`,
    [tableName, columnName]
  );
  return Boolean(result.rows[0]?.exists);
}

async function verifyProgressSetup() {
  const requiredTables = [
    'profiles',
    'workout_completions',
    'profile_progress_snapshots',
    'badges',
    'badge_rules',
    'profiles_badges',
  ];

  const requiredColumns = [
    ['profile_progress_snapshots', 'profile_id'],
    ['profile_progress_snapshots', 'snapshot_date'],
    ['profile_progress_snapshots', 'workouts_completed'],
    ['profile_progress_snapshots', 'club_sessions'],
    ['profile_progress_snapshots', 'streak_days'],
    ['profile_progress_snapshots', 'interactions_count'],
    ['profile_progress_snapshots', 'skill_level'],
    ['profile_progress_snapshots', 'intensity_score'],
    ['profile_progress_snapshots', 'score'],
    ['workout_completions', 'profile_id'],
    ['workout_completions', 'completed_at'],
    ['workout_completions', 'duration_seconds'],
  ];

  const missingTables = [];
  for (const table of requiredTables) {
    // eslint-disable-next-line no-await-in-loop
    if (!(await ensureTableExists(table))) {
      missingTables.push(table);
    }
  }

  const missingColumns = [];
  for (const [table, column] of requiredColumns) {
    // eslint-disable-next-line no-await-in-loop
    if (!(await ensureColumnExists(table, column))) {
      missingColumns.push(`${table}.${column}`);
    }
  }

  const uniqueSnapshotConstraint = await pool.query(
    `SELECT EXISTS (
       SELECT 1
       FROM pg_indexes
       WHERE schemaname = 'public'
         AND tablename = 'profile_progress_snapshots'
         AND indexdef ILIKE '%(profile_id, snapshot_date)%'
         AND indexdef ILIKE '%UNIQUE%'
     ) AS exists`
  );

  return {
    ok:
      missingTables.length === 0 &&
      missingColumns.length === 0 &&
      Boolean(uniqueSnapshotConstraint.rows[0]?.exists),
    missingTables,
    missingColumns,
    hasUniqueSnapshotConstraint: Boolean(uniqueSnapshotConstraint.rows[0]?.exists),
  };
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function completionDateForIndex(index) {
  const dayOffset = (index % 28) + 1;
  const hourOffset = randomInt(0, 20);
  const minuteOffset = randomInt(0, 59);
  const date = new Date();
  date.setDate(date.getDate() - dayOffset);
  date.setHours(hourOffset, minuteOffset, 0, 0);
  return date;
}

function scaledMetric(value, numerator, denominator) {
  return Math.max(0, Math.round((Number(value) * numerator) / denominator));
}

async function seedForProfile(profileId, targetWorkouts, historyDays) {
  const existingCompletions = await pool.query(
    'SELECT COUNT(*)::int AS count FROM workout_completions WHERE profile_id = $1',
    [profileId]
  );
  const currentCount = Number(existingCompletions.rows[0]?.count ?? 0);
  const workoutsToInsert = Math.max(0, targetWorkouts - currentCount);

  for (let index = 0; index < workoutsToInsert; index += 1) {
    const completedAt = completionDateForIndex(index);
    const durationSeconds = randomInt(15, 75) * 60;
    // Keep training_id null so this seed works even if no training templates exist.
    // Recalculation still works and produces valid progress snapshots.
    // eslint-disable-next-line no-await-in-loop
    await pool.query(
      `INSERT INTO workout_completions (profile_id, training_id, completed_at, duration_seconds)
       VALUES ($1, NULL, $2, $3)`,
      [profileId, completedAt, durationSeconds]
    );
  }

  const recalculation = await recalculateProfileGamification(profileId);
  const todaysSnapshot = await pool.query(
    `SELECT workouts_completed,
            club_sessions,
            streak_days,
            interactions_count,
            skill_level,
            intensity_score,
            score
     FROM profile_progress_snapshots
     WHERE profile_id = $1
       AND snapshot_date = CURRENT_DATE`,
    [profileId]
  );

  const baseline = todaysSnapshot.rows[0];
  if (!baseline) {
    return {
      profileId,
      workoutsInserted: workoutsToInsert,
      snapshotsInserted: 0,
      newlyAwarded: recalculation.newlyAwarded?.length ?? 0,
    };
  }

  let snapshotsInserted = 0;
  const denominator = historyDays + 1;

  for (let day = historyDays; day >= 1; day -= 1) {
    const numerator = historyDays - day + 1;
    // eslint-disable-next-line no-await-in-loop
    const insert = await pool.query(
      `INSERT INTO profile_progress_snapshots (
         profile_id,
         snapshot_date,
         workouts_completed,
         club_sessions,
         streak_days,
         interactions_count,
         skill_level,
         intensity_score,
         score,
         created_at,
         updated_at
       )
       VALUES (
         $1,
         CURRENT_DATE - $2::int,
         $3,
         $4,
         $5,
         $6,
         $7,
         $8,
         $9,
         NOW(),
         NOW()
       )
       ON CONFLICT (profile_id, snapshot_date) DO NOTHING`,
      [
        profileId,
        day,
        scaledMetric(baseline.workouts_completed, numerator, denominator),
        scaledMetric(baseline.club_sessions, numerator, denominator),
        scaledMetric(baseline.streak_days, numerator, denominator),
        scaledMetric(baseline.interactions_count, numerator, denominator),
        scaledMetric(baseline.skill_level, numerator, denominator),
        scaledMetric(baseline.intensity_score, numerator, denominator),
        scaledMetric(baseline.score, numerator, denominator),
      ]
    );
    snapshotsInserted += insert.rowCount ?? 0;
  }

  return {
    profileId,
    workoutsInserted: workoutsToInsert,
    snapshotsInserted,
    newlyAwarded: recalculation.newlyAwarded?.length ?? 0,
  };
}

async function run() {
  const options = parseArgs();
  const setup = await verifyProgressSetup();

  if (!setup.ok) {
    console.log('Progress setup check: FAILED');
    if (setup.missingTables.length) {
      console.log(`Missing tables: ${setup.missingTables.join(', ')}`);
    }
    if (setup.missingColumns.length) {
      console.log(`Missing columns: ${setup.missingColumns.join(', ')}`);
    }
    if (!setup.hasUniqueSnapshotConstraint) {
      console.log('Missing unique index/constraint on (profile_id, snapshot_date).');
    }
    process.exitCode = 1;
    return;
  }

  console.log('Progress setup check: PASSED');

  const profilesQuery = options.includeClubProfiles
    ? `SELECT id_profiles
       FROM profiles
       ORDER BY id_profiles`
    : `SELECT id_profiles
       FROM profiles
       WHERE COALESCE(is_club_profile, false) = false
       ORDER BY id_profiles`;

  const profilesResult = await pool.query(profilesQuery);
  const profileIds = profilesResult.rows.map((row) => Number(row.id_profiles));

  if (!profileIds.length) {
    console.log('No profiles found to seed.');
    return;
  }

  const summary = {
    profileCount: profileIds.length,
    workoutsInserted: 0,
    snapshotsInserted: 0,
    newlyAwardedBadges: 0,
  };

  for (const profileId of profileIds) {
    // eslint-disable-next-line no-await-in-loop
    const seeded = await seedForProfile(
      profileId,
      options.targetWorkouts,
      options.historyDays
    );
    summary.workoutsInserted += seeded.workoutsInserted;
    summary.snapshotsInserted += seeded.snapshotsInserted;
    summary.newlyAwardedBadges += seeded.newlyAwarded;
  }

  console.log('Seed complete:', summary);
}

run()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
