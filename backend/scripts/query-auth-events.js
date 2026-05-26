#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query(
      `SELECT id_auth_event, event_type, status, provider, user_id, message, metadata, created_at
       FROM public.auth_events
       ORDER BY created_at DESC
       LIMIT 20`
    );
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('ERROR', err.message || err);
    process.exit(2);
  } finally {
    await pool.end();
  }
}

main();
