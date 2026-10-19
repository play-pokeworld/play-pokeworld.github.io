/**
 * @file server.js (en)
 * @brief Messages of the local server (console + HTTP errors). Used by tools/server/.
 */
export const server = {
  banner_line: '========================================================',
  server_running: ' PokéWorld is running on {url}',
  browser_opening: ' Opening your browser...',
  stop_hint: ' Press Ctrl+C to stop the server.',
  open_manually: '[Info] Please open your browser manually on: {url}',
  port_busy: '[Info] Port {port} is already in use, trying port {next}...',
  no_port_available: '[Error] No free port between {first} and {last}.',
  server_error: '[Error] The server encountered an error: {error}',
  http_bad_request: '400 Bad Request',
  http_forbidden: '403 Forbidden',
  http_not_found: '404 Not Found: {path}',
  http_internal_error: '500 Internal Server Error'
};
