const fs = require('fs');
const path = require('path');

const ROUTE_SPECS = [
  {
    file: path.join(__dirname, '..', '..', 'src', 'routes', 'auth.ts'),
    routerName: 'router',
    prefix: '/api/auth',
    domain: 'auth',
    defaultAuth: false,
  },
  {
    file: path.join(__dirname, '..', '..', 'src', 'routes', 'training.ts'),
    routerName: 'router',
    prefix: '/api/auth/training',
    domain: 'training',
    defaultAuth: false,
  },
  {
    file: path.join(__dirname, '..', '..', 'src', 'routes', 'chat.ts'),
    routerName: 'chatRouter',
    prefix: '/api/auth/chat',
    domain: 'chat',
    defaultAuth: true,
  },
  {
    file: path.join(__dirname, '..', '..', 'src', 'routes', 'clubs.ts'),
    routerName: 'router',
    prefix: '/api/auth/clubs',
    domain: 'clubs',
    defaultAuth: false,
  },
  {
    file: path.join(__dirname, '..', '..', 'src', 'routes', 'gamification.ts'),
    routerName: 'router',
    prefix: '/api/auth/gamification',
    domain: 'gamification',
    defaultAuth: false,
  },
];

const INDEX_FILE = path.join(__dirname, '..', '..', 'src', 'index.ts');
const DEFAULT_MANIFEST_PATH = path.join(__dirname, 'endpoint-manifest.json');

function joinPaths(prefix, routePath) {
  if (!prefix.endsWith('/') && !routePath.startsWith('/')) {
    return `${prefix}/${routePath}`;
  }
  if (prefix.endsWith('/') && routePath.startsWith('/')) {
    return `${prefix}${routePath.slice(1)}`;
  }
  return `${prefix}${routePath}`;
}

function normalizeEndpointId(method, fullPath) {
  return `${method.toUpperCase()} ${fullPath}`
    .replace(/:([A-Za-z0-9_]+)/g, '{$1}')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractControllerName(rawArgs) {
  const noInlineComment = rawArgs.replace(/\/\/.*$/g, '');
  const parts = noInlineComment
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) {
    return null;
  }

  const last = parts[parts.length - 1];
  const match = last.match(/([A-Za-z_][A-Za-z0-9_]*)\s*$/);
  return match ? match[1] : null;
}

function parseRouteSpec(routeSpec) {
  const content = fs.readFileSync(routeSpec.file, 'utf8');
  const lines = content.split(/\r?\n/);
  const endpoints = [];
  const routePattern = new RegExp(
    `${routeSpec.routerName}\\.(get|post|put|delete|patch)\\(\\s*["'\`]([^"'\`]+)["'\`]\\s*(?:,\\s*(.*))?\\)\\s*;?`
  );

  const hasGlobalAuth =
    routeSpec.defaultAuth ||
    new RegExp(`${routeSpec.routerName}\\.use\\(\\s*authenticate\\s*\\)`).test(content);

  lines.forEach((line, index) => {
    const match = line.match(routePattern);
    if (!match) {
      return;
    }

    const method = match[1].toUpperCase();
    const routePath = match[2];
    const argsRaw = match[3] || '';
    const fullPath = joinPaths(routeSpec.prefix, routePath);
    const isAuth = hasGlobalAuth || /\bauthenticate\b/.test(argsRaw);
    const isMultipart = /\bupload\./.test(argsRaw);
    const controller = extractControllerName(argsRaw);
    const endpointId = normalizeEndpointId(method, fullPath);

    endpoints.push({
      id: endpointId,
      method,
      path: fullPath,
      routePath,
      domain: routeSpec.domain,
      auth: isAuth,
      multipart: isMultipart,
      mutating: ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method),
      controller,
      source: path.basename(routeSpec.file),
      line: index + 1,
    });
  });

  return endpoints;
}

function parseRootEndpoints() {
  const content = fs.readFileSync(INDEX_FILE, 'utf8');
  const lines = content.split(/\r?\n/);
  const routePattern = /app\.(get|post|put|delete|patch)\(\s*["'`]([^"'`]+)["'`]/;
  const endpoints = [];

  lines.forEach((line, index) => {
    const match = line.match(routePattern);
    if (!match) {
      return;
    }
    const method = match[1].toUpperCase();
    const routePath = match[2];
    const endpointId = normalizeEndpointId(method, routePath);
    endpoints.push({
      id: endpointId,
      method,
      path: routePath,
      routePath,
      domain: 'root',
      auth: false,
      multipart: false,
      mutating: ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method),
      controller: null,
      source: 'index.ts',
      line: index + 1,
    });
  });

  return endpoints;
}

function deduplicateAndSort(endpoints) {
  const deduped = new Map();
  endpoints.forEach((endpoint) => {
    deduped.set(endpoint.id, endpoint);
  });
  return [...deduped.values()].sort((a, b) => {
    if (a.path === b.path) {
      return a.method.localeCompare(b.method);
    }
    return a.path.localeCompare(b.path);
  });
}

function summarize(endpoints) {
  const byDomain = {};
  endpoints.forEach((endpoint) => {
    byDomain[endpoint.domain] = (byDomain[endpoint.domain] || 0) + 1;
  });
  return {
    total: endpoints.length,
    domains: byDomain,
  };
}

function buildEndpointManifest() {
  const endpoints = ROUTE_SPECS.flatMap(parseRouteSpec).concat(parseRootEndpoints());
  const manifest = deduplicateAndSort(endpoints);
  return {
    generatedAt: new Date().toISOString(),
    totalEndpoints: manifest.length,
    summary: summarize(manifest),
    endpoints: manifest,
  };
}

function writeManifest(filePath = DEFAULT_MANIFEST_PATH) {
  const manifest = buildEndpointManifest();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(manifest, null, 2));
  return manifest;
}

module.exports = {
  buildEndpointManifest,
  writeManifest,
  DEFAULT_MANIFEST_PATH,
};

if (require.main === module) {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const outputArg = args.find((arg) => arg.startsWith('--output='));
  const outputPath = outputArg
    ? outputArg.replace('--output=', '')
    : DEFAULT_MANIFEST_PATH;

  const manifest = write ? writeManifest(outputPath) : buildEndpointManifest();
  console.log(`Endpoints discovered: ${manifest.totalEndpoints}`);
  Object.entries(manifest.summary.domains).forEach(([domain, count]) => {
    console.log(`- ${domain}: ${count}`);
  });
  if (write) {
    console.log(`Manifest written to ${outputPath}`);
  }
}
