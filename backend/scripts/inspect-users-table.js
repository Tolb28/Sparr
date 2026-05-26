#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='users' ORDER BY ordinal_position"
    );
    console.log('COLUMNS');
    res.rows.forEach(r => console.log(r.column_name, r.data_type));
  } catch (err) {
    console.error('ERROR', err.message || err);
    process.exit(2);
  } finally {
    await pool.end();
  }
}

main();
