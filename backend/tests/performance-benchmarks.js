const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

const { request } = require('./utils/api-client');
const { buildTestContext, closeContextPool } = require('./utils/test-context');

const DEFAULT_RANGE = 'week';
const CACHE_HEADER_KEYS = ['x-cache', 'x-cache-status', 'x-cache-hit'];
const CACHE_HIT_THRESHOLD_MS = Number(process.env.CACHE_HIT_THRESHOLD_MS) || 12;

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

function percentile(values, percentileValue) {
  if (!values.length) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
  return Math.round(sorted[Math.max(index, 0)]);
}

async function sendTimedRequest(path, token) {
  const start = performance.now();
  const response = await request({ path, token });
  const durationMs = performance.now() - start;
  return { response, durationMs };
}

async function runBatch({ concurrency, path, token }) {
  const results = await Promise.all(
    Array.from({ length: concurrency }, () => sendTimedRequest(path, token))
  );

  const durations = [];
  let errors = 0;
  let cacheHits = 0;

  results.forEach(({ response, durationMs }) => {
    durations.push(durationMs);
    if (!response?.ok) {
      errors += 1;
    }

    const headerValue = extractCacheHeader(response?.headers);
    if (headerValue) {
      if (headerValue.includes('hit')) {
        cacheHits += 1;
      }
    } else if (durationMs <= CACHE_HIT_THRESHOLD_MS) {
      cacheHits += 1;
    }
  });

  return {
    durations,
    errors,
    cacheHits,
    total: results.length,
  };
}

async function runBenchmarks({ baseUrl, profileId, token, outputPath }) {
  process.env.TEST_BASE_URL = baseUrl;
  const requestPath = `/api/auth/gamification/profiles/${profileId}/progress?range=${DEFAULT_RANGE}`;

  await sendTimedRequest(requestPath, token);

  const batches = [10, 50, 100];
  const summary = {};
  let totalHits = 0;
  let totalRequests = 0;

  for (const concurrency of batches) {
    // eslint-disable-next-line no-await-in-loop
    const batchResult = await runBatch({
      concurrency,
      path: requestPath,
      token,
    });
    totalHits += batchResult.cacheHits;
    totalRequests += batchResult.total;
    const errorRate = Number(((batchResult.errors / batchResult.total) * 100).toFixed(2));
    summary[`concurrency_${concurrency}`] = {
      p50: percentile(batchResult.durations, 50),
      p95: percentile(batchResult.durations, 95),
      p99: percentile(batchResult.durations, 99),
      error_rate: errorRate,
    };
  }

  const cacheHitRate = totalRequests ? Number((totalHits / totalRequests).toFixed(2)) : 0;

  const results = {
    ...summary,
    cache_hit_rate: cacheHitRate,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  return results;
}

module.exports = {
  runBenchmarks,
};

if (require.main === module) {
  const args = process.argv.slice(2);
  const contextArg = args.find((arg) => arg.startsWith('--context='));
  const baseUrlArg = args.find((arg) => arg.startsWith('--base-url='));
  const outputArg = args.find((arg) => arg.startsWith('--output='));
  const profileArg = args.find((arg) => arg.startsWith('--profile-id='));

  const run = async () => {
    const hasContextFile = Boolean(contextArg);
    const context = hasContextFile
      ? JSON.parse(fs.readFileSync(contextArg.replace('--context=', ''), 'utf8'))
      : await buildTestContext(baseUrlArg ? baseUrlArg.replace('--base-url=', '') : null);
    const baseUrl = baseUrlArg
      ? baseUrlArg.replace('--base-url=', '')
      : context.baseUrl;
    if (!baseUrl) {
      throw new Error('Base URL is required for benchmarks.');
    }

    const profileId = profileArg
      ? Number(profileArg.replace('--profile-id=', ''))
      : context.profiles[0]?.id;
    const token = context.tokens[profileId];
    if (!profileId || !token) {
      throw new Error('Valid profileId and token are required for benchmarks.');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath =
      outputArg?.replace('--output=', '') ||
      path.join(__dirname, '..', 'test-results', `benchmarks-${timestamp}.json`);

    await runBenchmarks({ baseUrl, profileId, token, outputPath });
    console.log(`Benchmark results written to ${outputPath}`);
    if (!hasContextFile) {
      await closeContextPool();
    }
  };

  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
