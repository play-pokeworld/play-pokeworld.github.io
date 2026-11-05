/** @file UpdateSystem.js — checks the deployed same-origin version without touching the DOM. */
import { BaseSystem } from './BaseSystem.js';
import { GameConfig } from '../config/GameConfig.js';
import { UpdateRules } from '../config/UpdateRules.js';
import { EventBus } from '../core/EventBus.js';
import { UpdateAvailableEvent } from '../core/events/UpdateAvailableEvent.js';
import { UpdateBannerDismissedEvent } from '../core/events/UpdateBannerDismissedEvent.js';

/** Compare numeric dotted versions; malformed versions are never treated as newer. */
export function isNewerVersion(candidate, current) {
  const parse = (value) => typeof value === 'string' && /^\d+(?:\.\d+){1,3}$/.test(value)
    ? value.split('.').map(Number)
    : null;
  const next = parse(candidate);
  const installed = parse(current);
  if (!next || !installed) return false;
  const length = Math.max(next.length, installed.length);
  for (let index = 0; index < length; index++) {
    const difference = (next[index] ?? 0) - (installed[index] ?? 0);
    if (difference !== 0) return difference > 0;
  }
  return false;
}

export class UpdateSystem extends BaseSystem {
  static _instance = null;

  static getInstance() {
    if (!UpdateSystem._instance) UpdateSystem._instance = new UpdateSystem();
    return UpdateSystem._instance;
  }

  constructor() {
    super('UpdateSystem');
    this._timer = null;
    this._isChecking = false;
    this._isAvailable = false;
    this._isDismissed = false;
    this._unsubscribeDismiss = null;
  }

  init() {
    if (this._timer) return;
    this._unsubscribeDismiss = EventBus.getInstance().subscribe(UpdateBannerDismissedEvent, () => {
      this._isDismissed = true;
    });
    this._timer = setInterval(() => { void this.checkForUpdate(); }, UpdateRules.CHECK_INTERVAL_MS);
    void this.checkForUpdate();
  }

  async checkForUpdate() {
    if (this._isChecking || this._isAvailable || this._isDismissed || typeof fetch !== 'function') return;
    this._isChecking = true;
    try {
      const url = `${UpdateRules.VERSION_SOURCE_PATH}?${UpdateRules.CACHE_BUSTER_PARAM}=${Date.now()}`;
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) return;
      const source = await response.text();
      const match = source.match(/VERSION\s*:\s*['"](\d+(?:\.\d+){1,3})['"]/);
      const remoteVersion = match?.[1];
      if (remoteVersion && isNewerVersion(remoteVersion, GameConfig.VERSION)) {
        this._isAvailable = true;
        EventBus.getInstance().dispatch(new UpdateAvailableEvent(remoteVersion));
      }
    } catch {
      // Offline and file:// deployments simply retry on the next interval.
    } finally {
      this._isChecking = false;
    }
  }

  onDestroy() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
    this._unsubscribeDismiss?.();
    this._unsubscribeDismiss = null;
    super.onDestroy();
  }
}
