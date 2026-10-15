/**
 * PokéWorld — diagnostics (V7 · P0a · OBS-01).
 *
 * Until now an exception in a progression path (quest claim, battle start,
 * capture, puzzle, save) died silently: 719 empty `catch(_){}` blocks and no
 * global hook. BUG-01 (every legendary encounter crashing on a ReferenceError)
 * stayed invisible for months for exactly that reason.
 *
 * This module keeps the LAST 50 errors in `G.diag.errors` (message, truncated
 * stack, context, build stamp, timestamp), hooks `window.onerror` +
 * `unhandledrejection`, and exposes a one-click "copy the error report"
 * action used by the Settings modal.
 *
 * Public surface (window/globalThis, classic consumers):
 *   pwReportError(err, ctx)   — record an error (ctx: free-form tag/object)
 *   getDiagErrors()           — the recorded list (newest last)
 *   buildErrorReport()        — plain-text report
 *   copyErrorReport()         — clipboard + notify
 *   clearDiagErrors()
 *
 * NB: the browser already defines `window.reportError` (WHATWG); the game
 * helper is therefore named `pwReportError` to avoid shadowing a web API.
 */

export const DIAG_MAX_ERRORS = 50;
export const DIAG_STACK_MAX = 600;

// Errors recorded before `G` exists (boot) wait here and are flushed later.
const _pending = [];
// Error objects already recorded by an explicit pwReportError() call — the
// global `error` hook skips them so a rethrown action error is counted once.
const _seen = new WeakSet();

function _g() {
  return typeof globalThis !== 'undefined' && globalThis.G && typeof globalThis.G === 'object'
    ? globalThis.G
    : null;
}

export function ensureDiag(G) {
  const g = G || _g();
  if (!g) return null;
  if (!g.diag || typeof g.diag !== 'object') g.diag = {};
  if (!Array.isArray(g.diag.errors)) g.diag.errors = [];
  if (_pending.length) {
    g.diag.errors.push(..._pending.splice(0, _pending.length));
    if (g.diag.errors.length > DIAG_MAX_ERRORS)
      g.diag.errors.splice(0, g.diag.errors.length - DIAG_MAX_ERRORS);
  }
  return g.diag;
}

function _describe(err) {
  if (err instanceof Error)
    return { msg: `${err.name || 'Error'}: ${err.message}`, stack: String(err.stack || '') };
  if (err && typeof err === 'object') {
    const msg = err.message || err.reason || err.type || '';
    try {
      return {
        msg: msg ? String(msg) : JSON.stringify(err).slice(0, 200),
        stack: String(err.stack || ''),
      };
    } catch (_) {
      return { msg: '[object]', stack: '' };
    }
  }
  return { msg: String(err), stack: '' };
}

function _ctxString(ctx) {
  if (ctx == null) return '';
  if (typeof ctx === 'string') return ctx;
  try {
    return JSON.stringify(ctx).slice(0, 200);
  } catch (_) {
    return String(ctx);
  }
}

/**
 * Record an error. Never throws.
 * @param {*} err      Error (or anything thrown)
 * @param {*} [ctx]    context tag — e.g. 'claimQuest', { action: 'claimQuest', qid: 31 }
 */
export function pwReportError(err, ctx) {
  try {
    if (err && typeof err === 'object') {
      if (_seen.has(err)) return null;
      _seen.add(err);
    }
    const { msg, stack } = _describe(err);
    const entry = {
      t: Date.now(),
      build: (typeof globalThis !== 'undefined' && globalThis.PW_BUILD) || '?',
      ctx: _ctxString(ctx),
      msg: msg.slice(0, 300),
      stack: stack.slice(0, DIAG_STACK_MAX),
    };
    const diag = ensureDiag();
    if (diag) {
      diag.errors.push(entry);
      if (diag.errors.length > DIAG_MAX_ERRORS)
        diag.errors.splice(0, diag.errors.length - DIAG_MAX_ERRORS);
    } else {
      _pending.push(entry);
      if (_pending.length > DIAG_MAX_ERRORS) _pending.splice(0, _pending.length - DIAG_MAX_ERRORS);
    }
    try {
      console.error('[PokeWorld]', entry.ctx ? `(${entry.ctx})` : '', entry.msg);
    } catch (_) {
      /* noop */
    }
    return entry;
  } catch (_) {
    return null;
  }
}

export function getDiagErrors() {
  const diag = ensureDiag();
  return diag ? diag.errors : _pending.slice();
}

export function clearDiagErrors() {
  const diag = ensureDiag();
  if (diag) diag.errors.length = 0;
  _pending.length = 0;
}

function _fmtDate(ts) {
  try {
    return new Date(ts).toISOString().replace('T', ' ').slice(0, 19);
  } catch (_) {
    return String(ts);
  }
}

export function buildErrorReport() {
  const g = _g();
  const errors = getDiagErrors();
  const lines = [];
  lines.push(`PokéWorld — rapport d'erreurs`);
  lines.push(`build: ${(typeof globalThis !== 'undefined' && globalThis.PW_BUILD) || '?'}`);
  lines.push(`date: ${_fmtDate(Date.now())}`);
  try {
    if (typeof navigator !== 'undefined' && navigator.userAgent)
      lines.push(`ua: ${navigator.userAgent}`);
  } catch (_) {
    /* noop */
  }
  if (g) {
    lines.push(
      `region: ${g.region || '?'} · lang: ${g.lang || '?'} · team: ${(g.team || []).length} · box: ${Object.keys(g.collection || {}).length}`
    );
    try {
      const ms = g.mainStep || {};
      lines.push(
        `mainStep: ${Object.keys(ms)
          .map((k) => `${k}=${ms[k]}`)
          .join(' ')}`
      );
    } catch (_) {
      /* noop */
    }
  }
  lines.push(`erreurs: ${errors.length} (max ${DIAG_MAX_ERRORS})`);
  lines.push('');
  errors.forEach((e, i) => {
    lines.push(`#${i + 1} [${_fmtDate(e.t)}] ${e.ctx ? `(${e.ctx}) ` : ''}${e.msg}`);
    if (e.stack)
      lines.push(
        e.stack
          .split('\n')
          .map((l) => '    ' + l.trim())
          .join('\n')
      );
  });
  return lines.join('\n');
}

export async function copyErrorReport() {
  const text = buildErrorReport();
  let ok = false;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      ok = true;
    }
  } catch (_) {
    ok = false;
  }
  if (!ok && typeof document !== 'undefined') {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      ok = !!document.execCommand('copy');
      document.body.removeChild(ta);
    } catch (_) {
      ok = false;
    }
  }
  try {
    const n = getDiagErrors().length;
    const tt =
      typeof globalThis !== 'undefined' && typeof globalThis.tr === 'function'
        ? globalThis.tr
        : null;
    const notify =
      typeof globalThis !== 'undefined' && typeof globalThis.notify === 'function'
        ? globalThis.notify
        : null;
    if (notify && tt)
      notify(
        tt(ok ? 'diag_report_copied' : 'diag_report_copy_failed', { n }),
        ok ? 'var(--green)' : 'var(--red)'
      );
  } catch (_) {
    /* noop */
  }
  return ok;
}

let _hooked = false;
export function installGlobalErrorHooks(target) {
  const w = target || (typeof window !== 'undefined' ? window : null);
  if (!w || _hooked || typeof w.addEventListener !== 'function') return false;
  _hooked = true;
  w.addEventListener('error', (ev) => {
    try {
      const err = ev && ev.error;
      if (err && typeof err === 'object') {
        pwReportError(err, 'window.onerror');
        return;
      }
      const msg = (ev && ev.message) || 'Script error';
      const where = ev && ev.filename ? ` @ ${ev.filename}:${ev.lineno || 0}:${ev.colno || 0}` : '';
      pwReportError(msg + where, 'window.onerror');
    } catch (_) {
      /* noop */
    }
  });
  w.addEventListener('unhandledrejection', (ev) => {
    try {
      pwReportError((ev && ev.reason) || 'unhandled rejection', 'unhandledrejection');
    } catch (_) {
      /* noop */
    }
  });
  return true;
}

// ── Classic surface ─────────────────────────────────────────────────────────
if (typeof globalThis !== 'undefined') {
  globalThis.pwReportError = pwReportError;
  globalThis.getDiagErrors = getDiagErrors;
  globalThis.buildErrorReport = buildErrorReport;
  globalThis.copyErrorReport = copyErrorReport;
  globalThis.clearDiagErrors = clearDiagErrors;
  globalThis.ensureDiag = ensureDiag;
}
if (typeof window !== 'undefined') {
  window.pwReportError = pwReportError;
  window.getDiagErrors = getDiagErrors;
  window.buildErrorReport = buildErrorReport;
  window.copyErrorReport = copyErrorReport;
  window.clearDiagErrors = clearDiagErrors;
  window.ensureDiag = ensureDiag;
  installGlobalErrorHooks(window);
}
