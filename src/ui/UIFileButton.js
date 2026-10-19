/**
 * @file UIFileButton.js
 * @brief Button opening the native file picker (C++ equivalent: class UIFileButton : public UIElement).
 * Wraps the `<label for>` + hidden `<input type="file">` pair and reads the chosen file as text.
 */

import { UIElement } from './UIElement.js';
import { UIText } from './UIText.js';

export class UIFileButton extends UIElement {
  /**
   * @param {Object} [options={}]
   * @param {string} options.id              - Label id (the input gets `${inputId}`)
   * @param {string} options.inputId         - Hidden file input id
   * @param {string} [options.text='']       - Localized label
   * @param {string} [options.accept='']     - Accepted MIME types / extensions
   * @param {string} [options.className='']
   * @param {Function} [options.onFileRead=null]  - (content: string, file: File) => void
   * @param {Function} [options.onReadError=null] - (error) => void
   */
  constructor(options = {}) {
    super({
      tagName: 'label',
      className: `pw-file-btn ${options.className || ''}`.trim(),
      id: options.id,
      name: options.name || 'UIFileButton',
      tag: 'FileButton'
    });

    this._onFileRead = options.onFileRead || null;
    this._onReadError = options.onReadError || null;

    this._label = this.addChild(new UIText({ text: options.text ?? '', className: 'pw-file-btn-text' }));

    // The native input is a private implementation detail of this widget.
    this._input = document.createElement('input');
    this._input.type = 'file';
    this._input.className = 'pw-file-btn-input';
    if (options.inputId) {
      this._input.id = options.inputId;
      this._dom.setAttribute('for', options.inputId);
    }
    if (options.accept) this._input.accept = options.accept;
    this._dom.appendChild(this._input);

    this._input.addEventListener('change', () => this._readSelectedFile());
  }

  /** @returns {UIText} */
  get text() {
    return this._label;
  }

  /** @param {string} text */
  setText(text) {
    this._label.setText(text);
  }

  /** @private */
  _readSelectedFile() {
    const file = this._input.files && this._input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (this._onFileRead) this._onFileRead(String(event.target.result || ''), file);
    };
    reader.onerror = (err) => {
      if (this._onReadError) this._onReadError(err);
    };
    reader.readAsText(file);

    // Reset so selecting the same file twice still triggers "change".
    this._input.value = '';
  }
}
