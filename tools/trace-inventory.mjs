// tools/trace-inventory.mjs — ANTIFRAGILE measurement wave (v36), act II.
//
// Static "deplstatement" generator: scans src/ + index.html WITHOUT executing
// anything and publishes the app's exposure map —
//   • beacons        : every PokeTrace.hit/count call site (measure-only)
//   • actions        : PokéActions registrations (engine command table)
//   • ui surfaces    : data-action / data-call / data-change attributes
//   • timers         : appBattleTimer / setInterval / setTimeout call sites
//   • renderers      : function render* definitions
//   • states         : persistence entry points (save.js / offline-engine.js)
//   • events         : EventBus .on/.emit named subscriptions & emissions
//   • primitive metric: per-category counts (the "ωΦ" of the exposure map)
//
// Outputs:
//   reports/trace-inventory.json   — machine-readable inventory
//   reports/TRACE_ETAT_DES_LIEUX.md — human state-of-play (FR, chronicle style)
//
// Run: node tools/trace-inventory.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const REPORTS = path.join(ROOT, 'reports');

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) yield full;
  }
}

function scan(files) {
  const beacons = [];
  const actions = [];
  const timers = [];
  const renderers = [];
  const states = [];
  const eventsOn = [];
  const eventsEmit = [];

  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    const base = path.basename(file);
    for (let i = 0; i < lines.length; i++) {
      const L = lines[i];
      let m;
      // ── beacons ────────────────────────────────────────────────────────
      if ((m = L.match(/PokeTrace\.(hit|count)\(\s*'([^']+)'\s*,\s*(?:'([^']+)'|"([^"]+)"|([\w.]+))/))) {
        beacons.push({ file: rel, line: i + 1, call: m[1], kind: m[2], name: m[3] || m[4] || (L.includes(m[5] + '(') ? m[5] + '(…dynamic)' : m[5] + ' (var)') });
      }
      // ── engine action registrations ───────────────────────────────────
      if ((m = L.match(/PokeActions\.(?:add|register)\(\s*['"][\w$-]+['"]/))) {
        const name = m[0].match(/['"]([\w$-]+)['"]/)[1];
        actions.push({ file: rel, line: i + 1, name });
      }
      if ((m = L.match(/(?:^|\s)registerAction(?:s)?\(\s*['"]([\w$-]+)['"]/))) {
        actions.push({ file: rel, line: i + 1, name: m[1] });
      }
      // ── timers ────────────────────────────────────────────────────────
      if ((m = L.match(/appBattleTimer\(\s*['"]([\w-]+)['"]/))) timers.push({ file: rel, line: i + 1, type: 'appBattleTimer', name: m[1] });
      if (/\bsetInterval\(/.test(L)) timers.push({ file: rel, line: i + 1, type: 'setInterval', name: '' });
      if (/\bsetTimeout\(/.test(L)) timers.push({ file: rel, line: i + 1, type: 'setTimeout', name: '' });
      // ── renderers ─────────────────────────────────────────────────────
      if ((m = L.match(/^\s*(?:async\s+)?function\s+(render[A-Z]\w*|baseWindowRender\w*|locAlcovesVNode)\s*\(/))) {
        renderers.push({ file: rel, line: i + 1, name: m[1] });
      }
      // ── persistence entry points (states) ─────────────────────────────
      if ((base === 'save.js' || base === 'offline-engine.js')
          && (m = L.match(/^\s*function\s+(save\w*|load\w*|startSaveById|export\w*|import\w*|readSlot|writeSlot\w*|offline\w+)\s*\(/))) {
        states.push({ file: rel, line: i + 1, name: m[1] });
      }
      // ── EventBus named traffic (motor events) ─────────────────────────
      if ((m = L.match(/\.on\(\s*['"]([\w:$.-]+)['"]/))) eventsOn.push({ file: rel, line: i + 1, name: m[1] });
      if ((m = L.match(/\.emit\(\s*['"]([\w:$.-]+)['"]/))) eventsEmit.push({ file: rel, line: i + 1, name: m[1] });
    }
  }
  return { beacons, actions, timers, renderers, states, eventsOn, eventsEmit };
}

function scanHtml() {
  const index = path.join(ROOT, 'index.html');
  const ui = { dataAction: new Map(), dataCall: new Map(), dataChange: 0 };
  if (!fs.existsSync(index)) return { dataAction: [], dataCall: [], dataChange: 0 };
  const text = fs.readFileSync(index, 'utf8');
  for (const m of text.matchAll(/data-action="([^"]+)"/g)) ui.dataAction.set(m[1], (ui.dataAction.get(m[1]) || 0) + 1);
  for (const m of text.matchAll(/data-call="([\w$.]+)/g)) ui.dataCall.set(m[1], (ui.dataCall.get(m[1]) || 0) + 1);
  ui.dataChange = (text.match(/data-change=/g) || []).length;
  return {
    dataAction: [...ui.dataAction.entries()].map(([name, n]) => ({ name, n })).sort((a, b) => a.name.localeCompare(b.name)),
    dataCall: [...ui.dataCall.entries()].map(([name, n]) => ({ name, n })).sort((a, b) => a.name.localeCompare(b.name)),
    dataChange: ui.dataChange,
  };
}

const files = [...walk(SRC)];
const inv = scan(files);
const html = scanHtml();

// Unique helper for the wire format.
const uniqSorted = (arr) => [...new Set(arr.map((x) => x.name))].sort();

const inventory = {
  generatedAt: new Date().toISOString(),
  scannedFiles: files.length,
  metric: {
    beacons: inv.beacons.length,
    beaconKinds: [...new Set(inv.beacons.map((b) => b.kind))].sort(),
    actionRegistrations: inv.actions.length,
    uniqueActions: uniqSorted(inv.actions).length,
    htmlDataActions: html.dataAction.length,
    htmlDataCalls: html.dataCall.length,
    htmlDataChange: html.dataChange,
    timers: {
      appBattleTimer: inv.timers.filter((t) => t.type === 'appBattleTimer').length,
      setInterval: inv.timers.filter((t) => t.type === 'setInterval').length,
      setTimeout: inv.timers.filter((t) => t.type === 'setTimeout').length,
    },
    renderers: inv.renderers.length,
    states: inv.states.length,
    eventsOn: uniqSorted(inv.eventsOn).length,
    eventsEmit: uniqSorted(inv.eventsEmit).length,
  },
  beacons: inv.beacons,
  timers: inv.timers,
  renderers: inv.renderers,
  states: inv.states,
  events: {
    subscribed: uniqSorted(inv.eventsOn),
    emitted: uniqSorted(inv.eventsEmit),
    sites: { on: inv.eventsOn, emit: inv.eventsEmit },
  },
  actions: inv.actions,
  htmlUi: html,
};

fs.mkdirSync(REPORTS, { recursive: true });
fs.writeFileSync(path.join(REPORTS, 'trace-inventory.json'), JSON.stringify(inventory, null, 2) + '\n');

// ── French state-of-play (chronicle style) ─────────────────────────────────
const M = inventory.metric;
const byKind = {};
for (const b of inv.beacons) byKind[b.kind] = (byKind[b.kind] || 0) + 1;
const kindRows = M.beaconKinds.map((k) => `| \`${k}\` | ${byKind[k]} |`).join('\n');
const beaconRows = inv.beacons
  .map((b) => `| \`${b.file.replace('src/', '')}:${b.line}\` | ${b.call} | \`${b.kind}\` | \`${b.name}\` |`)
  .join('\n');
const timerRows = inv.timers.filter((t) => t.type === 'appBattleTimer')
  .map((t) => `| \`${t.name}\` | \`${t.file.replace('src/', '')}:${t.line}\` |`).join('\n');
const emitList = inventory.events.emitted.map((e) => `\`${e}\``).join(', ');
const onList = inventory.events.subscribed.map((e) => `\`${e}\``).join(', ');

const md = `# TRACE — État des lieux (vague 36, mesure ANTIFRAGILE)

*Généré le ${inventory.generatedAt} par \`node tools/trace-inventory.mjs\` — scan
statique, aucune exécution du jeu, aucun correctif. ${inventory.scannedFiles}
fichiers sources parcourus.*

## 1. Métrique primitive (l'exposition en un tableau)

| Surface | Mesure |
| --- | ---: |
| Balises \`PokeTrace\` posées | ${M.beacons} |
| Kinds distincts | ${M.beaconKinds.join(', ')} |
| Enregistrements d'actions moteur | ${M.actionRegistrations} (${M.uniqueActions} noms uniques) |
| \`data-action\` dans index.html | ${M.htmlDataActions} noms distincts |
| \`data-call\` dans index.html | ${M.htmlDataCalls} noms distincts |
| \`data-change\` dans index.html | ${M.htmlDataChange} |
| Timers nommés \`appBattleTimer\` | ${M.timers.appBattleTimer} |
| \`setInterval\` | ${M.timers.setInterval} |
| \`setTimeout\` | ${M.timers.setTimeout} |
| Renderers (\`function render*\`) | ${M.renderers} |
| Points d'état (persistance) | ${M.states} |
| Événements moteur émis (noms) | ${M.eventsEmit} |
| Événements moteur écoutés (noms) | ${M.eventsOn} |

## 2. Balises par kind

| Kind | Balises |
| --- | ---: |
${kindRows}

## 3. Détail des balises (fichier:ligne — rappel — kind — nom)

| Fichier | Appel | Kind | Nom |
| --- | --- | --- | --- |
${beaconRows}

## 4. Timers nommés (moteur)

| Nom | Fichier |
| --- | --- |
${timerRows}

## 5. Trafic EventBus (moteur)

**Émis** : ${emitList || '—'}

**Écoutés** : ${onList || '—'}

---

*Ce document est un constat, pas un verdict : aucune ligne ci-dessus n'a été
corrigée, migrée ni optimisée. Il sert de carte d'exposition avant toute
décision. Régénérer après chaque instrumentation : \`node tools/trace-inventory.mjs\`.*
`;

fs.writeFileSync(path.join(REPORTS, 'TRACE_ETAT_DES_LIEUX.md'), md);
console.log(`trace-inventory: ${inventory.scannedFiles} files scanned → reports/trace-inventory.json + reports/TRACE_ETAT_DES_LIEUX.md`);
console.log(`  beacons=${M.beacons} kinds=[${M.beaconKinds.join(',')}] actions=${M.uniqueActions} htmlActions=${M.htmlDataActions} timers(app/interval/timeout)=${M.timers.appBattleTimer}/${M.timers.setInterval}/${M.timers.setTimeout} renderers=${M.renderers} states=${M.states} events(on/emit)=${M.eventsOn}/${M.eventsEmit}`);

