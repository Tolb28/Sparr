const fs = require('fs');
const path = require('path');

function loadJson(filePath) {
  if (!filePath) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function formatDuration(ms) {
  if (ms >= 60000) {
    return `${Math.round(ms / 60000)} minutes`;
  }
  return `${Math.round(ms / 1000)} seconds`;
}

function formatCategoryResults(categories) {
  const output = {};
  Object.entries(categories).forEach(([key, category]) => {
    output[key] = {
      passed: category.passed,
      failed: category.failed,
      skipped: category.skipped,
    };
  });
  return output;
}

function buildMarkdownSummary({ report, performance }) {
  const lines = [];
  const statusLine =
    report.summary.failed === 0
      ? `✅ ALL PASSED (${report.summary.passed}/${report.summary.total_tests})`
      : `❌ FAILURES (${report.summary.failed} failed)`;

  lines.push('# Test Execution Summary', '');
  lines.push(`**Date**: ${report.timestamp}`);
  lines.push(`**Duration**: ${formatDuration(report.duration_ms)}`);
  lines.push(`**Status**: ${statusLine}`, '');
  lines.push('## Results by Category');

  Object.entries(report.categories).forEach(([key, category]) => {
    const total = category.passed + category.failed + category.skipped;
    const marker = category.failed === 0 ? '✅' : '❌';
    lines.push(`- ${key.replace(/_/g, ' ')}: ${category.passed}/${total} ${marker}`);
  });

  if (performance) {
    lines.push('', '## Performance Metrics');
    if (performance.concurrency_10) {
      lines.push(`- p50 (10 concurrent): ${performance.concurrency_10.p50}ms`);
    }
    if (performance.concurrency_50) {
      lines.push(`- p95 (50 concurrent): ${performance.concurrency_50.p95}ms`);
    }
    if (performance.concurrency_100) {
      lines.push(`- p99 (100 concurrent): ${performance.concurrency_100.p99}ms`);
    }
    if (performance.cache_hit_rate !== undefined) {
      lines.push(`- Cache hit rate: ${Math.round(performance.cache_hit_rate * 100)}%`);
    }
  }

  lines.push('', '## Issues');
  lines.push(report.summary.failed === 0 ? 'None detected.' : 'Failures detected. Review JSON report.');

  return `${lines.join('\n')}\n`;
}

function generateReport(results, performance, outputDir) {
  const timestamp = new Date().toISOString();
  const durationMs = results.durationMs || 0;
  const report = {
    timestamp,
    duration_ms: durationMs,
    summary: {
      total_tests: results.summary.totalTests,
      passed: results.summary.passed,
      failed: results.summary.failed,
      pass_rate: results.summary.totalTests
        ? Number((results.summary.passed / results.summary.totalTests).toFixed(2))
        : 0,
    },
    categories: formatCategoryResults(results.categories),
    performance: performance || {},
  };

  fs.mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(
    outputDir,
    `comprehensive-${timestamp.replace(/[:.]/g, '-')}.json`
  );
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const summaryPath = path.join(outputDir, 'SUMMARY.md');
  fs.writeFileSync(summaryPath, buildMarkdownSummary({ report, performance }));

  return { jsonPath, summaryPath };
}

module.exports = {
  generateReport,
};

if (require.main === module) {
  const args = process.argv.slice(2);
  const resultsArg = args.find((arg) => arg.startsWith('--results='));
  const performanceArg = args.find((arg) => arg.startsWith('--performance='));
  const outputArg = args.find((arg) => arg.startsWith('--output-dir='));

  if (!resultsArg) {
    console.error('Results file is required. Provide --results=path.');
    process.exit(1);
  }

  const results = loadJson(resultsArg.replace('--results=', ''));
  const performance = performanceArg
    ? loadJson(performanceArg.replace('--performance=', ''))
    : null;
  const outputDir =
    (outputArg && outputArg.replace('--output-dir=', '')) ||
    path.join(__dirname, '..', 'test-results');

  const { jsonPath, summaryPath } = generateReport(results, performance, outputDir);
  console.log(`Report JSON: ${jsonPath}`);
  console.log(`Summary Markdown: ${summaryPath}`);
}
