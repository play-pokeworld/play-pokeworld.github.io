import { describe, assert } from './TestRunner.js';
import { detectDownloadTarget } from '../src/ui/DownloadTarget.js';
import { DownloadOptionsView } from '../src/ui/downloads/DownloadOptionsView.js';
import { DownloadRules } from '../src/config/DownloadRules.js';
import { DownloadPromptModal } from '../src/panels/DownloadPromptModal.js';
import { ModalIds } from '../src/config/ModalIds.js';
import { ModalOpenRequestedEvent } from '../src/core/events/ModalOpenRequestedEvent.js';
import { EventBus } from '../src/core/EventBus.js';

describe('Platform-aware download options', (test) => {
  test('selects Windows, Android, iOS and fallback platforms', () => {
    assert.equal(detectDownloadTarget({ platform: 'Win32', userAgent: '', maxTouchPoints: 0 }), 'WINDOWS');
    assert.equal(detectDownloadTarget({ platform: 'Linux armv8l', userAgent: 'Android 15', maxTouchPoints: 5 }), 'ANDROID');
    assert.equal(detectDownloadTarget({ platform: 'iPhone', userAgent: 'iPhone OS 18', maxTouchPoints: 5 }), 'IOS');
    assert.equal(detectDownloadTarget({ platform: 'Linux x86_64', userAgent: '', maxTouchPoints: 0 }), 'OTHER');
  });

  test('the launch prompt opens from its typed modal request', () => {
    const modal = new DownloadPromptModal();
    EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.DOWNLOAD_PROMPT));
    assert.equal(modal.isOpen(), true);
    modal.close();
    modal.destroy();
  });

  test('offers platform copy, the releases page and the web game', () => {
    const view = new DownloadOptionsView({ target: 'WINDOWS' });
    const root = view.getDomElement();
    assert.ok(root.textContent.includes('Windows'));
    const links = [...root.querySelectorAll('a')];
    assert.equal(links.length, 2);
    assert.equal(links[0].getAttribute('href'), DownloadRules.RELEASES_URL);
    assert.equal(links[1].getAttribute('href'), DownloadRules.WEBSITE_URL);
    view.destroy();
  });
});
