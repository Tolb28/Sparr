#!/usr/bin/env node
/**
 * Helper script to apply database migrations
 * Usage: node apply-migration.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { Pool } = require('pg');

async function applyMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('📁 Loading migration file...');
    const migrationPath = path.join(__dirname, '../sql/migrations/2026-04-29_2135_seed_content_personalization_rules.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('⚙️  Applying migration to database...');
    await pool.query(sql);

    console.log('✅ Migration applied successfully');

    // Check results
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM content_personalization_rules'
    );
    console.log(`📊 Total personalization rules in database: ${result.rows[0].count}`);

    const byType = await pool.query(
      `SELECT content_type, COUNT(*) as count 
       FROM content_personalization_rules 
       GROUP BY content_type 
       ORDER BY content_type`
    );
    
    console.log('\n📈 Rules by content type:');
    byType.rows.forEach(row => {
      console.log(`   ${row.content_type}: ${row.count}`);
    });

  } catch (err) {
    console.error('❌ Error applying migration:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration();
