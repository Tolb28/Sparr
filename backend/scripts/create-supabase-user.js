#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const email = process.argv[2] || 'ivan@mail.com';
  const password = process.argv[3] || '1234';
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(2);
  }
  const supabase = createClient(supabaseUrl, serviceRole);
  try {
    const res = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { created_by_script: true }
    });
    if (res.error) {
      console.error('ERROR', res.error.message || JSON.stringify(res.error));
      process.exit(2);
    }
    console.log('CREATED', JSON.stringify(res.data || res));
  } catch (err) {
    console.error('EXCEPTION', err.message || err);
    process.exit(2);
  }
}

main();
