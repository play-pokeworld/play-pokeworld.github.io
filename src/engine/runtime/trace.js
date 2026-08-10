// PokeEngine Runtime — trace/telemetry service (antifragile measurement wave).
//
// Pure OBSERVER: beacons call PokeTrace.hit(kind, name, meta?) at entry
// points (init, dispatch, renders, battle tick, offline heartbeat, saves,
// events, timers). NOTHING here alters control flow, state or rendering:
// every call is try/catch-armored, allocations are bounded, and the whole
// service can be silenced with localStorage 'pokeworld_trace' = '0'.
//
// Output: counters per (kind, name) and per kind, first/last timestamps,
// inter-call interval stats for high-frequency kinds (battle tick, timers),
// plus a bounded ring of the latest events (param KEYS only — never values,
// so a dump never leaks save content). report() returns a plain object the
// harness serializes to reports/trace-live.json.

const RING_CAP = 2000;
const INTERVAL_KINDS = new Set(['tick', 'timer', 'render']);

const _ring = new Array(RING_CAP);
let _ringIdx = 0;
let _ringLen = 0;
let _seq = 0;
const _byKindName = new Map();     // 'kind|name' -> { n, first, last }
const _byKind = new Map();         // kind -> { n, first, last, lastTs, minGap, maxGap, sumGap, gaps }
let _enabled = true;
let _t0 = 0;

try {
  _enabled = (typeof localStorage === 'undefined') || localStorage.getItem('pokeworld_trace') !== '0';
} catch (_) { /* measurement must never disturb the app */ }

try { _t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); } catch (_) { _t0 = 0; }

function _now() {
  try { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); } catch (_) { return 0; }
}

function _bump(kind, name, t) {
  const kn = kind + '|' + name;
  let e = _byKindName.get(kn);
  if (!e) { e = { n: 0, first: t, last: t }; _byKindName.set(kn, e); }
  e.n++; e.last = t;

  let k = _byKind.get(kind);
  if (!k) { k = { n: 0, first: t, last: t, lastTs: 0, minGap: Infinity, maxGap: 0, sumGap: 0, gaps: 0 }; _byKind.set(kind, k); }
  k.n++; k.last = t;
  if (INTERVAL_KINDS.has(kind)) {
    if (k.lastTs > 0) {
      const gap = t - k.lastTs;
      k.minGap = Math.min(k.minGap, gap); k.maxGap = Math.max(k.maxGap, gap);
      k.sumGap += gap; k.gaps++;
    }
    k.lastTs = t;
  }
}

function hit(kind, name, meta) {
  if (!_enabled) return;
  try {
    const t = _now();
    _seq++;
    _ring[_ringIdx] = { seq: _seq, t: +(t || 0).toFixed(2), kind, name,
      src: (meta && meta.src) || undefined,
      via: (meta && meta.via) || undefined,
      keys: (meta && meta.keys) || undefined };
    _ringIdx = (_ringIdx + 1) % RING_CAP;
    _ringLen = Math.min(_ringLen + 1, RING_CAP);
    _bump(kind, name, t);
  } catch (_) { /* armored */ }
}

// Counters-only variant for high-frequency kinds (events, battle tick):
// identical metrics, zero ring churn.
function count(kind, name) {
  if (!_enabled) return;
  try { _seq++; _bump(kind, name, _now()); } catch (_) { /* armored */ }
}

function counts() {
  const kinds = {};
  for (const [kind, k] of _byKind) {
    kinds[kind] = { n: k.n, firstAt: +k.first.toFixed(2), lastAt: +k.last.toFixed(2) };
    if (INTERVAL_KINDS.has(kind) && k.gaps > 0) {
      kinds[kind].gapMs = { min: +k.minGap.toFixed(2), avg: +(k.sumGap / k.gaps).toFixed(2), max: +k.maxGap.toFixed(2), samples: k.gaps };
    }
  }
  const names = {};
  for (const [kn, e] of _byKindName) names[kn] = { n: e.n, firstAt: +e.first.toFixed(2), lastAt: +e.last.toFixed(2) };
  return { kinds, names, total: _seq, ringFill: _ringLen, t0: +_t0.toFixed(2) };
}

function events(limit) {
  const n = Math.min(limit || 50, _ringLen);
  const out = [];
  for (let i = 0; i < n; i++) out.push(_ring[(_ringIdx - n + i + RING_CAP) % RING_CAP]);
  return out;
}

function report() {
  return { service: 'PokeTrace', enabled: _enabled, summary: counts(), tail: events(60) };
}

function reset() {
  _ring.fill(undefined); _ringIdx = 0; _ringLen = 0; _seq = 0;
  _byKindName.clear(); _byKind.clear();
}

export const PokeTrace = Object.freeze({ hit, count, counts, events, report, reset });
export default PokeTrace;

// Canonical guarded exposure: classic call-sites are not ES modules (VM
// harnesses evaluate them as text) — they observe PokeTrace if present.
if (typeof window !== 'undefined') window.PokeTrace = PokeTrace;
if (typeof globalThis !== 'undefined') globalThis.PokeTrace = PokeTrace;
