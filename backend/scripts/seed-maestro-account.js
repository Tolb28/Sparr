#!/usr/bin/env node
/**
 * Creates two confirmed Supabase test accounts for the Maestro UI test suite.
 * Run once before the suite (idempotent — safe to re-run):
 *   node backend/scripts/seed-maestro-account.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

const ACCOUNTS = [
  {
    email: 'maestro_test@sparr.test',
    password: 'MaestroTest123!',
    display_name: 'Maestro Test',
    username: 'maestrotest',
    bio: 'Automated test account.',
    experience_level: 'intermediate',
  },
  {
    email: 'maestro_partner@sparr.test',
    password: 'MaestroTest123!',
    display_name: 'Maestro Partner',
    username: 'maestropartner',
    bio: 'Second test account for social feature tests.',
    experience_level: 'beginner',
  },
];

async function createConfirmedUser(supabase, email, password) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    if (error.code === 'email_exists' || (error.message && error.message.includes('already'))) {
      console.log(`  ${email}: already exists`);
      return;
    }
    throw new Error(`Create user failed for ${email}: ${error.message}`);
  }
  console.log(`  ${email}: created (id=${data.user.id})`);
}

async function signIn(_supabase, email, password) {
  const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Sign-in failed for ${email}: ${body}`);
  }
  const data = await res.json();
  return data.token;
}

async function ensureProfile(token, account) {
  const checkRes = await fetch(`${BACKEND_URL}/api/auth/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (checkRes.ok) {
    const p = await checkRes.json();
    console.log(`  @${p.username}: profile already exists`);
    return p;
  }

  const form = new FormData();
  form.append('display_name', account.display_name);
  form.append('username', account.username);
  form.append('bio', account.bio);
  form.append('experience_level', account.experience_level);

  const res = await fetch(`${BACKEND_URL}/api/auth/profile`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Profile creation failed for ${account.email}: ${body}`);
  }
  const p = await res.json();
  console.log(`  @${p.username}: profile created`);
  return p;
}

async function ensureConversation(tokenA, profileIdB) {
  const res = await fetch(`${BACKEND_URL}/api/auth/chat/conversations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ participantIds: [profileIdB] }),
  });
  if (res.ok) {
    const conv = await res.json();
    console.log(`  Conversation created (id=${conv.id || conv.conversation_id || 'ok'})`);
  } else {
    const body = await res.text();
    if (body.includes('already') || body.includes('exists')) {
      console.log('  Conversation already exists');
    } else {
      console.warn(`  Warning: could not create conversation: ${body}`);
    }
  }
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const tokens = [];
  const profiles = [];

  for (const account of ACCOUNTS) {
    console.log(`\n[${account.email}]`);
    await createConfirmedUser(supabase, account.email, account.password);
    const token = await signIn(supabase, account.email, account.password);
    const profile = await ensureProfile(token, account);
    tokens.push(token);
    profiles.push(profile);
  }

  if (profiles[0] && profiles[1]) {
    console.log('\n[Seeding conversation between test accounts]');
    await ensureConversation(tokens[0], profiles[1].id);
  }

  console.log('\n✓ Seed complete.');
  console.log('  Main account:    maestro_test@sparr.test / MaestroTest123!');
  console.log('  Partner account: maestro_partner@sparr.test / MaestroTest123!');
  console.log('\nRun the test suite:');
  console.log('  maestro test frontend/.maestro/flows/');
}

main().catch((err) => {
  console.error('\nSeed error:', err.message);
  process.exit(1);
});
