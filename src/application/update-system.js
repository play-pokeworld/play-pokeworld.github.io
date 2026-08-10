// Wave 41 — native ESM module.
// PokéWorld Update System — non-blocking background check for GitHub / remote deployment updates.
// Monitors ETag / Last-Modified fingerprint on location.href.

let _initialFingerprint = null;
let _updateCheckTimer = null;
let _checking = false;

export function initUpdateSystem(checkIntervalMs = 10 * 60 * 1000) {
  if (typeof location === 'undefined' || location.protocol === 'file:') return;

  fetchVersionFingerprint().then((fp) => {
    _initialFingerprint = fp;
  }).catch(() => {});

  if (_updateCheckTimer) clearInterval(_updateCheckTimer);
  _updateCheckTimer = setInterval(checkForAppUpdate, checkIntervalMs);

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkForAppUpdate();
      }
    });
  }
}

async function fetchVersionFingerprint() {
  try {
    const res = await fetch(location.href, {
      method: 'HEAD',
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });
    return res.headers.get('ETag') || res.headers.get('Last-Modified') || null;
  } catch (_) {
    return null;
  }
}

export async function checkForAppUpdate() {
  if (typeof G === 'undefined' || !G || G.updateAvailable || !_initialFingerprint || _checking) return;
  _checking = true;
  try {
    const currentFp = await fetchVersionFingerprint();
    if (currentFp && currentFp !== _initialFingerprint) {
      G.updateAvailable = true;
      if (typeof updateHeader === 'function') updateHeader();
      if (typeof window !== 'undefined' && window.EventBus && window.EventBus.emit) {
        window.EventBus.emit('app:update-available', { fingerprint: currentFp });
      }
    }
  } catch (_) {
  } finally {
    _checking = false;
  }
}

export function applyAppUpdate() {
  if (typeof location !== 'undefined') location.reload();
}

export function dismissAppUpdate() {
  if (typeof G !== 'undefined' && G) {
    G.updateBannerDismissed = true;
    if (typeof updateHeader === 'function') updateHeader();
  }
}

// Expose to classic surface for dataset action routing
if (typeof window !== 'undefined') {
  window.applyAppUpdate = applyAppUpdate;
  window.dismissAppUpdate = dismissAppUpdate;
  window.checkForAppUpdate = checkForAppUpdate;
}
if (typeof globalThis !== 'undefined') {
  globalThis.applyAppUpdate = applyAppUpdate;
  globalThis.dismissAppUpdate = dismissAppUpdate;
  globalThis.checkForAppUpdate = checkForAppUpdate;
}
