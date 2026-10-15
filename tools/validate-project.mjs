import fs from 'node:fs';
import path from 'node:path';

const required = [
  'index.html',
  'src/main.js',
  'src/data/sprites.js',
  'src/assets/styles/design-system.css',
];
const missing = required.filter((file) => !fs.existsSync(path.resolve(file)));
if (missing.length) {
  console.error('Missing required files:', missing.join(', '));
  process.exit(1);
}
console.log('Project structure OK');

// Wave 39 — HTML-write sink contract: every innerHTML assignment goes through
// the canonical scroll-preserving sink (`pwSetHtml` / `_pwSetHtmlSafe`).
// Documented engine exceptions: the sinks themselves.
const SINK_EXEMPTIONS = new Set(['src/core/game-utils.js', 'src/engine/render/vdom.js']);
const rawAssign = [];
function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) scan(full);
    else if (entry.name.endsWith('.js')) {
      const rel = path.relative(process.cwd(), full).replace(/\\/g, '/');
      if (SINK_EXEMPTIONS.has(rel)) continue;
      const lines = fs.readFileSync(full, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (!/\.innerHTML\s*=[^=]/.test(line)) return;
        if (line.includes('_pwSetHtmlSafe = function') || line.includes('pwSetHtml(')) return;
        // V7 · DBT-01 — depuis Prettier, le shim de repli `_pwSetHtmlSafe = function (el, html) {
        // if (…pwSetHtml…) pwSetHtml(el, html); else el.innerHTML = html; }` tient sur 4 lignes :
        // l'affectation est exemptée quand elle se trouve dans ce bloc (3 lignes au-dessus).
        const above = lines.slice(Math.max(0, i - 3), i).join('\n');
        if (above.includes('_pwSetHtmlSafe = function') && above.includes('pwSetHtml(')) return;
        rawAssign.push(`${rel}:${i + 1}`);
      });
    }
  }
}
scan(path.resolve('src'));
if (rawAssign.length) {
  console.error(
    '[sink contract] raw innerHTML assignments outside the canonical sinks (use _pwSetHtmlSafe / pwSetHtml):'
  );
  rawAssign.forEach((l) => console.error('  - ' + l));
  process.exit(1);
}
console.log('HTML sink contract OK (0 raw .innerHTML = outside the documented engine sinks)');

// V7 — une seule version (décision joueur 2026-10-14). V7 · DBT-08 :
// package.json est la SOURCE, src/version.js est GÉNÉRÉ (tools/gen-version.mjs)
// — on vérifie que le fichier généré n'a pas été édité à la main.
{
  const versionJs = fs.readFileSync('src/version.js', 'utf8');
  const m = versionJs.match(/export const PW_VERSION = '(\d+\.\d+\.\d+)';/);
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  if (!m) {
    console.error('src/version.js: PW_VERSION must be MAJEUR.MINEUR.CORRECTIF');
    process.exit(1);
  }
  if (pkg.version !== m[1]) {
    console.error(
      `Version mismatch: src/version.js ${m[1]} ≠ package.json ${pkg.version} — lancer node tools/gen-version.mjs`
    );
    process.exit(1);
  }
  if (!versionJs.includes('FICHIER GÉNÉRÉ par tools/gen-version.mjs')) {
    console.error(
      'src/version.js doit être généré par tools/gen-version.mjs (ne pas éditer à la main)'
    );
    process.exit(1);
  }
  console.log(`Version OK (${m[1]})`);
}

// ── V7 · FORM-04 — formes : données cohérentes (FORMS ↔ PD ↔ sprites) ────────
{
  const errors = [];
  const pdSrc = fs.readFileSync(path.resolve('src/data/pd-data.js'), 'utf8');
  const fakeWindow = {};
  new Function('window', pdSrc)(fakeWindow);
  const PD = fakeWindow.PD || [];
  const pdIds = Object.keys(PD)
    .map(Number)
    .filter((n) => Number.isFinite(n) && PD[n]);
  const maxPd = Math.max(...pdIds);
  if (maxPd > 386)
    errors.push(
      `PD contient un id > 386 (#${maxPd}) : une forme n'est jamais un numéro de dex (FORM-01)`
    );
  const { FORMS, FORM_KINDS, FORM_SHOPS, LEGACY_FORM_IDS } = await import(
    path
      .resolve('src/data/forms-data.js')
      .replace(/\\/g, '/')
      .replace(/^([A-Za-z]:)/, 'file:///$1')
  );
  const spritesSrc = fs.readFileSync(path.resolve('src/data/sprites.js'), 'utf8');
  for (const [key, f] of Object.entries(FORMS)) {
    if (key !== `${f.base}-${f.slot}`)
      errors.push(`FORMS["${key}"] : la clé doit être "${f.base}-${f.slot}"`);
    if (!(f.slot >= 1)) errors.push(`FORMS["${key}"] : slot ≥ 1 attendu`);
    if (!PD[f.base]) errors.push(`FORMS["${key}"] : base #${f.base} absente de PD`);
    if (!FORM_KINDS.includes(f.kind))
      errors.push(`FORMS["${key}"] : kind "${f.kind}" inconnu (${FORM_KINDS.join('/')})`);
    if (!f.name_fr || !f.name_en) errors.push(`FORMS["${key}"] : name_fr / name_en requis`);
    if (!Array.isArray(f.stats) || f.stats.length !== 6)
      errors.push(`FORMS["${key}"] : 6 stats de base attendues`);
    if (!Array.isArray(f.types) || !f.types[0]) errors.push(`FORMS["${key}"] : au moins un type`);
    if (!f.source || !f.source.shop || !(f.source.price > 0))
      errors.push(
        `FORMS["${key}"] : source { shop, price } requise (DEX-01 : toute forme a une provenance)`
      );
    else if (!FORM_SHOPS[f.source.shop])
      errors.push(`FORMS["${key}"] : boutique "${f.source.shop}" absente de FORM_SHOPS`);
    else if (FORM_SHOPS[f.source.shop].baseId !== f.base)
      errors.push(
        `FORMS["${key}"] : la boutique "${f.source.shop}" vend les formes de #${FORM_SHOPS[f.source.shop].baseId}`
      );
    for (const bucket of ['front', 'frontShiny']) {
      if (!new RegExp(`"${key}":"src/assets/images/pokemon/${bucket}/[^"]+"`).test(spritesSrc))
        errors.push(`sprites.js : clé "${key}" absente du seau ${bucket}`);
    }
  }
  for (const [shopKey, shop] of Object.entries(FORM_SHOPS)) {
    if (!shop.location || !shop.titleKey)
      errors.push(`FORM_SHOPS.${shopKey} : location + titleKey requis`);
  }
  for (const [legacy, key] of Object.entries(LEGACY_FORM_IDS)) {
    if (!FORMS[key]) errors.push(`LEGACY_FORM_IDS[${legacy}] → "${key}" : forme inconnue`);
  }
  if (/"38[7-9]":|"39[0-2]":/.test(spritesSrc))
    errors.push('sprites.js : clés 387–392 héritées encore présentes');
  if (errors.length) {
    for (const e of errors) console.error('FORMS ✘ ' + e);
    process.exit(1);
  }
  console.log(`Forms OK (${Object.keys(FORMS).length} formes, PD #1–#${maxPd})`);
}

// ── V7-R2 · SND-03 / V7-R3 · SND-04 / V7-R3b · SND-05 / V7-R3c · SND-06 — audio : pistes livrées créditées (≤ 24 Mo), cris + effets fichier (≤ 15 Mo), manifeste à jour, 0 import audio dans combat/ ──
{
  const audioDir = 'src/assets/audio';
  const musicDir = audioDir + '/music';
  const credits = fs.existsSync('docs/CREDITS.md')
    ? fs.readFileSync('docs/CREDITS.md', 'utf8')
    : '';
  const audioSrc = fs.readFileSync('src/core/audio.js', 'utf8');
  const listDir = (d) =>
    fs.existsSync(d) ? fs.readdirSync(d).filter((f) => /\.(mp3|ogg|m4a|wav)$/i.test(f)) : [];
  const tracks = listDir(musicDir);
  const errors = [];
  let bytes = 0;
  let bundled = 0;
  for (const f of tracks) {
    bytes += fs.statSync(path.join(musicDir, f)).size;
    const key = f.replace(/\.[^.]+$/, '');
    // Piste LIVRÉE (référencée par AUDIO_MUSIC_TRACKS) → crédit obligatoire ;
    // piste DÉPOSÉE par le joueur (manifeste) → libre.
    if (!audioSrc.includes(`'${key}'`)) continue;
    bundled++;
    if (!credits.includes('`' + f + '`'))
      errors.push(`docs/CREDITS.md : aucune ligne de crédit pour ${f}`);
  }
  if (!credits.includes('CC0'))
    errors.push('docs/CREDITS.md : licence des pistes (CC0 / CC-BY) absente');
  if (bytes > 24 * 1024 * 1024)
    errors.push(`budget musique dépassé : ${(bytes / 1048576).toFixed(2)} Mo > 24 Mo`);
  let extraBytes = 0;
  for (const sub of ['cries', 'sfx'])
    for (const f of listDir(path.join(audioDir, sub)))
      extraBytes += fs.statSync(path.join(audioDir, sub, f)).size;
  if (extraBytes > 15 * 1024 * 1024)
    errors.push(`budget cris + effets dépassé : ${(extraBytes / 1048576).toFixed(2)} Mo > 15 Mo`);
  const cries = listDir(path.join(audioDir, 'cries')).length;
  if (cries && !/cries|PokeAPI/i.test(credits))
    errors.push('docs/CREDITS.md : section « cris » absente (source PokeAPI/cries)');
  // Manifeste « drop-in » synchronisé avec le disque (tools/audio-manifest.mjs).
  try {
    const { buildManifest, manifestJson } = await import('./audio-manifest.mjs');
    const expected = manifestJson(buildManifest());
    const manifestPath = audioDir + '/manifest.json';
    const cur = fs.existsSync(manifestPath) ? fs.readFileSync(manifestPath, 'utf8') : '';
    if (cur !== expected)
      errors.push('src/assets/audio/manifest.json périmé : lance `node tools/audio-manifest.mjs`');
  } catch (e) {
    errors.push('tools/audio-manifest.mjs illisible : ' + (e && e.message));
  }
  const combatDir = 'src/application/combat';
  for (const f of fs.readdirSync(combatDir)) {
    const src = fs.readFileSync(path.join(combatDir, f), 'utf8');
    if (/audioPlaySfx|audioPlayCry|audioSetMusicContext|core\/audio\.js/.test(src))
      errors.push(
        `${combatDir}/${f} : 0 import/appel audio autorisé (SND-02 : le combat émet des événements, c'est tout)`
      );
  }
  if (errors.length) {
    for (const e of errors) console.error('AUDIO ✘ ' + e);
    process.exit(1);
  }
  console.log(
    `Audio OK (${bundled}/${tracks.length} pistes livrées créditées, ${(bytes / 1048576).toFixed(2)} Mo ≤ 24 Mo ; ${cries} cris + effets ${(extraBytes / 1048576).toFixed(2)} Mo ≤ 15 Mo ; manifeste à jour ; combat/ sans audio)`
  );
}

// ── V7 · DBT-02 — graphe d'imports : aucun fichier de src/ hors d'atteinte de main.js ──
{
  const { buildGraph } = await import('./import-graph.mjs');
  const g = buildGraph();
  if (g.unreached.length) {
    for (const f of g.unreached)
      console.error('IMPORT-GRAPH ✘ fichier jamais importé depuis src/main.js : ' + f);
    process.exit(1);
  }
  console.log(
    `Import graph OK (${g.reached.length}/${g.total} fichiers atteints depuis src/main.js, 0 mort)`
  );
}

// ── V7 · DBT-04 — gardes typeof : budget non croissant + liens tardifs résolubles ──
{
  const { guardsByDir } = await import('./typeof-guards.mjs');
  const budget = JSON.parse(fs.readFileSync('tools/typeof-guards.budget.json', 'utf8'));
  const by = guardsByDir();
  const over = Object.entries(by).filter(([dir, n]) => n > (budget[dir] ?? 0));
  for (const [dir, n] of over)
    console.error(
      `TYPEOF-GUARDS ✘ ${dir} : ${n} gardes « typeof X === 'function' » sur des globales (budget ${budget[dir] ?? 0}) — importer, ou pwLateLink('X')`
    );
  for (const dir of ['application/combat', 'application/quests', 'application/world']) {
    if ((by[dir] || 0) !== 0) {
      console.error(`TYPEOF-GUARDS ✘ ${dir} doit rester à 0 garde`);
      over.push([dir, by[dir]]);
    }
  }
  if (over.length) process.exit(1);
  const total = Object.values(by).reduce((a, b) => a + b, 0);

  // Chaque pwLateLink('X') / pwLateAlias('X') doit désigner un symbole qui existe dans src/.
  const walk = (d) =>
    fs
      .readdirSync(d, { withFileTypes: true })
      .flatMap((e) =>
        e.isDirectory()
          ? walk(path.join(d, e.name))
          : e.name.endsWith('.js')
            ? [path.join(d, e.name)]
            : []
      );
  const files = walk('src');
  const defined = new Set([
    'setTimeout',
    'setInterval',
    'requestAnimationFrame',
    'structuredClone',
    'queueMicrotask',
  ]);
  const used = new Map();
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(
      /^\s*(?:export\s+)?(?:async\s+)?(?:function|class)\s+([A-Za-z_$][\w$]*)/gm
    ))
      defined.add(m[1]);
    for (const m of src.matchAll(/^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/gm))
      defined.add(m[1]);
    for (const m of src.matchAll(/(?:window|globalThis)\.([A-Za-z_$][\w$]*)\s*=/g))
      defined.add(m[1]);
    for (const m of src.matchAll(/PokeActions\.register\('([A-Za-z_$][\w$]*)'/g)) defined.add(m[1]);
    for (const m of src.matchAll(/pwLate(?:Link|Alias)\('([A-Za-z_$][\w$]*)'\)/g)) {
      if (!used.has(m[1])) used.set(m[1], f);
    }
  }
  const unknown = [...used].filter(([name]) => !defined.has(name));
  for (const [name, f] of unknown)
    console.error(
      `LATE-LINK ✘ pwLateLink('${name}') dans ${f} : aucun symbole de ce nom dans src/`
    );
  if (unknown.length) process.exit(1);
  console.log(
    `Typeof guards OK (${total} restantes dans le budget, 0 dans combat/quests/world ; ${used.size} liens tardifs tous résolubles)`
  );
}

// ── V7 · DBT-06 — budget de cascade CSS (!important / :root ne peuvent que baisser) ──
{
  const { cssBudgetReport } = await import('./cascade-check.mjs');
  const budget = JSON.parse(fs.readFileSync('tools/css-budget.json', 'utf8'));
  const rep = cssBudgetReport();
  const over = Object.entries(rep).filter(([k, v]) => budget[k] !== undefined && v > budget[k]);
  for (const [k, v] of over)
    console.error(`CSS-BUDGET ✘ ${k} : ${v} > budget ${budget[k]} (ratchet : ne peut que baisser)`);
  if (over.length) process.exit(1);
  console.log(
    `CSS budget OK (${rep['design-system.css !important']} !important, ${rep['design-system.css :root (hors @media)']} bloc :root dans design-system.css)`
  );
}

// ── V7 · DBT-09 — budget de taille des fichiers applicatifs (cliquet) ──
{
  const { check } = await import('./file-size-budget.mjs');
  const r = check();
  for (const p of r.problems) console.error('SIZE-BUDGET ✘ ' + p);
  if (r.problems.length) process.exit(1);
  console.log(
    `Size budget OK (${Object.keys(r.sizes).length} fichiers applicatifs, ${r.over.length} encore > ${r.limit} l., tous plafonnés)`
  );
}
