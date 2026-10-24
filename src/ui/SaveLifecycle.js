/**
 * @file SaveLifecycle.js
 * @brief Browser-only checkpoint adapter; reload/page-hide never abandons a live training DTO.
 */
import { EventBus } from '../core/EventBus.js';
import { SaveCheckpointRequestedEvent } from '../core/events/SaveCheckpointRequestedEvent.js';

export class SaveLifecycle {
  static _installed = false;
  /** Installs once. Duplicate unload/hidden events produce only one checkpoint. */
  static install() {
    if (this._installed || typeof window === 'undefined') return;
    this._installed = true;
    let flushed = false;
    const flush = () => {
      if (flushed) return;
      flushed = true;
      EventBus.getInstance().dispatch(new SaveCheckpointRequestedEvent());
    };
    window.addEventListener('beforeunload', flush);
    window.addEventListener('pagehide', flush);
    window.addEventListener('pageshow', () => { flushed = false; });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
      else flushed = false;
    });
  }
}
