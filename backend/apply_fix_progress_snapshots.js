#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

(async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const migrationPath = path.join(
    __dirname,
    'sql',
    'migrations',
    '2026-06-11_1000_fix_progress_snapshots_unique_constraint.sql'
  );

  try {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    await pool.query(sql);
    console.log('✅ Unique constraint added to profile_progress_snapshots');
  } catch (err) {
    console.error('❌ Error:', err.message || err);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
