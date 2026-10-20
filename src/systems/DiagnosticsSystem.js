/**
 * @file DiagnosticsSystem.js
 * @brief Stores the latest browser errors without touching the DOM.
 */

import { BaseSystem } from './BaseSystem.js';
import { EventBus } from '../core/EventBus.js';
import { LocalStore } from '../core/LocalStore.js';
import { StorageKeys } from '../config/StorageKeys.js';
import { GameConfig } from '../config/GameConfig.js';
import { DiagnosticsChangedEvent } from '../core/events/DiagnosticsChangedEvent.js';

export const DIAGNOSTIC_LIMITS = Object.freeze({
  ERRORS: 50,
  MESSAGE_LENGTH: 300,
  CONTEXT_LENGTH: 200,
  STACK_LENGTH: 600
});

/** @param {*} value @param {number} limit @returns {string} */
function safeText(value, limit) {
  try {
    return String(value ?? '').slice(0, limit);
  } catch (_) {
    return '';
  }
}

/** @param {*} error @returns {{message:string, stack:string}} */
function describeError(error) {
  if (error instanceof Error) {
    return {
      message: `${error.name || 'Error'}: ${error.message || ''}`,
      stack: String(error.stack || '')
    };
  }
  if (error && typeof error === 'object') {
    const message = error.message || error.reason || error.type;
    let fallback = '';
    if (!message) {
      try {
        fallback = JSON.stringify(error).slice(0, DIAGNOSTIC_LIMITS.MESSAGE_LENGTH);
      } catch (_) {
        fallback = '[object]';
      }
    }
    return { message: String(message || fallback), stack: String(error.stack || '') };
  }
  return { message: safeText(error, DIAGNOSTIC_LIMITS.MESSAGE_LENGTH), stack: '' };
}

/** @param {*} context @returns {string} */
function describeContext(context) {
  if (context == null) return '';
  if (typeof context === 'string') return context.slice(0, DIAGNOSTIC_LIMITS.CONTEXT_LENGTH);
  try {
    return JSON.stringify(context).slice(0, DIAGNOSTIC_LIMITS.CONTEXT_LENGTH);
  } catch (_) {
    return safeText(context, DIAGNOSTIC_LIMITS.CONTEXT_LENGTH);
  }
}

function readStoredErrors() {
  const raw = LocalStore.getJson(StorageKeys.DIAGNOSTIC_ERRORS, []);
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry) => entry && typeof entry === 'object')
    .slice(-DIAGNOSTIC_LIMITS.ERRORS)
    .map((entry) => ({
      timestamp: Math.max(0, Number(entry.timestamp) || 0),
      build: safeText(entry.build || GameConfig.VERSION, 40),
      context: safeText(entry.context, DIAGNOSTIC_LIMITS.CONTEXT_LENGTH),
      message: safeText(entry.message, DIAGNOSTIC_LIMITS.MESSAGE_LENGTH),
      stack: safeText(entry.stack, DIAGNOSTIC_LIMITS.STACK_LENGTH)
    }));
}

export class DiagnosticsSystem extends BaseSystem {
  /** @private @type {DiagnosticsSystem|null} */
  static _instance = null;

  /** @returns {DiagnosticsSystem} */
  static getInstance() {
    if (!DiagnosticsSystem._instance) DiagnosticsSystem._instance = new DiagnosticsSystem();
    return DiagnosticsSystem._instance;
  }

  constructor() {
    super('DiagnosticsSystem', 'System');
    /** @private @type {Array<Object>} */
    this._errors = readStoredErrors();
    /** @private @type {WeakSet<object>} */
    this._seen = new WeakSet();
  }

  /** @returns {ReadonlyArray<Object>} Newest error is last. */
  getErrors() {
    return this._errors.map((entry) => ({ ...entry }));
  }

  /** @returns {number} */
  getErrorCount() {
    return this._errors.length;
  }

  /**
   * Records an error and keeps only the latest configured number of entries.
   * @param {*} error
   * @param {*} [context]
   * @returns {Readonly<Object>|null}
   */
  recordError(error, context = '') {
    if (error && typeof error === 'object') {
      if (this._seen.has(error)) return null;
      this._seen.add(error);
    }
    const described = describeError(error);
    const entry = Object.freeze({
      timestamp: Date.now(),
      build: GameConfig.VERSION,
      context: describeContext(context),
      message: safeText(described.message, DIAGNOSTIC_LIMITS.MESSAGE_LENGTH),
      stack: safeText(described.stack, DIAGNOSTIC_LIMITS.STACK_LENGTH)
    });
    this._errors.push(entry);
    if (this._errors.length > DIAGNOSTIC_LIMITS.ERRORS) {
      this._errors.splice(0, this._errors.length - DIAGNOSTIC_LIMITS.ERRORS);
    }
    this._persistAndNotify();
    return entry;
  }

  /** Clears stored browser errors. @returns {boolean} */
  clearErrors() {
    if (this._errors.length === 0) return false;
    this._errors = [];
    this._persistAndNotify();
    return true;
  }

  /** @private */
  _persistAndNotify() {
    LocalStore.setJson(StorageKeys.DIAGNOSTIC_ERRORS, this._errors);
    EventBus.getInstance().dispatch(new DiagnosticsChangedEvent(this._errors.length, DIAGNOSTIC_LIMITS.ERRORS));
  }
}
