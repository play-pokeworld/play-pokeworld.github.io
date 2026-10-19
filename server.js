/**
 * @file server.js
 * @brief Entry point of the zero-dependency local server (`node server.js` or start.bat).
 * Serves the game folder, finds a free port starting at 3000 and opens the browser.
 * Implementation lives in tools/server/; texts in src/localization/<lang>/server.js.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticFileServer } from './tools/server/StaticFileServer.js';
import { openBrowser } from './tools/server/BrowserLauncher.js';
import { loadServerMessages, format } from './tools/server/ServerMessages.js';

const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PORT = 3000;
const MAX_PORT_ATTEMPTS = 10;
const BIND_ADDRESS = '0.0.0.0';

const messages = await loadServerMessages(ROOT_DIR);

/**
 * Tries DEFAULT_PORT, then the next ports, until one is free.
 * @param {number} port
 * @param {number} attemptsLeft
 */
function startListening(port, attemptsLeft) {
  const server = createStaticFileServer(ROOT_DIR, messages);

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
      console.log(format(messages.port_busy, { port, next: port + 1 }));
      startListening(port + 1, attemptsLeft - 1);
      return;
    }
    if (err.code === 'EADDRINUSE') {
      console.error(format(messages.no_port_available, { first: DEFAULT_PORT, last: DEFAULT_PORT + MAX_PORT_ATTEMPTS }));
    } else {
      console.error(format(messages.server_error, { error: err.message }));
    }
    process.exit(1);
  });

  server.listen(port, BIND_ADDRESS, () => {
    const url = `http://localhost:${port}`;
    console.log(messages.banner_line);
    console.log(format(messages.server_running, { url }));
    console.log(messages.browser_opening);
    console.log(messages.stop_hint);
    console.log(messages.banner_line);
    if (!process.env.POKEWORLD_NO_BROWSER) {
      openBrowser(url, () => console.log(format(messages.open_manually, { url })));
    }
  });
}

startListening(DEFAULT_PORT, MAX_PORT_ATTEMPTS);
