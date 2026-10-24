/** @file UIKeyedList.js @brief Keyed component reconciliation; unchanged items retain nodes and focus. */
import { UIContainer } from './UIContainer.js';

export class UIKeyedList extends UIContainer {
  /** @param {{className?:string,create:Function,update:Function,key?:Function}} options */
  constructor(options) {
    super({ className: options.className || '', name: 'UIKeyedList' });
    this._createEntry = options.create;
    this._updateEntry = options.update;
    this._getKey = options.key || ((entry) => entry.index);
    this._entries = new Map();
  }
  /** @param {Object[]} entries */
  setEntries(entries) {
    const keys = new Set(entries.map((entry) => this._getKey(entry)));
    for (const [key, widget] of this._entries) if (!keys.has(key)) {
      this.removeChild(widget); widget.destroy(); this._entries.delete(key);
    }
    entries.forEach((entry, index) => {
      const key = this._getKey(entry);
      if (!this._entries.has(key)) this._entries.set(key, this._createEntry(entry));
      const widget = this._entries.get(key);
      const current = this.getChildren()[index];
      if (current !== widget) this.insertChildBefore(widget, current);
      this._updateEntry(widget, entry);
    });
  }
}
