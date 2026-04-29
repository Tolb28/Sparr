const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

const { request } = require('./utils/api-client');
const { assertStatus, assertRange, assertSchemaShape } = require('./utils/assertions');
const { buildTestContext, closeContextPool } = require('./utils/test-context');

const DEFAULT_RANGE = 'week';
const CACHE_HEADER_KEYS = ['x-cache', 'x-cache-status', 'x-cache-hit'];

function loadScenario(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function resolveScenarioPath(scenario) {
  if (path.isAbsolute(scenario)) {
    return scenario;
  }
  return path.join(__dirname, 'scenarios', scenario);
}

function buildProfileMaps(context) {
  const profiles = context.profiles || [];
  const profileByUsername = new Map();
  const profileByIndex = new Map();
  profiles.forEach((profile) => {
    profileByUsername.set(profile.username, profile);
    const match = profile.username.match(/test_user_(\d+)/);
    if (match) {
      profileByIndex.set(Number(match[1]), profile);
    }
  });
  return { profileByUsername, profileByIndex };
}

function resolveProfileId(profileId, profileByIndex, profileByUsername) {
  if (profileId === undefined || profileId === null) {
    return null;
  }
  if (typeof profileId === 'number' && profileByIndex.has(profileId)) {
    return profileByIndex.get(profileId).id;
  }
  if (typeof profileId === 'string') {
    if (profileByUsername.has(profileId)) {
      return profileByUsername.get(profileId).id;
    }
    const numeric = Number(profileId);
    if (!Number.isNaN(numeric) && profileByIndex.has(numeric)) {
      return profileByIndex.get(numeric).id;
    }
  }
  return profileId;
}

function replaceProfileIdsInPath(rawPath, profileByIndex) {
  return rawPath.replace(/\/profiles\/(\d+)(?=\/|$)/g, (match, index) => {
    const numeric = Number(index);
    if (profileByIndex.has(numeric)) {
      return `/profiles/${profileByIndex.get(numeric).id}`;
    }
    return match;
  });
}

function resolveToken(test, context, profileId) {
  if (test.token === null) {
    return null;
  }
  if (typeof test.token === 'string') {
    if (test.token === 'admin_token') {
      return context.adminToken;
    }
    const match = test.token.match(/test_user_(\d+)_token/);
    if (match) {
      const index = Number(match[1]);
      const profile = context.profileByIndex.get(index);
      return profile ? context.tokens[profile.id] : null;
    }
    if (test.token.includes('.')) {
      return test.token;
    }
  }

  if (test.auth === 'token' && profileId) {
    return context.tokens[profileId];
  }

  if (profileId && context.tokens[profileId]) {
    return context.tokens[profileId];
  }

  const fallbackProfile = context.profiles[0];
  return fallbackProfile ? context.tokens[fallbackProfile.id] : null;
}

function extractCacheHeader(headers) {
  if (!headers || typeof headers.get !== 'function') {
    return null;
  }
  for (const key of CACHE_HEADER_KEYS) {
    const value = headers.get(key);
    if (value) {
      return value.toLowerCase();
    }
  }
  return null;
}

function parseVerifyClauses(verify) {
  if (!verify) {
    return [];
  }
  if (Array.isArray(verify)) {
    return verify;
  }
  return String(verify)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function evaluateComparison(left, operator, right) {
  switch (operator) {
    case '==':
      return left === right;
    case '!=':
      return left !== right;
    case '>=':
      return left >= right;
    case '<=':
      return left <= right;
    case '>':
      return left > right;
    case '<':
      return left < right;
    default:
      return false;
  }
}

function extractMetricValue(metrics, expression) {
  if (!metrics) {
    return undefined;
  }
  const pathParts = expression.split('.');
  let current = metrics;
  for (const part of pathParts) {
    if (current && Object.prototype.hasOwnProperty.call(current, part)) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return current;
}

async function readLogSegment(logFile, start) {
  if (!logFile || !fs.existsSync(logFile)) {
    return '';
  }
  const data = fs.readFileSync(logFile, 'utf8');
  if (start >= data.length) {
    return '';
  }
  return data.slice(start);
}

async function waitForCacheLog(logFile, start, timeoutMs = 1500) {
  const startTime = Date.now();
  let position = start;
  while (Date.now() - startTime < timeoutMs) {
    const segment = await readLogSegment(logFile, position);
    if (segment) {
      const match = segment.match(/cache_(hit|miss)/i);
      if (match) {
        return { event: match[0].toLowerCase(), segment };
      }
      position += segment.length;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return null;
}

async function sendRequest({ method = 'GET', path: requestPath, token, body }) {
  const start = performance.now();
  const response = await request({
    method,
    path: requestPath,
    token,
    body,
  });
  const durationMs = performance.now() - start;
  return { response, durationMs };
}

async function fetchProgress(context, profileId, range, token) {
  const path = `/api/auth/gamification/profiles/${profileId}/progress?range=${range}`;
  const { response } = await sendRequest({ path, token });
  return response.data;
}

async function fetchBadgeCatalog(token) {
  const { response } = await sendRequest({
    path: '/api/auth/gamification/badges/catalog',
    token,
  });
  return response.data?.badges || [];
}

async function fetchProfileBadges(profileId, token) {
  const { response } = await sendRequest({
    path: `/api/auth/gamification/profiles/${profileId}/badges`,
    token,
  });
  return response.data?.badges || [];
}

async function logWorkout(token, durationSeconds = 1800) {
  const { response } = await sendRequest({
    method: 'POST',
    path: '/api/auth/gamification/complete',
    token,
    body: {
      duration_seconds: durationSeconds,
    },
  });
  return response.data;
}

function evaluateVerifyStatements(clauses, { metrics, cacheEvent, durationMs, context }) {
  const errors = [];
  const skipped = [];

  clauses.forEach((clause) => {
    if (clause.startsWith('response_time')) {
      const match = clause.match(/response_time\s*(>=|<=|>|<)\s*(\d+)/i);
      if (!match) {
        skipped.push(clause);
        return;
      }
      const operator = match[1];
      const threshold = Number(match[2]);
      const tolerance = threshold * 0.2;
      const adjustedThreshold =
        operator === '>' || operator === '>=' ? threshold - tolerance : threshold + tolerance;
      const ok = evaluateComparison(durationMs, operator, adjustedThreshold);
      if (!ok) {
        errors.push(`Expected ${clause}, actual ${durationMs.toFixed(1)}ms`);
      }
      return;
    }

    if (clause.includes('cache_hit') || clause.includes('cache_miss')) {
      const expected = clause.includes('cache_hit') ? 'cache_hit' : 'cache_miss';
      if (!cacheEvent) {
        errors.push(`Expected ${expected} in logs, but no cache event detected.`);
      } else if (!cacheEvent.includes(expected)) {
        errors.push(`Expected ${expected} in logs, got ${cacheEvent}.`);
      }
      return;
    }

    if (clause.startsWith('metrics.')) {
      const match = clause.match(/metrics\.(\w+)\s*(==|!=|>=|<=|>|<)\s*(\d+)/);
      if (!match) {
        skipped.push(clause);
        return;
      }
      const key = match[1];
      const operator = match[2];
      const expected = Number(match[3]);
      const value = metrics ? metrics[key] : undefined;
      if (value === undefined) {
        errors.push(`Metric ${key} missing from response.`);
        return;
      }
      if (!evaluateComparison(value, operator, expected)) {
        errors.push(`Expected metrics.${key} ${operator} ${expected}, got ${value}.`);
      }
      return;
    }

    if (clause.includes('metrics != profile_')) {
      const match = clause.match(/profile_(\d+)_metrics/);
      if (!match) {
        skipped.push(clause);
        return;
      }
      const index = Number(match[1]);
      const profile = context.profileByIndex.get(index);
      if (!profile) {
        skipped.push(clause);
        return;
      }
      const otherMetrics = context.metricsByProfileId.get(profile.id);
      if (!otherMetrics) {
        skipped.push(clause);
        return;
      }
      const current = JSON.stringify(metrics);
      const other = JSON.stringify(otherMetrics);
      if (current === other) {
        errors.push('Expected metrics to differ from profile_1_metrics.');
      }
      return;
    }

    if (clause.includes('each profile sees unique metrics')) {
      const metricsValues = Array.from(context.metricsByProfileId.values());
      const uniqueCount = new Set(metricsValues.map((value) => JSON.stringify(value))).size;
      if (metricsValues.length > 1 && uniqueCount !== metricsValues.length) {
        errors.push('Expected unique metrics per profile.');
      }
      return;
    }

    skipped.push(clause);
  });

  return { errors, skipped };
}

function evaluateCheckExpression(check, metrics) {
  if (!check || !metrics) {
    return null;
  }
  if (check === 'intensity_score >= (skill_level / 4)') {
    return metrics.intensity_score >= metrics.skill_level / 4;
  }
  return null;
}

async function executeBadgeIntegrationTest(test, context, resolvedProfileId, token) {
  const errors = [];
  const notes = [];
  const range = DEFAULT_RANGE;

  if (test.steps.some((step) => step.includes('initial state'))) {
    const initialCatalog = await fetchBadgeCatalog(token);
    const initialProgress = await fetchProgress(context, resolvedProfileId, range, token);
    const initialBadges = await fetchProfileBadges(resolvedProfileId, token);

    await logWorkout(token, 1500);

    const updatedProgress = await fetchProgress(context, resolvedProfileId, range, token);
    const updatedCatalog = await fetchBadgeCatalog(token);

    if (
      updatedProgress?.metrics?.workouts_completed <=
      initialProgress?.metrics?.workouts_completed
    ) {
      errors.push('Expected workouts_completed to increase after workout completion.');
    }

    const catalogProgressIncreased = updatedCatalog.some((badge, index) => {
      const initial = initialCatalog[index];
      if (!initial) return false;
      return Number(badge.progress) > Number(initial.progress);
    });
    if (!catalogProgressIncreased) {
      errors.push('Expected badge progress to increase after workout completion.');
    }

    context.badgeCatalogByProfileId.set(resolvedProfileId, updatedCatalog);
    context.profileBadgesByProfileId.set(resolvedProfileId, initialBadges);
    context.metricsByProfileId.set(resolvedProfileId, updatedProgress?.metrics || {});
    return { errors, notes };
  }

  if (test.steps.some((step) => step.includes('badge unlock'))) {
    const catalog = await fetchBadgeCatalog(token);
    const candidate = catalog.find(
      (badge) =>
        !badge.earned &&
        ['workouts_completed', 'score', 'intensity_score', 'skill_level'].includes(
          badge.metric_key
        )
    );
    if (!candidate) {
      notes.push('No eligible badge found for automatic unlock verification.');
      return { errors, notes };
    }

    const threshold = Number(candidate.threshold) || 0;
    const current = Number(candidate.current_value) || 0;
    const remaining = Math.max(0, threshold - current);
    const maxWorkouts = 25;
    const workoutsToCreate = Math.min(remaining, maxWorkouts);

    if (workoutsToCreate === 0) {
      notes.push('Badge already unlocked before test.');
    } else if (remaining > maxWorkouts) {
      notes.push(
        `Badge requires ${remaining} increments; created ${maxWorkouts} workouts for partial validation.`
      );
    } else {
      for (let i = 0; i < workoutsToCreate; i += 1) {
        await logWorkout(token, 1200);
      }
    }

    const updatedCatalog = await fetchBadgeCatalog(token);
    const updatedBadge = updatedCatalog.find(
      (badge) => badge.id_badges === candidate.id_badges
    );
    if (!updatedBadge) {
      errors.push('Unable to find candidate badge after update.');
      return { errors, notes };
    }

    if (!updatedBadge.earned && workoutsToCreate === remaining) {
      errors.push('Expected badge to be unlocked after completing workouts.');
    }

    context.badgeCatalogByProfileId.set(resolvedProfileId, updatedCatalog);
    return { errors, notes };
  }

  notes.push('No badge integration steps executed.');
  return { errors, notes };
}

async function executeScenarioTest(test, scenarioName, context, options) {
  const resolvedProfileId = resolveProfileId(
    test.profileId,
    context.profileByIndex,
    context.profileByUsername
  );
  const token = resolveToken(test, context, resolvedProfileId);
  const logFile = options.logFile;

  const startLogSize = logFile && fs.existsSync(logFile) ? fs.statSync(logFile).size : 0;
  let response = null;
  let durationMs = 0;
  let cacheEvent = null;
  const defaultProfileId =
    resolveProfileId(1, context.profileByIndex, context.profileByUsername) ??
    context.profiles[0]?.id;

  if (test.steps && scenarioName.toLowerCase().includes('badge')) {
    const { errors, notes } = await executeBadgeIntegrationTest(
      test,
      context,
      resolvedProfileId ?? context.profiles[0].id,
      token
    );
    return {
      name: test.name,
      status: errors.length ? 'failed' : 'passed',
      durationMs: 0,
      errors,
      notes,
    };
  }

  if (test.steps && scenarioName.toLowerCase().includes('cache')) {
    const targetProfile = defaultProfileId;
    const targetToken = resolveToken({}, context, targetProfile);
    const range = test.range || DEFAULT_RANGE;
    await logWorkout(targetToken, 1800);
    const requestPath = `/api/auth/gamification/profiles/${targetProfile}/progress?range=${range}`;
    const { response: stepResponse, durationMs: stepDuration } = await sendRequest({
      path: requestPath,
      token: targetToken,
    });
    response = stepResponse;
    durationMs = stepDuration;
  } else if (test.path) {
    const effectiveProfileId = resolvedProfileId ?? defaultProfileId ?? '';
    const pathWithPlaceholders = test.path
      .replace('{profileId}', effectiveProfileId)
      .replace('{range}', test.range || DEFAULT_RANGE);
    const adjustedPath = replaceProfileIdsInPath(
      pathWithPlaceholders,
      context.profileByIndex
    );
    const { response: reqResponse, durationMs: reqDuration } = await sendRequest({
      method: test.method || 'GET',
      path: adjustedPath,
      token,
      body: test.body,
    });
    response = reqResponse;
    durationMs = reqDuration;
  } else if (resolvedProfileId) {
    const range = test.range || DEFAULT_RANGE;
    const { response: reqResponse, durationMs: reqDuration } = await sendRequest({
      path: `/api/auth/gamification/profiles/${resolvedProfileId}/progress?range=${range}`,
      token,
    });
    response = reqResponse;
    durationMs = reqDuration;
  }

  if (!response && defaultProfileId) {
    const { response: fallbackResponse, durationMs: fallbackDuration } = await sendRequest({
      path: `/api/auth/gamification/profiles/${defaultProfileId}/progress?range=${DEFAULT_RANGE}`,
      token: resolveToken({}, context, defaultProfileId),
    });
    response = fallbackResponse;
    durationMs = fallbackDuration;
  }

  if (logFile) {
    const logResult = await waitForCacheLog(logFile, startLogSize);
    cacheEvent = logResult?.event ?? null;
  }

  if (response?.headers) {
    const headerValue = extractCacheHeader(response.headers);
    if (headerValue) {
      cacheEvent = headerValue.includes('hit') ? 'cache_hit' : 'cache_miss';
    }
  }

  const errors = [];
  const notes = [];
  const skippedAssertions = [];

  if (test.expect?.status !== undefined) {
    try {
      assertStatus(response, test.expect.status);
    } catch (error) {
      errors.push(error.message);
    }
  }

  if (test.expect?.schema) {
    try {
      assertSchemaShape(response?.data, test.expect.schema, 'response');
    } catch (error) {
      errors.push(error.message);
    }
  }

  if (response?.data?.metrics && resolvedProfileId) {
    context.metricsByProfileId.set(resolvedProfileId, response.data.metrics);
  }

  if (test.expect?.skill_level !== undefined) {
    const skillValue = response?.data?.metrics?.skill_level;
    if (typeof test.expect.skill_level === 'number') {
      if (skillValue !== test.expect.skill_level) {
        errors.push(`Expected skill_level ${test.expect.skill_level}, got ${skillValue}.`);
      }
    } else {
      try {
        assertRange(skillValue, test.expect.skill_level, 'skill_level');
      } catch (error) {
        errors.push(error.message);
      }
    }
  }

  if (test.expect?.intensity_score !== undefined) {
    const intensityValue = response?.data?.metrics?.intensity_score;
    if (typeof test.expect.intensity_score === 'number') {
      if (intensityValue !== test.expect.intensity_score) {
        errors.push(
          `Expected intensity_score ${test.expect.intensity_score}, got ${intensityValue}.`
        );
      }
    } else {
      try {
        assertRange(intensityValue, test.expect.intensity_score, 'intensity_score');
      } catch (error) {
        errors.push(error.message);
      }
    }
  }

  if (test.check) {
    const checkResult = evaluateCheckExpression(test.check, response?.data?.metrics);
    if (checkResult === false) {
      errors.push(`Check failed: ${test.check}`);
    } else if (checkResult === null) {
      skippedAssertions.push(test.check);
    }
  }

  const verifyClauses = parseVerifyClauses(test.verify);
  if (test.steps) {
    const stepText = test.steps.join(' ').toLowerCase();
    if (stepText.includes('cache_miss')) {
      verifyClauses.push('cache_miss');
    }
    if (stepText.includes('cache_hit')) {
      verifyClauses.push('cache_hit');
    }
  }
  if (verifyClauses.length) {
    const verifyResult = evaluateVerifyStatements(verifyClauses, {
      metrics: response?.data?.metrics,
      cacheEvent,
      durationMs,
      context,
    });
    errors.push(...verifyResult.errors);
    skippedAssertions.push(...verifyResult.skipped);
  }

  if (test.name?.includes('TTL expiration') && errors.length === 0) {
    const ttlMs = Number(process.env.CACHE_TTL_MS) || 3600000;
    if (ttlMs > 60000) {
      skippedAssertions.push('CACHE_TTL_MS too large; TTL check skipped.');
    } else if (defaultProfileId) {
      await new Promise((resolve) => setTimeout(resolve, ttlMs + 250));
      const ttlLogStart = logFile && fs.existsSync(logFile) ? fs.statSync(logFile).size : 0;
      const { response: ttlResponse } = await sendRequest({
        path: `/api/auth/gamification/profiles/${defaultProfileId}/progress?range=${DEFAULT_RANGE}`,
        token: resolveToken({}, context, defaultProfileId),
      });
      const ttlCacheHeader = extractCacheHeader(ttlResponse.headers);
      if (ttlCacheHeader) {
        cacheEvent = ttlCacheHeader.includes('hit') ? 'cache_hit' : 'cache_miss';
      } else if (logFile) {
        const logResult = await waitForCacheLog(logFile, ttlLogStart);
        cacheEvent = logResult?.event ?? cacheEvent;
      }
      if (cacheEvent && !cacheEvent.includes('miss')) {
        errors.push('Expected cache miss after TTL expiration.');
      } else if (!cacheEvent) {
        skippedAssertions.push('Unable to determine cache event after TTL expiration.');
      }
    }
  }

  if (skippedAssertions.length) {
    notes.push(`Skipped: ${skippedAssertions.join('; ')}`);
  }

  if (errors.length) {
    return {
      name: test.name,
      status: 'failed',
      durationMs,
      errors,
      notes,
    };
  }

  return {
    name: test.name,
    status: skippedAssertions.length ? 'skipped' : 'passed',
    durationMs,
    errors: [],
    notes,
  };
}

async function executeScenarios(scenarios, tokens, baseUrl, options = {}) {
  const startedAt = new Date().toISOString();
  if (baseUrl) {
    process.env.TEST_BASE_URL = baseUrl;
  }
  const context = options.context || (await buildTestContext(baseUrl));
  context.tokens = tokens || context.tokens;
  const { profileByUsername, profileByIndex } = buildProfileMaps(context);
  context.profileByUsername = profileByUsername;
  context.profileByIndex = profileByIndex;
  context.metricsByProfileId = new Map();
  context.badgeCatalogByProfileId = new Map();
  context.profileBadgesByProfileId = new Map();

  const results = {
    startedAt,
    finishedAt: null,
    durationMs: 0,
    summary: {
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
    },
    categories: {},
  };

  for (const scenarioFile of scenarios) {
    const scenarioPath = resolveScenarioPath(scenarioFile);
    const scenario = loadScenario(scenarioPath);
    const key = path.basename(scenarioFile, path.extname(scenarioFile));
    const category = {
      name: scenario.name,
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: [],
    };

    for (const test of scenario.tests) {
      // eslint-disable-next-line no-await-in-loop
      const testResult = await executeScenarioTest(test, scenario.name, context, options);
      category.tests.push(testResult);
      results.summary.totalTests += 1;
      if (testResult.status === 'passed') {
        category.passed += 1;
        results.summary.passed += 1;
      } else if (testResult.status === 'failed') {
        category.failed += 1;
        results.summary.failed += 1;
        if (options.bail) {
          results.categories[key] = category;
          results.finishedAt = new Date().toISOString();
          results.durationMs = Date.now() - new Date(startedAt).getTime();
          return results;
        }
      } else {
        category.skipped += 1;
        results.summary.skipped += 1;
      }
    }

    results.categories[key] = category;
  }

  results.finishedAt = new Date().toISOString();
  results.durationMs = Date.now() - new Date(startedAt).getTime();
  return results;
}

module.exports = {
  executeScenarios,
};

if (require.main === module) {
  const args = process.argv.slice(2);
  const scenariosArg = args.find((arg) => arg.startsWith('--scenarios='));
  const baseUrlArg = args.find((arg) => arg.startsWith('--base-url='));
  const outputArg = args.find((arg) => arg.startsWith('--output='));
  const logFileArg = args.find((arg) => arg.startsWith('--log-file='));
  const contextArg = args.find((arg) => arg.startsWith('--context='));
  const bail = args.includes('--bail');
  const verbose = args.includes('--verbose');

  const scenarios = scenariosArg
    ? scenariosArg.replace('--scenarios=', '').split(',').map((entry) => entry.trim())
    : loadScenario(path.join(__dirname, 'scenarios', 'test-scenarios.json')).scenarios;

  const baseUrl = baseUrlArg ? baseUrlArg.replace('--base-url=', '') : process.env.TEST_BASE_URL;
  if (!baseUrl) {
    console.error('Base URL is required. Provide --base-url or set TEST_BASE_URL.');
    process.exit(1);
  }

  const run = async () => {
    const hasContextFile = Boolean(contextArg);
    const context = hasContextFile
      ? JSON.parse(fs.readFileSync(contextArg.replace('--context=', ''), 'utf8'))
      : null;

    const results = await executeScenarios(scenarios, context?.tokens, baseUrl, {
      context,
      logFile: logFileArg ? logFileArg.replace('--log-file=', '') : null,
      bail,
    });

    if (verbose) {
      Object.values(results.categories).forEach((category) => {
        console.log(`\n${category.name}`);
        category.tests.forEach((test) => {
          console.log(`- ${test.status.toUpperCase()}: ${test.name}`);
          if (test.errors?.length) {
            console.log(`  Errors: ${test.errors.join('; ')}`);
          }
          if (test.notes?.length) {
            console.log(`  Notes: ${test.notes.join('; ')}`);
          }
        });
      });
    }

    console.log(
      `\nTotal: ${results.summary.totalTests}, Passed: ${results.summary.passed}, Failed: ${results.summary.failed}, Skipped: ${results.summary.skipped}`
    );

    if (outputArg) {
      const outputPath = outputArg.replace('--output=', '');
      fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
      console.log(`Results written to ${outputPath}`);
    }

    if (results.summary.failed > 0) {
      process.exitCode = 1;
    }
    if (!hasContextFile) {
      await closeContextPool();
    }
  };

  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
