/**
 * PokéWorld — build stamp (Wave 30, user feedback).
 *
 * The user opens the game through a LOCAL FILE (file:// → pw-bundle.js) and
 * several wave deliveries were chased by reports against a STALE extracted
 * copy ("4ème fois que je le dis" — the bug was already fixed in the
 * delivered zip). This stamp makes the running build UNAMBIGUOUS:
 *   - window.PW_BUILD for probes,
 *   - a `#pw-build-stamp` line at the bottom of the Settings modal
 *     (appended by openSettings), visible on any user screenshot.
 * Bump PW_BUILD at every delivery.
 */

export const PW_BUILD = 'w31 · 2026-08-07 22:41';

if (typeof window !== 'undefined') window.PW_BUILD = PW_BUILD;
if (typeof globalThis !== 'undefined') globalThis.PW_BUILD = PW_BUILD;

