// V7 · DBT-05 — LE résolveur de lien tardif (ex-`__pwV43Link`, dupliqué dans
// 21 fichiers). Un module chargé tôt peut appeler une fonction d'un module
// DIFFÉRÉ (écrans chargés à la demande par main.js : atoll, mine, pokédex,
// entraînement, pension, base secrète) : la résolution se fait À L'APPEL —
// registre moteur (PokeActions) d'abord, puis la surface globale (harnais VM).
//
//   pwLateLink('name')  → la fonction, ou null si le module n'est pas chargé
//   pwLateAlias('name') → une fonction d'appel qui résout à chaque appel
//
// Pour un symbole d'un module STATIQUE, on importe (ESM) — jamais ce fichier.
export function pwLateLink(name) {
  // Surface globale d'abord (c'est elle qu'un appel `name(...)` résout), puis
  // le registre moteur (modules qui s'enregistrent sans publier de globale).
  const g = typeof globalThis !== 'undefined' ? globalThis[name] : null;
  if (typeof g === 'function') return g;
  const reg =
    typeof PokeActions !== 'undefined' && PokeActions && typeof PokeActions.get === 'function'
      ? PokeActions.get(name)
      : null;
  return typeof reg === 'function' ? reg : null;
}

export function pwLateAlias(name) {
  return (...args) => {
    const f = pwLateLink(name);
    return f ? f(...args) : undefined;
  };
}

if (typeof window !== 'undefined') {
  window.pwLateLink = pwLateLink;
  window.pwLateAlias = pwLateAlias;
}
if (typeof globalThis !== 'undefined') {
  globalThis.pwLateLink = pwLateLink;
  globalThis.pwLateAlias = pwLateAlias;
}
