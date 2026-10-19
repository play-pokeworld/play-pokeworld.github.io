/**
 * @file StaticFileServer.js
 * @brief Zero-dependency HTTP handler serving the game folder (ES modules, assets, fonts).
 * Requests are confined to the root directory (no path traversal).
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { mimeTypeFor } from './MimeTypes.js';

const INDEX_FILE = '/index.html';

/**
 * Resolves a URL pathname to an absolute file path inside rootDir, or null if it escapes it.
 * @param {string} rootDir
 * @param {string} pathname
 * @returns {string|null}
 */
function resolveSafePath(rootDir, pathname) {
  const target = path.resolve(rootDir, '.' + path.posix.normalize(pathname));
  const relative = path.relative(rootDir, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return target;
}

/**
 * @param {string} rootDir - Absolute directory to serve
 * @param {Object} messages - Localized server messages (see src/localization/<lang>/server.js)
 * @returns {http.Server}
 */
export function createStaticFileServer(rootDir, messages) {
  return http.createServer((req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch (_) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(messages.http_bad_request);
      return;
    }
    if (pathname === '/' || pathname === '') pathname = INDEX_FILE;

    const filePath = resolveSafePath(rootDir, pathname);
    if (!filePath) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(messages.http_forbidden);
      return;
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(messages.http_not_found.replace('{path}', pathname));
        return;
      }

      res.writeHead(200, {
        'Content-Type': mimeTypeFor(path.extname(filePath).toLowerCase()),
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });

      const stream = fs.createReadStream(filePath);
      stream.on('error', () => {
        if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(messages.http_internal_error);
      });
      stream.pipe(res);
    });
  });
}
