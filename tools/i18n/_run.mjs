import { installFakeDom } from '../../tests/FakeDom.js';
import { runAll } from '../../tests/TestRunner.js';
installFakeDom();
if (!process.env.VERBOSE) for (const level of ['log','info','warn','error','debug']) console[level] = () => {};
await import('../../tests/LocalizationRuntime.test.js');
await runAll();
