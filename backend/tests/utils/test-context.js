const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

require('ts-node/register/transpile-only');
const { pool } = require('../../src/config/db');

const DEFAULT_TTL = process.env.TEST_JWT_TTL || '7d';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set in the environment.');
  }
  return secret;
}

async function buildTestContext(baseUrl) {
  const { rows } = await pool.query(
    `SELECT id_profiles, username, user_id
     FROM profiles
     WHERE username LIKE 'test_user_%'
     ORDER BY username ASC`
  );

  if (!rows.length) {
    throw new Error('No test_user_* profiles found. Run the data seeder first.');
  }

  const secret = getJwtSecret();
  const tokens = {};
  rows.forEach((profile) => {
    tokens[profile.id_profiles] = jwt.sign({ userId: profile.user_id }, secret, {
      expiresIn: DEFAULT_TTL,
    });
  });

  const adminProfile = rows[0];
  const adminToken = jwt.sign(
    { userId: adminProfile.user_id, isAdmin: true },
    secret,
    { expiresIn: DEFAULT_TTL }
  );

  return {
    baseUrl,
    generatedAt: new Date().toISOString(),
    profiles: rows.map((profile) => ({
      id: profile.id_profiles,
      username: profile.username,
      userId: profile.user_id,
    })),
    tokens,
    adminToken,
  };
}

async function writeTestContext(filePath, baseUrl) {
  const context = await buildTestContext(baseUrl);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(context, null, 2));
  return context;
}

module.exports = {
  buildTestContext,
  writeTestContext,
  closeContextPool: () => pool.end(),
};

if (require.main === module) {
  const args = process.argv.slice(2);
  const outputIndex = args.findIndex((arg) => arg === '--output');
  const baseIndex = args.findIndex((arg) => arg === '--base-url');
  const outputPath =
    outputIndex >= 0 ? args[outputIndex + 1] : path.join(__dirname, '..', '..', 'test-results', 'test-context.json');
  const baseUrl = baseIndex >= 0 ? args[baseIndex + 1] : process.env.TEST_BASE_URL;

  if (!baseUrl) {
    console.error('Base URL is required. Provide --base-url or set TEST_BASE_URL.');
    process.exit(1);
  }

  writeTestContext(outputPath, baseUrl)
    .then((context) => {
      console.log(`Test context written to ${outputPath}`);
      console.log(`Profiles: ${context.profiles.length}`);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(() => pool.end());
}
