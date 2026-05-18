#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const email = process.argv[2] || 'ivan@mail.com';
  const password = process.argv[3] || '1234';
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) {
    console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
    process.exit(2);
  }
  const client = createClient(url, anon, { auth: { persistSession: false } });
  try {
    const res = await client.auth.signInWithPassword({ email, password });
    if (res.error) {
      console.error('ERROR', res.error.message || JSON.stringify(res.error));
      process.exit(2);
    }
    console.log('SIGNED_IN', JSON.stringify(res.data || res));
  } catch (err) {
    console.error('EXCEPTION', err.message || err);
    process.exit(2);
  }
}

main();
