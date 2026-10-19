/**
 * @file test_suite.js
 * @brief Entry point of the automated test suite (`npm test`).
 * Loads the fake DOM first, then every test module, then runs them.
 */

import { installFakeDom } from './tests/FakeDom.js';
import { runAll } from './tests/TestRunner.js';

installFakeDom();

// Game code logs localized debug lines; keep the test report readable unless VERBOSE is set.
if (!process.env.VERBOSE) {
  for (const level of ['log', 'info', 'warn', 'error', 'debug']) console[level] = () => {};
}

await import('./tests/StaticRules.test.js');
await import('./tests/Localization.test.js');
await import('./tests/Systems.test.js');
await import('./tests/GameData.test.js');
await import('./tests/DataLayer.test.js');
await import('./tests/BattleEngine.test.js');
await import('./tests/Catch.test.js');
await import('./tests/Trainers.test.js');
await import('./tests/Shop.test.js');
await import('./tests/UiWidgets.test.js');
await import('./tests/Dashboard.test.js');
await import('./tests/Launcher.test.js');

const { failed } = await runAll();
process.exit(failed ? 1 : 0);
