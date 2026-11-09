import { describe, assert } from './TestRunner.js';
import { UpdateSystem, isNewerVersion } from '../src/systems/UpdateSystem.js';
import { EventBus } from '../src/core/EventBus.js';
import { UpdateAvailableEvent } from '../src/core/events/UpdateAvailableEvent.js';
import { UpdateBannerDismissedEvent } from '../src/core/events/UpdateBannerDismissedEvent.js';
import { UpdateBanner } from '../src/ui/UpdateBanner.js';
import { GameConfig } from '../src/config/GameConfig.js';

/* The fake remote version is derived from the shipped one: a new release used to break this test,
   which had to be edited by hand at every version bump. */
const NEXT_VERSION = (() => {
  const parts = String(GameConfig.VERSION).split('.').map((part) => Number(part) || 0);
  parts[parts.length - 1] += 1;
  return parts.join('.');
})();

describe('Update notifications', (test) => {
  test('compares dotted numeric versions safely', () => {
    assert.equal(isNewerVersion('1.16.24', '1.16.21'), true);
    assert.equal(isNewerVersion('1.17.0', '1.16.21'), true);
    assert.equal(isNewerVersion('1.16.21', '1.16.21'), false);
    assert.equal(isNewerVersion('1.16.20', '1.16.21'), false);
    assert.equal(isNewerVersion('latest', '1.16.21'), false);
  });

  test('shows and dismisses the localized banner through typed events', () => {
    const banner = new UpdateBanner();
    assert.equal(banner.isVisible(), false);
    const bus = EventBus.getInstance();
    bus.dispatch(new UpdateAvailableEvent('1.16.24'));
    assert.equal(banner.isVisible(), true);
    bus.dispatch(new UpdateBannerDismissedEvent());
    assert.equal(banner.isVisible(), false);
    banner.destroy();
  });

  test('publishes a newer same-origin version once', async () => {
    const originalFetch = globalThis.fetch;
    const events = [];
    const onUpdate = (event) => events.push(event);
    const bus = EventBus.getInstance();
    bus.subscribe(UpdateAvailableEvent, onUpdate);
    globalThis.fetch = async () => ({ ok: true, text: async () => `export const GameConfig = { VERSION: '${NEXT_VERSION}' };` });
    const system = new UpdateSystem();
    try {
      await system.checkForUpdate();
      await system.checkForUpdate();
      assert.equal(events.length, 1);
      assert.equal(events[0].version, NEXT_VERSION);
    } finally {
      system.onDestroy();
      bus.unsubscribe(UpdateAvailableEvent, onUpdate);
      globalThis.fetch = originalFetch;
    }
  });

  test('detects a newly deployed Pages commit regardless of its branch name', async () => {
    const originalFetch = globalThis.fetch;
    const events = [];
    let deploymentId = 'commit-before';
    const onUpdate = (event) => events.push(event);
    const bus = EventBus.getInstance();
    bus.subscribe(UpdateAvailableEvent, onUpdate);
    globalThis.fetch = async (url) => ({
      ok: true,
      text: async () => String(url).includes('deployment-id.js')
        ? `export const DeploymentInfo = { DEPLOYMENT_ID: '${deploymentId}' };`
        : "export const GameConfig = { VERSION: '1.16.28' };"
    });
    const system = new UpdateSystem();
    try {
      await system.checkForUpdate();
      assert.equal(events.length, 0);
      deploymentId = 'commit-after';
      await system.checkForUpdate();
      assert.equal(events.length, 1);
      assert.equal(events[0].version, 'commit-after');
    } finally {
      system.onDestroy();
      bus.unsubscribe(UpdateAvailableEvent, onUpdate);
      globalThis.fetch = originalFetch;
    }
  });
});
