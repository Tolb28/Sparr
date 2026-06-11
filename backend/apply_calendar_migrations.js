#!/usr/bin/env node
// Applies the two calendar-types migrations to the dev/production database.
// Safe to run multiple times — DDL is guarded with IF NOT EXISTS / IF EXISTS.
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

const MIGRATIONS = [
  '2026-02-24_0930_calendar_types_and_times.sql',
  '2026-02-25_1000_calendar_nullable_training.sql',
];

(async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set in backend/.env');
    process.exit(1);
  }

  for (const filename of MIGRATIONS) {
    const filePath = path.join(__dirname, 'sql', 'migrations', filename);
    try {
      const sql = fs.readFileSync(filePath, 'utf8');
      await pool.query(sql);
      console.log(`✅ Applied: ${filename}`);
    } catch (err) {
      // Column/constraint already exists → not a failure
      if (err.code === '42701' || err.code === '42P07' || err.code === '42710') {
        console.log(`⏭  Skipped (already applied): ${filename}`);
      } else {
        console.error(`❌ Error applying ${filename}:`, err.message);
        await pool.end();
        process.exit(1);
      }
    }
  }

  await pool.end();
  console.log('Done.');
})();
