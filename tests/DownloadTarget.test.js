import { describe, assert } from './TestRunner.js';
import { detectDownloadTarget } from '../src/ui/DownloadTarget.js';
import { DownloadOptionsView } from '../src/ui/downloads/DownloadOptionsView.js';
import { DownloadRules } from '../src/config/DownloadRules.js';
import { DownloadPromptModal } from '../src/panels/DownloadPromptModal.js';
import { ModalIds } from '../src/config/ModalIds.js';
import { ModalOpenRequestedEvent } from '../src/core/events/ModalOpenRequestedEvent.js';
import { EventBus } from '../src/core/EventBus.js';

describe('Platform-aware direct download', (test) => {
  test('detects Windows, Android, iOS and fallback platforms', () => {
    assert.equal(detectDownloadTarget({ platform: 'Win32', userAgent: '', maxTouchPoints: 0 }), 'WINDOWS');
    assert.equal(detectDownloadTarget({ platform: 'Linux armv8l', userAgent: 'Android 15', maxTouchPoints: 5 }), 'ANDROID');
    assert.equal(detectDownloadTarget({ platform: 'iPhone', userAgent: 'iPhone OS 18', maxTouchPoints: 5 }), 'IOS');
    assert.equal(detectDownloadTarget({ platform: 'Linux x86_64', userAgent: '', maxTouchPoints: 0 }), 'OTHER');
  });

  test('provides one direct asset URL for Windows and Android', () => {
    const windows = new DownloadOptionsView({ target: 'WINDOWS' });
    const windowsLink = windows.getDomElement().querySelector('a');
    assert.equal(windowsLink.getAttribute('href'), DownloadRules.PLATFORM_DOWNLOAD_URLS.WINDOWS);
    assert.equal(windows.getDomElement().children.length, 1);
    windows.destroy();

    const android = new DownloadOptionsView({ target: 'ANDROID' });
    const androidLink = android.getDomElement().querySelector('a');
    assert.equal(androidLink.getAttribute('href'), DownloadRules.PLATFORM_DOWNLOAD_URLS.ANDROID);
    assert.equal(android.getDomElement().children.length, 1);
    android.destroy();
  });

  test('keeps the single iOS button disabled until an App Store/TestFlight URL exists', () => {
    const view = new DownloadOptionsView({ target: 'IOS' });
    const button = view.getDomElement().querySelector('button');
    assert.equal(button.hasAttribute('disabled'), true);
    assert.equal(view.getDomElement().children.length, 1);
    view.destroy();
  });

  test('the startup prompt responds to its typed modal request', () => {
    const modal = new DownloadPromptModal();
    EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.DOWNLOAD_PROMPT));
    assert.equal(modal.isOpen(), true);
    modal.close();
    modal.destroy();
  });
});
