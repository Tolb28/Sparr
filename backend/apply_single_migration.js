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
  const migrationPath = path.join(__dirname, 'sql', 'migrations', '2026-05-13_2150_seed_freebie_challenges.sql');

  try {
    console.log('📁 Loading migration file...', migrationPath);
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('⚙️  Applying migration to database...');
    await pool.query(sql);

    const res = await pool.query(
      `SELECT COUNT(*)::int AS count FROM public.challenge_catalog WHERE slug LIKE 'freebie-%'`
    );
    console.log('📊 Freebie challenges in database:', res.rows[0].count);

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error applying migration:', err.message || err);
    try { await pool.end(); } catch (e) {}
    process.exit(1);
  }
})();
