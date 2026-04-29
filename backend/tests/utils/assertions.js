function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed.');
  }
}

function assertStatus(response, expectedStatus) {
  assert(
    response && response.status === expectedStatus,
    `Expected status ${expectedStatus}, received ${response?.status}.`
  );
}

function assertRange(value, { min, max }, label = 'value') {
  if (min !== undefined) {
    assert(value >= min, `Expected ${label} >= ${min}, received ${value}.`);
  }
  if (max !== undefined) {
    assert(value <= max, `Expected ${label} <= ${max}, received ${value}.`);
  }
}

function assertHasKeys(target, keys, label = 'object') {
  assert(target && typeof target === 'object', `${label} must be an object.`);
  keys.forEach((key) => {
    assert(
      Object.prototype.hasOwnProperty.call(target, key),
      `${label} missing required key: ${key}`
    );
  });
}

function assertSchemaShape(target, schema, label = 'object') {
  if (!schema || typeof schema !== 'object') {
    return;
  }
  const keys = Object.keys(schema);
  assertHasKeys(target, keys, label);
}

module.exports = {
  assert,
  assertStatus,
  assertRange,
  assertHasKeys,
  assertSchemaShape,
};
