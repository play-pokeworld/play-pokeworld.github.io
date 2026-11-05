/** @file PwaInstaller.js — enables the iOS home-screen web app without advertising a desktop PWA. */
export class PwaInstaller {
  static register() {
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (!isIOS || !('serviceWorker' in navigator) || location.protocol !== 'https:') return;
    const workerUrl = new URL('../../sw.js', import.meta.url);
    navigator.serviceWorker.register(workerUrl).catch(() => undefined);
  }
}
