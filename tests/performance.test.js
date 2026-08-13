import test from 'node:test';
import assert from 'node:assert/strict';
import { createFrameScheduler } from '../src/core/performance.js';

test('createFrameScheduler coalesces repeated schedules', async () => {
  let calls = 0;
  const scheduler = createFrameScheduler(() => {
    calls += 1;
  });

  scheduler.schedule();
  scheduler.schedule();
  scheduler.schedule();
  await new Promise((resolve) => setTimeout(resolve, 25));

  assert.equal(calls, 1);
  scheduler.cancel();
});

test('createFrameScheduler can flush immediately', () => {
  let calls = 0;
  const scheduler = createFrameScheduler(() => {
    calls += 1;
  });

  scheduler.schedule();
  scheduler.flush();
  scheduler.flush();

  assert.equal(calls, 1);
  scheduler.cancel();
});


