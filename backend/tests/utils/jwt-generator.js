const jwt = require('jsonwebtoken');

const DEFAULT_TTL = process.env.TEST_JWT_TTL || '7d';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set in the environment.');
  }
  return secret;
}

function generateUserTokens(profileIds = []) {
  const secret = getJwtSecret();
  return profileIds.reduce((acc, profileId) => {
    acc[profileId] = jwt.sign({ userId: profileId }, secret, {
      expiresIn: DEFAULT_TTL,
    });
    return acc;
  }, {});
}

function generateAdminToken(adminProfileId) {
  if (!adminProfileId) {
    throw new Error('adminProfileId is required to generate an admin token.');
  }
  const secret = getJwtSecret();
  return jwt.sign({ userId: adminProfileId, isAdmin: true }, secret, {
    expiresIn: DEFAULT_TTL,
  });
}

module.exports = {
  generateUserTokens,
  generateAdminToken,
};
