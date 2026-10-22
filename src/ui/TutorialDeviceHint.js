/**
 * @file TutorialDeviceHint.js
 * @brief UI-only device guidance appended to the tutorial's relevant steps.
 */
import { t } from '../localization/LocalizationManager.js';

function isTouchDevice() {
  if (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) return true;
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(pointer: coarse)').matches;
}

/** @param {'map'|'sheet'} kind @returns {string} */
export function getTutorialDeviceHint(kind) {
  const device = isTouchDevice() ? 'mobile' : 'pc';
  const section = kind === 'sheet' ? 'sheet' : 'map';
  return t(`tutorial_hint_${section}_${device}`);
}
