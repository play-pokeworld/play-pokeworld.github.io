// Wave 41 — formal ESM module (neutral export {}): this file is LOADED
// as a module in prod (main.js) and exposes no lexical alias BY DESIGN
// — see the note below. Its surface is the runtime conditional placement.
// Engine-owned shared game state, exposed through the global object so every
// consumer (bundle chunks, classic boot, VM harnesses) reads and mutates ONE
// live binding. No lexical top-level aliases: a `const`/`let` here would
// shadow external harness bindings and silently stale after a save reload
// (assignGlobalState replaces the object identity through the same global).
if (typeof globalThis !== 'undefined') {
  if (typeof globalThis.G === 'undefined' && typeof window !== 'undefined') globalThis.G = window.PokeWorldState.gameState;
  if (typeof globalThis.battle === 'undefined' && typeof window !== 'undefined') globalThis.battle = window.PokeWorldBattleState.battleState;
  if (typeof globalThis.TYPES === 'undefined' && typeof window !== 'undefined') globalThis.TYPES = window.PokeWorldDomain.typeSystem.TYPES;
  if (typeof globalThis.TYPE_COLORS === 'undefined' && typeof window !== 'undefined') globalThis.TYPE_COLORS = window.PokeWorldDomain.typeSystem.TYPE_COLORS;
  if (typeof globalThis.CHART === 'undefined' && typeof window !== 'undefined') globalThis.CHART = window.PokeWorldDomain.typeSystem.TYPE_CHART;
  if (typeof globalThis.typeEff !== 'function') {
    globalThis.typeEff = function typeEff(atkType, defType1, defType2){
      return window.PokeWorldDomain.typeSystem.typeEffect(atkType, defType1, defType2);
    };
  }
  if (typeof globalThis.effText !== 'function') {
    globalThis.effText = function effText(mult){
      return window.PokeWorldDomain.typeSystem.effectivenessText(mult, (typeof t === 'function') ? t : undefined);
    };
  }
  // Boot-order backfill for window readers (i18n runs before this module).
  if (typeof window !== 'undefined') {
    if (typeof globalThis.G !== 'undefined' && !window.G) window.G = globalThis.G;
    if (typeof globalThis.battle !== 'undefined' && !window.battle) window.battle = globalThis.battle;
    if (typeof globalThis.TYPES !== 'undefined' && !window.TYPES) window.TYPES = globalThis.TYPES;
    if (typeof globalThis.TYPE_COLORS !== 'undefined' && !window.TYPE_COLORS) window.TYPE_COLORS = globalThis.TYPE_COLORS;
    if (typeof globalThis.CHART !== 'undefined' && !window.CHART) window.CHART = globalThis.CHART;
    if (typeof globalThis.typeEff !== 'undefined' && !window.typeEff) window.typeEff = globalThis.typeEff;
    if (typeof globalThis.effText !== 'undefined' && !window.effText) window.effText = globalThis.effText;
  }
}
if (typeof globalThis !== 'undefined' && !globalThis.safeStorage) {
  globalThis.safeStorage = (typeof window !== 'undefined' && window.safeStorage) || (typeof PokeWorldCore !== 'undefined' && PokeWorldCore.storage) || null;
}

export {};

