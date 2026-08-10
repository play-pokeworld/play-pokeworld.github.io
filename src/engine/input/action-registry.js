// PokeEngine Input — action registry (Unity-style command table).
//
// Owner of every addressable gameplay action: modules register their entry
// points by NAME once at load, the engine dispatcher resolves data-call /
// data-action strings through THIS table first (see action-dispatcher.js
// `callGlobal`). This replaces the historical window.* write per action —
// the engine owns the indirection, not the global object.
//
// Contract (mirrors the dispatcher globals version byte-for-byte):
//   PokeActions.register('basePlace', basePlace)  → named action stored
//   PokeActions.get('basePlace')                  → function | null
//   PokeActions.has('basePlace')                  → boolean
//   PokeActions.unregister('basePlace')           → boolean
//   PokeActions.size()                            → number
// Registration is last-write-wins with a dev warning when a DIFFERENT
// function replaces an existing name (collision = bug signal).
//
// Module kind: real engine ES module. The guarded globalThis exposure at
// the tail is the canonical service idiom — the dispatcher and the VM test
// harnesses (which evaluate classic files as text, without an import graph)
// reach the service that way.

const _actions = new Map();

function register(name, fn) {
  if (typeof name !== 'string' || !name || typeof fn !== 'function') return false;
  const prev = _actions.get(name);
  if (prev && prev !== fn) {
    try { console.warn('[PokeEngine] action overwritten:', name); } catch (_) {}
  }
  _actions.set(name, fn);
  return true;
}

function registerAll(map) {
  if (!map) return 0;
  let n = 0;
  for (const [name, fn] of Object.entries(map)) if (register(name, fn)) n++;
  return n;
}

function get(name) {
  return _actions.get(name) || null;
}

function has(name) {
  return _actions.has(name);
}

function unregister(name) {
  return _actions.delete(name);
}

function size() {
  return _actions.size;
}

export const PokeActions = Object.freeze({ register, registerAll, get, has, unregister, size });
export default PokeActions;

// Canonical guarded service exposure (dispatcher reads `typeof PokeActions`,
// harnesses may inject their own stub before evaluating classic files).
if (typeof window !== 'undefined') window.PokeActions = PokeActions;
if (typeof globalThis !== 'undefined') globalThis.PokeActions = PokeActions;
