// V7 · DBT-01 — Prettier a reformaté le code applicatif (src/**/*.js hors
// data/localization). Les tests « de contrat » qui lisent le SOURCE et y
// cherchent un fragment de code précis ne doivent pas dépendre de la mise en
// forme : on compare les deux côtés sans aucun blanc.
export const ws = (s) => String(s).replace(/\s+/g, '');

/** `src` contient `literal`, à la mise en forme près. */
export const wsIncludes = (src, literal) => ws(src).includes(ws(literal));

/** Position de `literal` dans `ws(src)` (−1 si absent). */
export const wsIndexOf = (src, literal, from = 0) => ws(src).indexOf(ws(literal), from);

/** Même regex, débarrassée de ses atomes « blanc » (` `, `\s*`, `\s+`, `\s?`, `\s`, `\n`, `\t`). */
export function wsRe(re) {
  const source = re.source.replace(/\\s[*+?]?|\\n[*+?]?|\\t[*+?]?| /g, '');
  return new RegExp(source, re.flags);
}

/** `re` matche `src`, à la mise en forme près. */
export const wsMatch = (src, re) => wsRe(re).test(ws(src));
