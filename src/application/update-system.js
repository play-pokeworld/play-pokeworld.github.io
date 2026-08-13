// Wave 41 — native ESM module.
// PokéWorld Update System — non-blocking background check for GitHub / remote deployment updates.
// Monitors asset hashes, content hash, and HTTP headers on index.html.

let _initialFingerprint = null;
let _updateCheckTimer = null;
let _checking = false;
let _updateAvailable = false;
let _bannerDismissed = false;

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return String(h);
}

export function initUpdateSystem(checkIntervalMs = 60 * 1000) {
  if (typeof globalThis.location === 'undefined' || globalThis.location.protocol === 'file:') return;

  fetchVersionFingerprint().then((fp) => {
    if (fp) _initialFingerprint = fp;
  }).catch(() => {});

  if (_updateCheckTimer) clearInterval(_updateCheckTimer);
  _updateCheckTimer = setInterval(checkForAppUpdate, checkIntervalMs);

  if (typeof window !== 'undefined') {
    window.addEventListener('focus', () => {
      checkForAppUpdate();
    });
  }
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
    const url = 'index.html?_t=' + Date.now();
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
    });
    if (!res.ok) return null;
    const text = await res.text();
    const assetMatch = text.match(/assets\/[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.(?:js|css)/g);
    const assetStr = (assetMatch && assetMatch.length > 0) ? assetMatch.sort().join('|') : '';
    const etag = (res.headers.get('ETag') || '').replace(/^W\//i, '').replace(/-(?:gzip|br|deflate)["']?$/i, '"').trim();
    const lm = (res.headers.get('Last-Modified') || '').trim();
    return `h:${hashString(text)}|len:${text.length}|a:${assetStr}|etag:${etag}|lm:${lm}`;
  } catch (_) {
    return null;
  }
}

export async function checkForAppUpdate() {
  if (_updateAvailable || _checking) return;
  _checking = true;
  try {
    const currentFp = await fetchVersionFingerprint();
    if (!currentFp) return;
    if (!_initialFingerprint) {
      _initialFingerprint = currentFp;
      return;
    }
    if (currentFp !== _initialFingerprint) {
      _updateAvailable = true;
      if (typeof globalThis.G !== 'undefined' && globalThis.G) globalThis.G.updateAvailable = true;
      if (typeof globalThis.updateHeader === 'function') globalThis.updateHeader();
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
  if (typeof globalThis.G !== 'undefined' && globalThis.G) {
    delete globalThis.G.updateAvailable;
    delete globalThis.G.updateBannerDismissed;
  }
  if (typeof globalThis.location !== 'undefined') {
    globalThis.location.reload();
  }
}

export function dismissAppUpdate() {
  _bannerDismissed = true;
  if (typeof globalThis.G !== 'undefined' && globalThis.G) {
    globalThis.G.updateBannerDismissed = true;
  }
  if (typeof globalThis.updateHeader === 'function') globalThis.updateHeader();
}

export function resetUpdateBannerState() {
  _bannerDismissed = false;
}

// Expose to classic surface for dataset action routing
if (typeof window !== 'undefined') {
  window.applyAppUpdate = applyAppUpdate;
  window.dismissAppUpdate = dismissAppUpdate;
  window.checkForAppUpdate = checkForAppUpdate;
  window.resetUpdateBannerState = resetUpdateBannerState;
}
if (typeof globalThis !== 'undefined') {
  globalThis.applyAppUpdate = applyAppUpdate;
  globalThis.dismissAppUpdate = dismissAppUpdate;
  globalThis.checkForAppUpdate = checkForAppUpdate;
  globalThis.resetUpdateBannerState = resetUpdateBannerState;
}

