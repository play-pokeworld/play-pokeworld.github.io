/**
 * @file MimeTypes.js
 * @brief File extension -> Content-Type table used by the local static server.
 */

const MIME_TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg'
});

const DEFAULT_MIME_TYPE = 'application/octet-stream';

/**
 * @param {string} extension - Lower-case extension including the dot (e.g. '.png')
 * @returns {string}
 */
export function mimeTypeFor(extension) {
  return MIME_TYPES[extension] || DEFAULT_MIME_TYPE;
}
