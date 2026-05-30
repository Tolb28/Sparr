#!/usr/bin/env node
/**
 * Full backend regression sweep: tests all endpoint categories
 * Covers discovery, training, chat, clubs, friends, gamification
 */

const fs = require('fs');
const path = require('path');

require('ts-node/register/transpile-only');
const { pool } = require('../src/config/db');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:4000';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

const jwt = require('jsonwebtoken');

async function fetchWithLogging(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const startTime = Date.now();
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    const duration = Date.now() - startTime;
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return {
      status: response.status,
      ok: response.ok,
      data,
      duration,
      endpoint,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      status: 0,
      ok: false,
      error: error.message,
      duration,
      endpoint,
    };
  }
}

async function runRegressionSweep() {
  const results = {
    summary: { total: 0, passed: 0, failed: 0 },
    errors: [],
    endpoints: {},
  };

  try {
    // Get test profiles
    const { rows: profiles } = await pool.query(
      "SELECT id_profiles, username, user_id FROM profiles WHERE username LIKE 'test_user_%' LIMIT 2"
    );

    if (!profiles.length) {
      console.error('❌ No test profiles found. Run data seeder first.');
      process.exit(1);
    }

    const profile1 = profiles[0];
    const profile2 = profiles[1] || profile1;
    const token1 = jwt.sign({ userId: profile1.user_id }, JWT_SECRET, { expiresIn: '1h' });
    const token2 = jwt.sign({ userId: profile2.user_id }, JWT_SECRET, { expiresIn: '1h' });
    const adminToken = jwt.sign({ userId: profile1.user_id, isAdmin: true }, JWT_SECRET, { expiresIn: '1h' });

    const headers = (token) => ({
      Authorization: `Bearer ${token}`,
      'x-profile-id': profile1.id_profiles.toString(),
    });

    // Test suite
    const endpoints = [
      // Discovery endpoints
      { name: 'GET /discovery', method: 'GET', path: '/api/auth/discovery', token: token1 },
      { name: 'GET /discovery/boxers', method: 'GET', path: '/api/auth/discovery/boxers', token: token1 },
      { name: 'GET /discovery/recommendations', method: 'GET', path: '/api/auth/discovery/recommendations', token: token1 },

      // Training endpoints
      { name: 'GET /training/drills', method: 'GET', path: '/api/auth/training/drills', token: token1 },
      { name: 'GET /training/techniques', method: 'GET', path: '/api/auth/training/techniques', token: token1 },
      { name: 'GET /training/combinations', method: 'GET', path: '/api/auth/training/combinations', token: token1 },
      { name: 'GET /training/trainings', method: 'GET', path: '/api/auth/training/trainings', token: token1 },
      { name: 'GET /training/calendars/public', method: 'GET', path: '/api/auth/training/calendars/public', token: token1 },
      { name: 'GET /training/calendars/mine', method: 'GET', path: '/api/auth/training/calendars/mine', token: token1 },

      // Profile endpoints
      { name: 'GET /profile', method: 'GET', path: '/api/auth/profile', token: token1 },
      { name: 'GET /profiles', method: 'GET', path: '/api/auth/profiles', token: token1 },

      // Friends endpoints
      { name: 'GET /friends', method: 'GET', path: '/api/auth/friends', token: token1 },
      { name: 'GET /friends/requests/pending', method: 'GET', path: '/api/auth/friends/requests/pending', token: token1 },

      // Chat endpoints
      { name: 'GET /chat/conversations', method: 'GET', path: '/api/auth/chat/conversations', token: token1 },

      // Clubs endpoints
      { name: 'GET /clubs', method: 'GET', path: '/api/auth/clubs', token: token1 },
      { name: 'GET /clubs/memberships/me', method: 'GET', path: '/api/auth/clubs/memberships/me', token: token1 },

      // Gamification endpoints
      { name: 'GET /gamification/badges/catalog', method: 'GET', path: '/api/auth/gamification/badges/catalog', token: token1 },
      { name: 'GET /gamification/profiles/1/badges', method: 'GET', path: `/api/auth/gamification/profiles/${profile1.id_profiles}/badges`, token: token1 },
      { name: 'GET /gamification/profiles/1/progress', method: 'GET', path: `/api/auth/gamification/profiles/${profile1.id_profiles}/progress`, token: token1 },
    ];

    endpoints.push({
      name: 'POST /gamification/recalculate/own-profile',
      method: 'POST',
      path: `/api/auth/gamification/recalculate/${profile1.id_profiles}`,
      token: token1,
      expectedStatus: 200,
    });

    if (profile2.id_profiles !== profile1.id_profiles) {
      endpoints.push({
        name: 'POST /gamification/recalculate/foreign-profile',
        method: 'POST',
        path: `/api/auth/gamification/recalculate/${profile2.id_profiles}`,
        token: token1,
        expectedStatus: 403,
      });
    }

    console.log(`\n🧪 Running regression sweep on ${endpoints.length} endpoints...\n`);

    for (const endpoint of endpoints) {
      const response = await fetchWithLogging(endpoint.path, {
        method: endpoint.method,
        headers: headers(endpoint.token),
      });

      results.summary.total++;
      results.endpoints[endpoint.name] = {
        status: response.status,
        ok: response.ok,
        duration: response.duration,
        error: response.error,
      };

      const expectedStatus = endpoint.expectedStatus;
      const matchedExpected =
        expectedStatus !== undefined ? response.status === expectedStatus : (response.ok && response.status >= 200 && response.status < 300);

      if (matchedExpected) {
        results.summary.passed++;
        console.log(`✅ ${endpoint.name} (${response.status}, ${response.duration}ms)`);
      } else {
        results.summary.failed++;
        const errorMsg = response.error || response.data?.error || 'Unknown error';
        results.errors.push({
          endpoint: endpoint.name,
          status: response.status,
          error: errorMsg,
        });
        console.log(`❌ ${endpoint.name} (${response.status}, ${response.duration}ms) - ${errorMsg}`);
      }
    }

    console.log(`\n📊 Summary: ${results.summary.passed}/${results.summary.total} passed`);

    if (results.errors.length > 0) {
      console.log(`\n⚠️ ${results.errors.length} endpoint failures:\n`);
      results.errors.forEach((err) => {
        console.log(`  - ${err.endpoint}: ${err.error}`);
      });
    }

    // Write results
    const outputPath = path.join(__dirname, '..', 'test-results', 'regression-sweep.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n📄 Results saved to ${outputPath}`);

    process.exitCode = results.errors.length > 0 ? 1 : 0;
  } catch (error) {
    console.error('❌ Regression sweep failed:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runRegressionSweep();
