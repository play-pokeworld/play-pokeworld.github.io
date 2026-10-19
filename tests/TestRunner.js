/**
 * @file TestRunner.js
 * @brief Tiny dependency-free test runner (C++ equivalent: a minimal gtest-like harness).
 * Test tooling is developer-facing and therefore exempt from the i18n rule.
 */

const groups = [];

/**
 * Declares a group of tests.
 * @param {string} name
 * @param {(test: (label: string, fn: () => (void|Promise<void>)) => void) => void} body
 */
export function describe(name, body) {
  const tests = [];
  body((label, fn) => tests.push({ label, fn }));
  groups.push({ name, tests });
}

/** Assertion helpers. */
export const assert = {
  ok(value, message = 'expected a truthy value') {
    if (!value) throw new Error(message);
  },
  equal(actual, expected, message = '') {
    if (actual !== expected) throw new Error(`${message} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`.trim());
  },
  deepEqual(actual, expected, message = '') {
    const a = JSON.stringify(actual);
    const b = JSON.stringify(expected);
    if (a !== b) throw new Error(`${message} expected ${b}, got ${a}`.trim());
  },
  empty(list, message = 'expected an empty list') {
    if (list.length) throw new Error(`${message}:\n      ${list.slice(0, 15).join('\n      ')}${list.length > 15 ? `\n      ... (+${list.length - 15})` : ''}`);
  },
  throws(fn, message = 'expected an exception') {
    try { fn(); } catch { return; }
    throw new Error(message);
  }
};

/**
 * Runs every declared group sequentially.
 * @returns {Promise<{passed: number, failed: number}>}
 */
export async function runAll() {
  let passed = 0;
  let failed = 0;
  for (const group of groups) {
    process.stdout.write(`\n${group.name}\n`);
    for (const { label, fn } of group.tests) {
      try {
        await fn();
        passed++;
        process.stdout.write(`  ok   ${label}\n`);
      } catch (error) {
        failed++;
        process.stdout.write(`  FAIL ${label}\n      ${error.message}\n`);
      }
    }
  }
  process.stdout.write(`\n${passed} passed, ${failed} failed\n`);
  return { passed, failed };
}
