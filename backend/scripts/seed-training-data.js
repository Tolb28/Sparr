#!/usr/bin/env node
/**
 * Seed training data (workout completions -> sessions / hours / streak) for a profile.
 *
 *   node backend/scripts/seed-training-data.js [username]
 *
 * Default username: blud. Appends rows to workout_completions, so run once.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const USERNAME = (process.argv[2] || 'blud').replace(/^@/, '');

// One session per entry. daysAgo 0..6 are consecutive -> current streak of 7 days.
const SESSIONS = [
  { daysAgo: 0, minutes: 55 },
  { daysAgo: 1, minutes: 45 },
  { daysAgo: 2, minutes: 60 },
  { daysAgo: 3, minutes: 40 },
  { daysAgo: 4, minutes: 70 },
  { daysAgo: 5, minutes: 50 },
  { daysAgo: 6, minutes: 45 },
  { daysAgo: 9, minutes: 60 },
  { daysAgo: 11, minutes: 35 },
  { daysAgo: 13, minutes: 75 },
  { daysAgo: 15, minutes: 50 },
  { daysAgo: 17, minutes: 55 },
  { daysAgo: 20, minutes: 40 },
  { daysAgo: 23, minutes: 65 },
  { daysAgo: 26, minutes: 45 },
  { daysAgo: 29, minutes: 60 },
];

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  const { rows: prows } = await pool.query(
    'SELECT id_profiles, display_name FROM profiles WHERE username = $1',
    [USERNAME]
  );
  if (!prows[0]) {
    console.error(`No profile found for username "${USERNAME}".`);
    process.exit(1);
  }
  const profileId = prows[0].id_profiles;
  console.log(`Seeding for @${USERNAME} (profile ${profileId} — ${prows[0].display_name})`);

  let inserted = 0;
  for (const s of SESSIONS) {
    await pool.query(
      `INSERT INTO workout_completions (profile_id, training_id, completed_at, duration_seconds)
       VALUES ($1, NULL, (CURRENT_DATE - $2::int)::timestamp + interval '18 hours', $3)`,
      [profileId, s.daysAgo, s.minutes * 60]
    );
    inserted++;
  }
  console.log(`Inserted ${inserted} workout completions.`);

  // Report the resulting metrics straight from the DB (mirrors the app's metric queries).
  const totals = await pool.query(
    `SELECT COUNT(*)::int AS sessions, ROUND(SUM(duration_seconds) / 3600.0, 1) AS hours
     FROM workout_completions WHERE profile_id = $1`,
    [profileId]
  );
  const streak = await pool.query(
    `WITH daily AS (SELECT DISTINCT completed_at::date d FROM workout_completions WHERE profile_id = $1),
          numbered AS (SELECT d, d - (ROW_NUMBER() OVER (ORDER BY d))::int grp FROM daily),
          streaks AS (SELECT grp, MAX(d) e, COUNT(*)::int len FROM numbered GROUP BY grp)
     SELECT COALESCE(MAX(len), 0)::int streak FROM streaks WHERE e >= CURRENT_DATE - 1`,
    [profileId]
  );
  console.log(
    `Totals for @${USERNAME} -> sessions: ${totals.rows[0].sessions}, ` +
    `hours: ${totals.rows[0].hours}, current streak: ${streak.rows[0].streak} days`
  );

  await pool.end();
})().catch((e) => {
  console.error('Seed error:', e.message);
  process.exit(1);
});
