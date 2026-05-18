#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

(async function main() {
  const conn = process.env.DATABASE_URL;
  if (!conn) {
    console.error('DATABASE_URL not set in environment or backend/.env');
    process.exit(2);
  }

  const pool = new Pool({ connectionString: conn });
  const files = [
    path.join(__dirname, 'sql', 'migrations', '2026-05-08_1205_create_challenge_system.sql'),
    path.join(__dirname, 'sql', 'migrations', '2026-05-08_1215_seed_calendar_challenges.sql')
  ];

  try {
    for (const f of files) {
      console.log('Applying migration:', f);
      const sql = fs.readFileSync(f, 'utf8');
      await pool.query(sql);
      console.log('Applied:', path.basename(f));
    }

    const res = await pool.query('SELECT COUNT(*)::int AS count FROM public.challenge_catalog');
    console.log('challenge_catalog row count:', res.rows[0].count);
    console.log('MIGRATIONS_COMPLETE');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err.message || err);
    try { await pool.end(); } catch (e) {}
    process.exit(1);
  }
})();
