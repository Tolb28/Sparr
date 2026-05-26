#!/usr/bin/env node
/**
 * Apply the auth_events migration
 * Usage: node apply-auth-events-migration.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { Pool } = require('pg');

async function applyMigration() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('📁 Loading auth_events migration file...');
    const migrationPath = path.join(__dirname, '../sql/migrations/2026-05-10_1200_supabase_auth_logging.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('⚙️  Applying auth_events migration to database...');
    await pool.query(sql);

    console.log('✅ auth_events migration applied successfully');

    // Verify table exists
    const res = await pool.query(
      "SELECT to_regclass('public.auth_events') as tbl"
    );
    console.log('Table present:', res.rows[0].tbl);

  } catch (err) {
    console.error('❌ Error applying auth_events migration:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration();
