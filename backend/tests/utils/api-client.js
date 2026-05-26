function getBaseUrl() {
  return process.env.TEST_BASE_URL || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
}

function buildUrl(path) {
  if (!path) {
    throw new Error('Path is required for API requests.');
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getBaseUrl()}${normalizedPath}`;
}

function normalizeHeaders(headers) {
  return Object.entries(headers || {}).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null) {
      acc[key] = value;
    }
    return acc;
  }, {});
}

async function request({ method = 'GET', path, token, headers = {}, body } = {}) {
  const finalHeaders = normalizeHeaders(headers);
  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  const init = { method, headers: finalHeaders };
  if (body !== undefined) {
    if (typeof body === 'string' || body instanceof Buffer) {
      init.body = body;
    } else if (body instanceof FormData) {
      init.body = body;
    } else {
      init.body = JSON.stringify(body);
      init.headers['Content-Type'] = 'application/json';
    }
  }

  const response = await fetch(buildUrl(path), init);
  const rawText = await response.text();
  let data = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch (error) {
    data = rawText;
  }

  return {
    status: response.status,
    ok: response.ok,
    headers: response.headers,
    data,
    raw: rawText,
  };
}

module.exports = {
  request,
  buildUrl,
  getBaseUrl,
};
