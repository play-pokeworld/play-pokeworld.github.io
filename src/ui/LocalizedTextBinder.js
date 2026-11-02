/**
 * @file LocalizedTextBinder.js
 * @brief Keeps every text the UI displays bound to its translation, and refreshes the whole live
 *        document when the player changes the language (C++ equivalent: a localized property binding).
 *
 * How it works
 * ------------
 * A widget that receives a `LocalizedText` (the string returned by `t()` / `compose()`) records the
 * *token* instead of only its current value. `LocalizationManager.resolve(token)` gives the text for
 * the active language, so a refresh is one re-resolution per binding: no view has to be rebuilt, and
 * no panel has to implement the language change itself.
 *
 * Where it is used (the widgets are the only place that writes text):
 *   - `UIText.setText` / `UIText.setRichText`                      → content
 *   - `UIPanel.setTitle`                                           → window title
 *   - `UIContainer.setText`                                        → plain label container
 *   - `UIElement.setAttribute` (title / aria-label / alt / placeholder) → tooltips and alternatives
 *   - `UIDropdown.setOptions`                                      → option labels
 *   - `UIProgressBar`                                              → "label: value / max"
 *   - `AppShell.setLanguage`                                       → triggers `refresh()`
 *
 * A value that is a plain string (a number, an id, a live count) is simply not bound: it keeps being
 * written by the view's own refresh, exactly as before.
 *
 * Memory: nodes are referenced through WeakRefs, so a destroyed view never keeps a binding alive;
 * `refresh()` prunes collected nodes. Binding is O(1); a refresh is O(number of bound texts).
 */

import { EventBus } from '../core/EventBus.js';
import { LanguageChangedEvent } from '../core/events/LanguageChangedEvent.js';
import { LocalizationManager } from '../localization/LocalizationManager.js';
import { isLocalizedText } from '../localization/LocalizedText.js';

/**
 * @typedef {Object} LocalizedBinding
 * @property {string|null} attribute - Attribute name, or null for the text content
 * @property {Function|null} render  - Custom writer `(node, resolvedText)` (rich text)
 * @property {any} token             - LocalizedText to resolve
 */

/** @type {WeakMap<HTMLElement, Map<string, LocalizedBinding>>} Bindings of one node, by slot. */
const NODE_BINDINGS = new WeakMap();

/** @type {Set<WeakRef<HTMLElement>>} Bound nodes, in binding order (pruned on refresh). */
const BOUND_NODES = new Set();

/** Slot key of the text content (attributes use their own name). */
const TEXT_SLOT = '';

/** The binder installs itself on the first binding: every language change refreshes the live UI. */
let installed = false;
function install() {
  if (installed) return;
  installed = true;
  EventBus.getInstance().subscribe(LanguageChangedEvent, () => LocalizedTextBinder.refresh());
}

export class LocalizedTextBinder {
  /**
   * Binds the text content of a node.
   * @param {HTMLElement} node
   * @param {any} token - A LocalizedText keeps the binding; any other value clears it
   * @param {Function|null} [render=null] - Custom writer for rich text
   */
  static bindText(node, token, render = null) {
    LocalizedTextBinder._bind(node, TEXT_SLOT, token, render);
  }

  /**
   * Binds an attribute of a node (title, aria-label, alt, placeholder).
   * @param {HTMLElement} node
   * @param {string} attribute
   * @param {any} token
   */
  static bindAttribute(node, attribute, token) {
    LocalizedTextBinder._bind(node, attribute, token, null);
  }

  /**
   * Drops the binding of one slot of a node (no slot = every slot).
   * @param {HTMLElement} node
   * @param {string|null} [attribute=null]
   */
  static release(node, attribute = null) {
    if (!node) return;
    const slots = NODE_BINDINGS.get(node);
    if (!slots) return;
    if (attribute === null) NODE_BINDINGS.delete(node);
    else slots.delete(attribute === 'text' ? TEXT_SLOT : attribute);
  }

  /**
   * Registers (or replaces) one binding.
   * @private
   * @param {HTMLElement} node
   * @param {string} slot
   * @param {any} token
   * @param {Function|null} render
   */
  static _bind(node, slot, token, render) {
    if (!node) return;
    install();
    let slots = NODE_BINDINGS.get(node);
    if (!isLocalizedText(token)) {
      if (slots) slots.delete(slot);
      return;
    }
    if (!slots) {
      slots = new Map();
      NODE_BINDINGS.set(node, slots);
      BOUND_NODES.add(new WeakRef(node));
    }
    slots.set(slot, { attribute: slot === TEXT_SLOT ? null : slot, render, token });
  }

  /**
   * Writes one binding with the text of the active language.
   * @private
   * @param {HTMLElement} node
   * @param {LocalizedBinding} binding
   */
  static _apply(node, binding) {
    const text = LocalizationManager.getInstance().resolve(binding.token);
    if (binding.render) {
      binding.render(node, text);
    } else if (binding.attribute) {
      if (node.getAttribute(binding.attribute) !== text) node.setAttribute(binding.attribute, text);
    } else if (node.textContent !== text) {
      node.textContent = text;
    }
  }

  /**
   * Re-resolves every live binding in the active language.
   * Called once per language change by `AppShell`; no view code is involved.
   * @returns {number} Number of texts written (diagnostics and tests)
   */
  static refresh() {
    let written = 0;
    for (const reference of BOUND_NODES) {
      const node = reference.deref();
      if (!node) {
        BOUND_NODES.delete(reference);
        continue;
      }
      const slots = NODE_BINDINGS.get(node);
      if (!slots) {
        BOUND_NODES.delete(reference);
        continue;
      }
      // A node removed from the document keeps its value until it is collected.
      if (node.isConnected === false) continue;
      for (const binding of slots.values()) {
        LocalizedTextBinder._apply(node, binding);
        written++;
      }
    }
    return written;
  }

  /** @returns {number} Number of live bindings (diagnostics and tests). */
  static getBindingCount() {
    let count = 0;
    for (const reference of BOUND_NODES) {
      const slots = reference.deref() ? NODE_BINDINGS.get(reference.deref()) : null;
      if (slots) count += slots.size;
    }
    return count;
  }

  /** Forgets every binding (tests only). */
  static reset() {
    BOUND_NODES.clear();
  }
}
