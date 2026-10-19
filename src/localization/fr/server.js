/**
 * @file server.js (fr)
 * @brief Messages of the local server (console + HTTP errors). Used by tools/server/.
 */
export const server = {
  banner_line: '========================================================',
  server_running: ' PokéWorld tourne sur {url}',
  browser_opening: ' Ouverture du navigateur...',
  stop_hint: ' Appuyez sur Ctrl+C pour arrêter le serveur.',
  open_manually: '[Info] Ouvrez manuellement votre navigateur sur : {url}',
  port_busy: '[Info] Port {port} déjà utilisé, essai du port {next}...',
  no_port_available: '[Erreur] Aucun port disponible entre {first} et {last}.',
  server_error: '[Erreur] Le serveur a rencontré une erreur : {error}',
  http_bad_request: '400 Requête invalide',
  http_forbidden: '403 Accès refusé',
  http_not_found: '404 Introuvable : {path}',
  http_internal_error: '500 Erreur interne du serveur'
};
