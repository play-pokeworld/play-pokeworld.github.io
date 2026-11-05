/** @file PwaInstaller.js — registers the update-aware web-app service worker. */
export class PwaInstaller {
  static register() {
    if (!('serviceWorker' in navigator) || location.protocol !== 'https:') return;
    const workerUrl = new URL('../../sw.js', import.meta.url);
    navigator.serviceWorker.register(workerUrl).catch(() => undefined);
  }
}
