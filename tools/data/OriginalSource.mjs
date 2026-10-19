/**
 * @file OriginalSource.mjs
 * @brief Loads the data tables of the original game repository for the generators.
 * The original files are a mix of ES modules and classic scripts writing to `window`;
 * a `window` alias of the global object is installed before importing them.
 *
 * Usage: const source = new OriginalSource('<path to the original repository>');
 */

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

export class OriginalSource {
  /**
   * @param {string} root - Root folder of the original repository (contains src/data)
   */
  constructor(root) {
    this.root = path.resolve(root);
    this.dataDir = path.join(this.root, 'src', 'data');
    if (!fs.existsSync(this.dataDir)) throw new Error(`original data folder not found: ${this.dataDir}`);
    if (typeof globalThis.window === 'undefined') globalThis.window = globalThis;
  }

  /**
   * Imports a module of the original repository.
   * @param {string} relativePath - Path from the repository root (e.g. 'src/data/moves.js')
   * @returns {Promise<Object>} Module namespace
   */
  async module(relativePath) {
    return import(pathToFileURL(path.join(this.root, relativePath)).href);
  }

  /**
   * Reads a top-level `const NAME = { ... };` object literal of a file whose import has
   * side effects we do not want (e.g. combat code reading the game state).
   * @param {string} relativePath
   * @param {string} name
   * @returns {Object}
   */
  objectLiteral(relativePath, name) {
    const text = fs.readFileSync(path.join(this.root, relativePath), 'utf8');
    const start = text.search(new RegExp(`(?:export\\s+)?(?:const|var|let)\\s+${name}\\s*=\\s*\\{`));
    if (start < 0) throw new Error(`${name} not found in ${relativePath}`);
    const open = text.indexOf('{', start);
    let depth = 0;
    for (let i = open; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}' && --depth === 0) {
        // Plain data literal (numbers, strings, nested objects), evaluated in an empty scope.
        return Function(`"use strict"; return (${text.slice(open, i + 1)});`)();
      }
    }
    throw new Error(`unterminated ${name} in ${relativePath}`);
  }

  /** @returns {Promise<Array>} PD rows indexed by Pokédex number */
  async pokedexRows() {
    await this.module('src/data/pd-data.js');
    return globalThis.PD;
  }
}
