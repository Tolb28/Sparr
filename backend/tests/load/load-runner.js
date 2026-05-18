const path = require('path');
const { performance } = require('perf_hooks');
const { request } = require('../utils/api-client');
const { buildEndpointManifest, writeManifest, DEFAULT_MANIFEST_PATH } = require('./endpoint-manifest');
const { createAuthContext } = require('./auth-bootstrap');
const { analyzeServiceCoverage } = require('./service-coverage');
const { buildMarkdownReport, writeArtifacts } = require('./load-report');

const DEFAULT_OUTPUT_DIR = path.join(__dirname, '..', '..', 'test-results', 'load');
const DEFAULT_TIMEOUT_MS = Number(process.env.LOAD_TEST_TIMEOUT_MS) || 15000;
const DEFAULT_MAX_ERROR_RATE_PERCENT = Number(process.env.LOAD_TEST_MAX_ERROR_RATE_PERCENT) || 1;

const DEFAULT_PROFILES = {
  baseline: Number(process.env.LOAD_TEST_BASELINE_CONCURRENCY) || 5,
  spike: Number(process.env.LOAD_TEST_SPIKE_CONCURRENCY) || 20,
  stress: Number(process.env.LOAD_TEST_STRESS_CONCURRENCY) || 50,
};

function parseArgs(rawArgs) {
  const args = {};
  rawArgs.forEach((arg) => {
    if (!arg.startsWith('--')) {
      return;
    }
    const eqIndex = arg.indexOf('=');
    if (eqIndex === -1) {
      args[arg.slice(2)] = true;
    } else {
      const key = arg.slice(2, eqIndex);
      args[key] = arg.slice(eqIndex + 1);
    }
  });
  return args;
}

function percentile(values, p) {
  if (!values.length) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function round(value, digits = 2) {
  return Number(Number(value || 0).toFixed(digits));
}

function withTimeout(promise, timeoutMs) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    }),
  ]).finally(() => clearTimeout(timer));
}

function getPathParamValue(name, runtimeContext) {
  const map = {
    id: 1,
    profileId: runtimeContext.primaryProfileId,
    targetProfileId: runtimeContext.secondaryProfileId || runtimeContext.primaryProfileId,
    friendRequestId: runtimeContext.friendRequestId,
    postId: runtimeContext.postId,
    clubId: runtimeContext.clubId,
    requestId: runtimeContext.joinRequestId,
    trainingId: runtimeContext.trainingId,
    planId: runtimeContext.planId,
    calendarId: runtimeContext.calendarId,
    challengeId: runtimeContext.challengeId,
    conversationId: runtimeContext.conversationId,
    compId: runtimeContext.trainingComponentId,
    itemId: runtimeContext.calendarItemId,
    calId: runtimeContext.calendarId,
  };
  const value = map[name];
  if (value === undefined || value === null) {
    return 1;
  }
  return value;
}

function materializePath(pathTemplate, runtimeContext) {
  return pathTemplate.replace(/:([A-Za-z0-9_]+)/g, (_, paramName) =>
    String(getPathParamValue(paramName, runtimeContext))
  );
}

function buildBody(endpoint, runtimeContext, attemptIndex) {
  if (endpoint.method === 'GET' || endpoint.method === 'DELETE') {
    return undefined;
  }

  if (endpoint.path === '/api/auth/login') {
    return {
      email: runtimeContext.primaryEmail,
      password: runtimeContext.password,
    };
  }

  if (endpoint.path === '/api/auth/register') {
    return {
      email: `load_probe_${Date.now()}_${attemptIndex}@sparr.test`,
      password: runtimeContext.password,
    };
  }

  if (endpoint.path === '/api/auth/google/login') {
    return { idToken: 'invalid-load-test-token' };
  }

  if (endpoint.path === '/api/auth/google/conflict-decision') {
    return {
      decision: 'mine',
      conflictUserId: runtimeContext.primaryUserId || '00000000-0000-0000-0000-000000000000',
    };
  }

  if (endpoint.path === '/api/auth/user' && endpoint.method === 'PUT') {
    return { email: runtimeContext.primaryEmail };
  }

  return {};
}

function buildRequestSpec(endpoint, runtimeContext, attemptIndex) {
  const resolvedPath = materializePath(endpoint.path, runtimeContext);
  const body = endpoint.multipart ? new FormData() : buildBody(endpoint, runtimeContext, attemptIndex);

  if (endpoint.auth) {
    return {
      method: endpoint.method,
      path: resolvedPath,
      token: runtimeContext.primaryToken,
      headers: {
        'x-profile-id': String(runtimeContext.primaryProfileId),
      },
      body,
    };
  }

  return {
    method: endpoint.method,
    path: resolvedPath,
    token: null,
    headers: {},
    body,
  };
}

async function sendRequestWithMetrics(endpoint, runtimeContext, timeoutMs, attemptIndex) {
  const started = performance.now();
  const reqSpec = buildRequestSpec(endpoint, runtimeContext, attemptIndex);
  try {
    const response = await withTimeout(
      request({
        method: reqSpec.method,
        path: reqSpec.path,
        token: reqSpec.token || undefined,
        headers: reqSpec.headers,
        body: reqSpec.body,
      }),
      timeoutMs
    );
    const durationMs = performance.now() - started;
    return {
      ok: true,
      status: response.status,
      durationMs,
      transportError: false,
      serverError: response.status >= 500,
      data: response.data,
    };
  } catch (error) {
    const durationMs = performance.now() - started;
    return {
      ok: false,
      status: 0,
      durationMs,
      transportError: true,
      serverError: false,
      error: error.message,
    };
  }
}

async function runEndpointBatch(endpoint, runtimeContext, concurrency, timeoutMs, maxErrorRatePercent) {
  const requests = Array.from({ length: concurrency }, (_, index) =>
    sendRequestWithMetrics(endpoint, runtimeContext, timeoutMs, index)
  );
  const responses = await Promise.all(requests);

  const statusCounts = {};
  const durations = [];
  let transportErrors = 0;
  let serverErrors = 0;

  responses.forEach((res) => {
    durations.push(res.durationMs);
    if (res.transportError) {
      transportErrors += 1;
      return;
    }
    if (res.serverError) {
      serverErrors += 1;
    }
    statusCounts[res.status] = (statusCounts[res.status] || 0) + 1;
  });

  const total = responses.length;
  const errorRatePercent = total === 0 ? 0 : ((transportErrors + serverErrors) / total) * 100;

  return {
    endpointId: endpoint.id,
    endpoint,
    totalRequests: total,
    transportErrors,
    serverErrors,
    errorRatePercent: round(errorRatePercent),
    p50Ms: round(percentile(durations, 50)),
    p95Ms: round(percentile(durations, 95)),
    p99Ms: round(percentile(durations, 99)),
    avgMs: round(durations.reduce((sum, value) => sum + value, 0) / Math.max(durations.length, 1)),
    passed: errorRatePercent <= maxErrorRatePercent,
    statusCounts,
  };
}

function summarizeProfile(profileName, endpointResults, maxErrorRatePercent) {
  const totals = endpointResults.reduce(
    (acc, result) => {
      acc.totalRequests += result.totalRequests;
      acc.transportErrors += result.transportErrors;
      acc.serverErrors += result.serverErrors;
      acc.durations.push(result.p95Ms);
      acc.p99Durations.push(result.p99Ms);
      return acc;
    },
    {
      totalRequests: 0,
      transportErrors: 0,
      serverErrors: 0,
      durations: [],
      p99Durations: [],
    }
  );

  const errorRatePercent =
    totals.totalRequests === 0
      ? 0
      : ((totals.transportErrors + totals.serverErrors) / totals.totalRequests) * 100;

  return {
    profile: profileName,
    totalRequests: totals.totalRequests,
    transportErrors: totals.transportErrors,
    serverErrors: totals.serverErrors,
    errorRatePercent: round(errorRatePercent),
    p95Ms: round(percentile(totals.durations, 95)),
    p99Ms: round(percentile(totals.p99Durations, 99)),
    passed: errorRatePercent <= maxErrorRatePercent,
  };
}

function summarizeEndpoints(manifestEndpoints, profileResults) {
  const byEndpoint = new Map();

  profileResults.forEach((profileResult) => {
    profileResult.endpointResults.forEach((endpointResult) => {
      const key = endpointResult.endpointId;
      if (!byEndpoint.has(key)) {
        byEndpoint.set(key, []);
      }
      byEndpoint.get(key).push({
        profile: profileResult.profile,
        ...endpointResult,
      });
    });
  });

  return manifestEndpoints.map((endpoint) => {
    const entries = byEndpoint.get(endpoint.id) || [];
    const worst = [...entries].sort((a, b) => {
      if (b.errorRatePercent === a.errorRatePercent) {
        return b.p99Ms - a.p99Ms;
      }
      return b.errorRatePercent - a.errorRatePercent;
    })[0];

    if (!worst) {
      return {
        method: endpoint.method,
        path: endpoint.path,
        domain: endpoint.domain,
        auth: endpoint.auth,
        requests: 0,
        errorRatePercent: 0,
        p95Ms: 0,
        p99Ms: 0,
        worstProfile: '-',
        passed: false,
      };
    }

    return {
      method: endpoint.method,
      path: endpoint.path,
      domain: endpoint.domain,
      auth: endpoint.auth,
      requests: worst.totalRequests,
      errorRatePercent: worst.errorRatePercent,
      p95Ms: worst.p95Ms,
      p99Ms: worst.p99Ms,
      worstProfile: worst.profile,
      passed: entries.every((entry) => entry.passed),
    };
  });
}

async function runLoadTests(config) {
  if (config.baseUrl) {
    process.env.TEST_BASE_URL = config.baseUrl;
  }

  const manifest = config.writeManifest
    ? writeManifest(config.manifestPath || DEFAULT_MANIFEST_PATH)
    : buildEndpointManifest();

  const selectedDomains = config.domains.length ? new Set(config.domains) : null;
  const selectedMethods = config.methods.length
    ? new Set(config.methods.map((method) => method.toUpperCase()))
    : null;
  const filteredEndpoints = manifest.endpoints.filter((endpoint) => {
    const domainOk = selectedDomains ? selectedDomains.has(endpoint.domain) : true;
    const methodOk = selectedMethods ? selectedMethods.has(endpoint.method) : true;
    return domainOk && methodOk;
  });

  const requiresAuthContext = filteredEndpoints.some(
    (endpoint) =>
      endpoint.auth ||
      endpoint.path === '/api/auth/login' ||
      endpoint.path === '/api/auth/register'
  );

  let authBootstrapError = null;
  let authMode = 'unauthenticated-not-required';
  let authContext = {
    users: [],
    primaryUser: null,
    secondaryUser: null,
  };

  if (requiresAuthContext) {
    try {
      authContext = await createAuthContext(config.userCount);
      authMode = 'authenticated';
    } catch (error) {
      authBootstrapError = error instanceof Error ? error.message : String(error);
      if (!config.authFallback) {
        throw error;
      }
      authMode = 'fallback-unauthenticated';
    }
  }

  const runtimeContext = {
    primaryToken: authContext.primaryUser?.token || null,
    primaryEmail: authContext.primaryUser?.email || 'load_fallback@sparr.test',
    primaryUserId: authContext.primaryUser?.userId || null,
    primaryProfileId: authContext.primaryUser?.profileId || 1,
    secondaryProfileId:
      authContext.secondaryUser?.profileId || authContext.primaryUser?.profileId || 1,
    password: authContext.primaryUser?.password || process.env.LOAD_TEST_PASSWORD || 'LoadTestPass123!',
    postId: 1,
    friendRequestId: 1,
    joinRequestId: 1,
    clubId: 1,
    trainingId: 1,
    trainingComponentId: 1,
    calendarId: 1,
    calendarItemId: 1,
    challengeId: 1,
    conversationId: 1,
  };

  const profileEntries = Object.entries(config.profiles).filter(([, concurrency]) => concurrency > 0);
  const profileResults = [];
  for (const [profileName, concurrency] of profileEntries) {
    const endpointResults = [];
    for (const endpoint of filteredEndpoints) {
      // eslint-disable-next-line no-await-in-loop
      const result = await runEndpointBatch(
        endpoint,
        runtimeContext,
        concurrency,
        config.timeoutMs,
        config.maxErrorRatePercent
      );
      endpointResults.push(result);
    }
    profileResults.push({
      profile: profileName,
      concurrency,
      endpointResults,
    });
  }

  const profileSummary = profileResults.map((result) =>
    summarizeProfile(result.profile, result.endpointResults, config.maxErrorRatePercent)
  );
  const endpointSummaries = summarizeEndpoints(filteredEndpoints, profileResults);
  const serviceCoverage = analyzeServiceCoverage({ endpoints: filteredEndpoints });
  const overallPassed =
    profileSummary.every((entry) => entry.passed) &&
    endpointSummaries.every((entry) => entry.passed);

  const output = {
    generatedAt: new Date().toISOString(),
    config,
    manifest: {
      totalEndpoints: filteredEndpoints.length,
      domains: filteredEndpoints.reduce((acc, endpoint) => {
        acc[endpoint.domain] = (acc[endpoint.domain] || 0) + 1;
        return acc;
      }, {}),
    },
    authContext: {
      requiresAuthContext,
      mode: authMode,
      bootstrapError: authBootstrapError,
      userCount: authContext.users.length,
      primaryProfileId: runtimeContext.primaryProfileId,
      secondaryProfileId: runtimeContext.secondaryProfileId,
    },
    profileSummary,
    profileResults,
    endpointSummaries,
    serviceCoverage,
    overall: {
      passed: overallPassed,
      maxErrorRatePercent: config.maxErrorRatePercent,
    },
  };

  const markdown = buildMarkdownReport(output);
  const artifactPaths = writeArtifacts(config.outputDir, output, markdown);

  return {
    ...output,
    artifacts: artifactPaths,
  };
}

module.exports = {
  runLoadTests,
};

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  const config = {
    baseUrl: args['base-url'] || process.env.TEST_BASE_URL || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000',
    outputDir: args['output-dir'] || DEFAULT_OUTPUT_DIR,
    timeoutMs: Number(args['timeout-ms'] || DEFAULT_TIMEOUT_MS),
    maxErrorRatePercent: Number(args['max-error-rate'] || DEFAULT_MAX_ERROR_RATE_PERCENT),
    userCount: Number(args['users'] || process.env.LOAD_TEST_USER_COUNT || 3),
    domains: args.domains ? String(args.domains).split(',').map((part) => part.trim()) : [],
    methods: args.methods ? String(args.methods).split(',').map((part) => part.trim()) : [],
    authFallback: args['auth-fallback'] === undefined ? true : String(args['auth-fallback']).toLowerCase() !== 'false',
    writeManifest: Boolean(args['write-manifest']),
    manifestPath: args['manifest-path'] || DEFAULT_MANIFEST_PATH,
    profiles: {
      baseline: Number(args.baseline || DEFAULT_PROFILES.baseline),
      spike: Number(args.spike || DEFAULT_PROFILES.spike),
      stress: Number(args.stress || DEFAULT_PROFILES.stress),
    },
  };

  runLoadTests(config)
    .then((result) => {
      console.log(`Endpoint coverage: ${result.manifest.totalEndpoints}`);
      console.log(
        `Profile pass: ${result.profileSummary.filter((entry) => entry.passed).length}/${result.profileSummary.length}`
      );
      console.log(
        `Endpoint pass: ${result.endpointSummaries.filter((entry) => entry.passed).length}/${result.endpointSummaries.length}`
      );
      console.log(`Service coverage: ${result.serviceCoverage.coveredByEndpointControllers}/${result.serviceCoverage.totalExportedServiceFunctions}`);
      console.log(`JSON report: ${result.artifacts.jsonPath}`);
      console.log(`Markdown report: ${result.artifacts.markdownPath}`);
      if (!result.overall.passed) {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
