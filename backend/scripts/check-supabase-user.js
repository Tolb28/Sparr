#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

async function main() {
  const email = process.argv[2] || 'ivan@mail.com';
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query(
      "SELECT id, email, raw_user_meta_data, created_at FROM auth.users WHERE email = $1 LIMIT 1",
      [email]
    );
    if (res.rows.length === 0) {
      console.log('SUPABASE_USER_NOT_FOUND');
      process.exit(0);
    }
    console.log('SUPABASE_USER_FOUND', JSON.stringify(res.rows[0]));
  } catch (err) {
    console.error('ERROR', err.message || err);
    process.exit(2);
  } finally {
    await pool.end();
  }
}

main();
