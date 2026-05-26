#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const appUserId = process.argv[2] || '3219724b-3fff-4daf-b640-20804c5e1bc3';
    const res = await pool.query(
      `INSERT INTO public.auth_events (event_type, status, provider, user_id, message, metadata)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb) RETURNING id_auth_event, created_at`,
      ['login_conflict', 'info', 'local', appUserId, 'Test insert after FK fix', JSON.stringify({ test: true })]
    );
    console.log('INSERTED', res.rows[0]);
  } catch (err) {
    console.error('ERROR', err.message || err);
    process.exit(2);
  } finally {
    await pool.end();
  }
}

main();
