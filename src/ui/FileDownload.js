/**
 * @file FileDownload.js
 * @brief Saves a text payload as a file on the player's computer (C++: namespace FileDownload).
 * The only place allowed to create the temporary download link.
 */

import { UILink } from './UILink.js';

export class FileDownload {
  /**
   * @param {string} fileName
   * @param {string} content
   * @param {string} [mimeType='application/json']
   */
  static saveText(fileName, content, mimeType = 'application/json') {
    const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
    const link = new UILink({ href: url, external: false });
    link.setAttribute('download', fileName);
    link.getDomElement().click();
    link.destroy();
    URL.revokeObjectURL(url);
  }
}
