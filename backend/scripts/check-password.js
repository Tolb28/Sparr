#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

async function main() {
  const email = process.argv[2] || 'ivan@mail.com';
  const password = process.argv[3] || '1234';
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query('SELECT password_hash FROM public.users WHERE email = $1 LIMIT 1', [email]);
    if (res.rows.length === 0) {
      console.log('NOT_FOUND');
      process.exit(0);
    }
    const hash = res.rows[0].password_hash;
    if (!hash) {
      console.log('NO_PASSWORD_HASH');
      process.exit(0);
    }
    const ok = await bcrypt.compare(password, hash);
    console.log(ok ? 'MATCH' : 'NO_MATCH');
  } catch (err) {
    console.error('ERROR', err.message || err);
    process.exit(2);
  } finally {
    await pool.end();
  }
}

main();
