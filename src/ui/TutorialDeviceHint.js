/**
 * @file TutorialDeviceHint.js
 * @brief UI-only device guidance appended to the steps whose window access differs on mobile.
 *
 * On a desktop the dashboard windows are always on screen, so the step text is enough. On a phone
 * the same windows sit behind the bottom bar, and that is the one thing a player cannot guess.
 * Keeping a hint per device and per kind used to repeat the step text on desktop ("click the card"
 * followed by "PC: click the card"), so only the mobile location hint remains.
 */
import { t } from '../localization/LocalizationManager.js';

/** Localization key of the one hint that is device-specific. */
const MAP_HINT_KEY = 'tutorial_hint_map_mobile';

/** @returns {boolean} true on touch-first devices, where the bottom bar replaces the dashboard */
function isTouchDevice() {
  if (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) return true;
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(pointer: coarse)').matches;
}

/** @returns {string} Mobile-only hint, empty on devices that show every window at once */
export function getTutorialDeviceHint() {
  return isTouchDevice() ? t(MAP_HINT_KEY) : '';
}
