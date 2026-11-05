import { describe, assert } from './TestRunner.js';
import { UpdateSystem, isNewerVersion } from '../src/systems/UpdateSystem.js';
import { EventBus } from '../src/core/EventBus.js';
import { UpdateAvailableEvent } from '../src/core/events/UpdateAvailableEvent.js';
import { UpdateBannerDismissedEvent } from '../src/core/events/UpdateBannerDismissedEvent.js';
import { UpdateBanner } from '../src/ui/UpdateBanner.js';

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
    globalThis.fetch = async () => ({ ok: true, text: async () => "export const GameConfig = { VERSION: '1.16.25' };" });
    const system = new UpdateSystem();
    try {
      await system.checkForUpdate();
      await system.checkForUpdate();
      assert.equal(events.length, 1);
      assert.equal(events[0].version, '1.16.25');
    } finally {
      system.onDestroy();
      bus.unsubscribe(UpdateAvailableEvent, onUpdate);
      globalThis.fetch = originalFetch;
    }
  });
});
