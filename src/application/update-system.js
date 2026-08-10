// Wave 41 — native ESM module.
// PokéWorld Update System — non-blocking background check for GitHub / remote deployment updates.
// Monitors ETag / Last-Modified fingerprint on location.href.

let _initialFingerprint = null;
let _updateCheckTimer = null;
let _checking = false;
let _updateAvailable = false;
let _bannerDismissed = false;

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
    const url = ((typeof location !== 'undefined' && location.pathname) ? location.pathname.split('#')[0].split('?')[0] : './index.html') + '?_t=' + Date.now();
    const res = await fetch(url, {
      method: 'HEAD',
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
    });
    const lm = res.headers.get('Last-Modified');
    if (lm) return 'lm:' + lm.trim();

    const etag = res.headers.get('ETag');
    if (etag) {
      const clean = etag.replace(/^W\//i, '').replace(/-(?:gzip|br|deflate)["']?$/i, '"').trim();
      return 'etag:' + clean;
    }
    return null;
  } catch (_) {
    return null;
  }
}

export async function checkForAppUpdate() {
  if (_updateAvailable || !_initialFingerprint || _checking) return;
  _checking = true;
  try {
    const currentFp = await fetchVersionFingerprint();
    if (currentFp && currentFp !== _initialFingerprint) {
      _updateAvailable = true;
      if (typeof G !== 'undefined' && G) G.updateAvailable = true;
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
  _updateAvailable = false;
  _bannerDismissed = false;
  if (typeof G !== 'undefined' && G) {
    delete G.updateAvailable;
    delete G.updateBannerDismissed;
  }
  if (typeof location !== 'undefined') {
    location.reload();
  }
}

export function dismissAppUpdate() {
  _bannerDismissed = true;
  if (typeof G !== 'undefined' && G) {
    G.updateBannerDismissed = true;
  }
  if (typeof updateHeader === 'function') updateHeader();
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
