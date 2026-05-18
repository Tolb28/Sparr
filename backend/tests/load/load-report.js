const fs = require('fs');
const path = require('path');

function round(value, digits = 2) {
  return Number(Number(value || 0).toFixed(digits));
}

function writeArtifacts(outputDir, jsonData, markdown) {
  fs.mkdirSync(outputDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(outputDir, `load-results-${timestamp}.json`);
  const markdownPath = path.join(outputDir, `LOAD_SUMMARY-${timestamp}.md`);
  const latestMarkdownPath = path.join(outputDir, 'LOAD_SUMMARY.md');

  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
  fs.writeFileSync(markdownPath, markdown);
  fs.writeFileSync(latestMarkdownPath, markdown);

  return { jsonPath, markdownPath, latestMarkdownPath };
}

function buildProfileSummaryTable(profileSummary) {
  const header = '| Profile | Requests | Error rate % | p95 ms | p99 ms | Pass |\n|---|---:|---:|---:|---:|---|';
  const rows = profileSummary
    .map(
      (entry) =>
        `| ${entry.profile} | ${entry.totalRequests} | ${round(entry.errorRatePercent)} | ${round(entry.p95Ms)} | ${round(entry.p99Ms)} | ${entry.passed ? 'YES' : 'NO'} |`
    )
    .join('\n');
  return `${header}\n${rows}`;
}

function buildEndpointTable(endpointSummaries) {
  const header =
    '| Endpoint | Domain | Auth | Worst profile | Requests | Error rate % | p95 ms | p99 ms | Pass |\n|---|---|---|---|---:|---:|---:|---:|---|';
  const rows = endpointSummaries
    .map(
      (entry) =>
        `| \`${entry.method} ${entry.path}\` | ${entry.domain} | ${entry.auth ? 'yes' : 'no'} | ${entry.worstProfile} | ${entry.requests} | ${round(entry.errorRatePercent)} | ${round(entry.p95Ms)} | ${round(entry.p99Ms)} | ${entry.passed ? 'YES' : 'NO'} |`
    )
    .join('\n');
  return `${header}\n${rows}`;
}

function buildServiceCoverageTable(serviceCoverage, maxRows = 30) {
  const header = '| Service function | Covered by tested endpoint controller | Controllers |\n|---|---|---|';
  const rows = serviceCoverage
    .slice(0, maxRows)
    .map(
      (entry) =>
        `| \`${entry.serviceFile}#${entry.functionName}\` | ${entry.coveredByEndpointControllers ? 'YES' : 'NO'} | ${entry.referencedInControllers.join(', ') || '-'} |`
    )
    .join('\n');
  return `${header}\n${rows}`;
}

function buildMarkdownReport(results) {
  const lines = [];
  const overall = results.overall;
  const passLabel = overall.passed ? 'PASSED' : 'FAILED';

  lines.push('# API Load Test Summary');
  lines.push('');
  lines.push(`- **Generated**: ${results.generatedAt}`);
  lines.push(`- **Endpoint coverage**: ${results.manifest.totalEndpoints} endpoints`);
  lines.push(`- **Overall status**: ${passLabel}`);
  lines.push(`- **Allowed max error rate**: ${results.config.maxErrorRatePercent}%`);
  lines.push(`- **Auth execution mode**: ${results.authContext.mode}`);
  if (results.authContext.bootstrapError) {
    lines.push(`- **Auth bootstrap note**: ${results.authContext.bootstrapError}`);
    lines.push(
      '- **Important**: Authenticated business-flow reliability was not fully validated in this run; endpoints were still load-probed for transport/server robustness.'
    );
  }
  lines.push('');
  lines.push('## Profile summary');
  lines.push('');
  lines.push(buildProfileSummaryTable(results.profileSummary));
  lines.push('');
  lines.push('## Endpoint summary (worst profile per endpoint)');
  lines.push('');
  lines.push(buildEndpointTable(results.endpointSummaries));
  lines.push('');
  lines.push('## Service function coverage');
  lines.push('');
  lines.push(
    `- Covered service exports: ${results.serviceCoverage.coveredByEndpointControllers}/${results.serviceCoverage.totalExportedServiceFunctions}`
  );
  lines.push(
    `- Uncovered service exports: ${results.serviceCoverage.uncoveredByEndpointControllers}`
  );
  if (results.serviceCoverage.unresolvedControllers.length > 0) {
    lines.push(
      `- Unresolved controllers from route parsing: ${results.serviceCoverage.unresolvedControllers.join(', ')}`
    );
  }
  lines.push('');
  lines.push(buildServiceCoverageTable(results.serviceCoverage.serviceCoverage));
  lines.push('');
  lines.push(
    '> Note: Endpoint reliability pass/fail is based on transport errors/timeouts and HTTP 5xx rate. Expected 4xx validations are treated as handled responses.'
  );
  lines.push('');

  return `${lines.join('\n')}\n`;
}

module.exports = {
  writeArtifacts,
  buildMarkdownReport,
};
