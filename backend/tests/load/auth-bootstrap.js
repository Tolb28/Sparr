const { request } = require('../utils/api-client');

const DEFAULT_PASSWORD = process.env.LOAD_TEST_PASSWORD || 'LoadTestPass123!';
const DEFAULT_USER_COUNT = Number(process.env.LOAD_TEST_USER_COUNT) || 3;

function normalizeBaseEmail(index) {
  return `load_test_user_${index}@sparr.test`;
}

async function registerOrLogin(email, password) {
  const login = await request({
    method: 'POST',
    path: '/api/auth/login',
    body: { email, password },
  });

  if (login.ok && login.data?.token) {
    return login.data;
  }

  const register = await request({
    method: 'POST',
    path: '/api/auth/register',
    body: { email, password },
  });

  if (register.ok && register.data?.token) {
    return register.data;
  }

  const errors = [
    `login_status=${login.status}`,
    `register_status=${register.status}`,
    `login_error=${JSON.stringify(login.data)}`,
    `register_error=${JSON.stringify(register.data)}`,
  ];
  throw new Error(`Unable to obtain token for ${email}: ${errors.join(', ')}`);
}

async function listProfiles(token) {
  const response = await request({
    method: 'GET',
    path: '/api/auth/profiles',
    token,
  });
  if (!response.ok) {
    return [];
  }
  return Array.isArray(response.data?.profiles) ? response.data.profiles : [];
}

async function createProfile(token, index) {
  const uniqueSuffix = `${Date.now()}_${index}_${Math.floor(Math.random() * 10000)}`;
  const response = await request({
    method: 'POST',
    path: '/api/auth/profile',
    token,
    body: {
      display_name: `Load Tester ${index}`,
      username: `load_tester_${index}_${uniqueSuffix}`,
      location: 'Load Test Gym',
      bio: 'Automated load test profile',
      experience_level: 'beginner',
      height_cm: 180,
    },
  });

  if (!response.ok || !response.data?.profile?.id_profiles) {
    throw new Error(`Failed to create profile for user ${index}: ${JSON.stringify(response.data)}`);
  }
  return response.data.profile;
}

async function ensureProfile(token, index) {
  const profiles = await listProfiles(token);
  if (profiles.length > 0) {
    return profiles[0];
  }
  return createProfile(token, index);
}

function buildHeaders(token, profileId) {
  return {
    Authorization: `Bearer ${token}`,
    'x-profile-id': String(profileId),
  };
}

async function createAuthContext(userCount = DEFAULT_USER_COUNT) {
  const users = [];
  for (let index = 1; index <= userCount; index += 1) {
    const email = normalizeBaseEmail(index);
    const auth = await registerOrLogin(email, DEFAULT_PASSWORD);
    const profile = await ensureProfile(auth.token, index);
    users.push({
      index,
      email,
      password: DEFAULT_PASSWORD,
      token: auth.token,
      userId: auth.user?.id || null,
      profileId: Number(profile.id_profiles),
      headers: buildHeaders(auth.token, profile.id_profiles),
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    users,
    primaryUser: users[0] || null,
    secondaryUser: users[1] || null,
  };
}

module.exports = {
  createAuthContext,
  DEFAULT_PASSWORD,
};
