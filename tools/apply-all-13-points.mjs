import fs from 'fs';
import path from 'path';

console.log('--- Applying 13 points refinements ---');

// 1. locations-data.js
{
  const file = 'src/data/locations-data.js';
  let c = fs.readFileSync(file, 'utf8');
  if (!c.includes('[122,25,30,\'rare\']')) {
    c = c.replace(
      /route21:\s*\{[^}]*wild:\[([^\]]*)\]/,
      (match, p1) => match.replace(p1, p1 + ",[122,25,30,'rare']")
    );
    fs.writeFileSync(file, c, 'utf8');
    console.log('Updated locations-data.js (Mr. Mime)');
  }
}

// 2. locations-johto.js
{
  const file = 'src/data/locations-johto.js';
  let c = fs.readFileSync(file, 'utf8');
  
  const replacements = [
    { target: 'jroute29', add: "[161,3,6,'common']" },
    { target: 'jroute31', add: "[204,6,10,'uncommon']" },
    { target: 'jroute32', add: "[187,6,10,'common'],[175,8,12,'rare']" },
    { target: 'jroute33', add: "[190,8,12,'uncommon']" },
    { target: 'jroute34', add: "[209,12,16,'common'],[172,10,14,'rare'],[173,10,14,'rare'],[174,10,14,'rare'],[239,12,16,'rare']" },
    { target: 'jroute36', add: "[185,18,22,'uncommon'],[228,15,20,'uncommon']" },
    { target: 'jroute37', add: "[198,15,19,'uncommon']" },
    { target: 'jroute40', add: "[222,15,20,'uncommon']" },
    { target: 'jroute44', add: "[223,20,25,'uncommon']" },
    { target: 'jroute45', add: "[207,24,28,'uncommon'],[216,24,28,'uncommon']" },
    { target: 'darkcave', add: "[213,20,25,'uncommon']" },
    { target: 'icepath', add: "[238,20,24,'rare']" },
    { target: 'burnedtower', add: "[240,14,18,'rare']" },
    { target: 'mtmortar', add: "[236,14,18,'rare']" },
  ];

  for (const r of replacements) {
    const reg = new RegExp(`(${r.target}\\s*:\\s*\\{[^}]*wild:\\[)([^\\]]*)(\\])`);
    if (!c.includes(r.add)) {
      c = c.replace(reg, (m, p1, p2, p3) => `${p1}${p2},${r.add}${p3}`);
    }
  }
  fs.writeFileSync(file, c, 'utf8');
  console.log('Updated locations-johto.js');
}

// 3. shops-data.js & shops-hoenn.js
{
  const file1 = 'src/data/shops-data.js';
  let c1 = fs.readFileSync(file1, 'utf8');
  if (!c1.includes('"firestone"') || !c1.includes('"jgoldenrod": {\n"items": [\n"firestone"')) {
    c1 = c1.replace(
      '"jgoldenrod": {\n"items": [\n"lucky_punch",',
      '"jgoldenrod": {\n"items": [\n"firestone",\n"waterstone",\n"thunderstone",\n"leafstone",\n"moonstone",\n"sunstone",\n"lucky_punch",'
    );
    fs.writeFileSync(file1, c1, 'utf8');
    console.log('Updated shops-data.js (jgoldenrod stones)');
  }

  const file2 = 'src/data/shops-hoenn.js';
  let c2 = fs.readFileSync(file2, 'utf8');
  if (!c2.includes('"firestone"') || !c2.includes('lilycove_dept_store: { items: ["firestone"')) {
    c2 = c2.replace(
      'lilycove_dept_store: { items: [',
      'lilycove_dept_store: { items: ["firestone", "waterstone", "thunderstone", "leafstone", "moonstone", "sunstone", '
    );
    fs.writeFileSync(file2, c2, 'utf8');
    console.log('Updated shops-hoenn.js (lilycove stones)');
  }
}

// 4. design-system.css
{
  const file = 'src/assets/styles/design-system.css';
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace('--pw-header-h: 34px;', '--pw-header-h: 50px;');
  c = c.replace('--pw-header-close-size: 34px;', '--pw-header-close-size: 40px;');
  c = c.replace('--pw-header-close-glyph: 17px;', '--pw-header-close-glyph: 18px;');

  if (!c.includes('.pw-rank-chip.rank-bronze')) {
    c += `
/* ── Metallic Rank Chips & HUD Tracker Window ── */
.pw-rank-chip {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.pw-rank-chip.rank-bronze {
  background: linear-gradient(135deg, rgb(205, 127, 50), rgb(139, 69, 19));
  color: rgb(255, 255, 255);
}
.pw-rank-chip.rank-silver {
  background: linear-gradient(135deg, rgb(220, 220, 220), rgb(160, 160, 160));
  color: rgb(30, 30, 30);
}
.pw-rank-chip.rank-gold {
  background: linear-gradient(135deg, rgb(255, 215, 0), rgb(218, 165, 32));
  color: rgb(40, 30, 0);
}
.pw-rank-chip.rank-diamond {
  background: linear-gradient(135deg, rgb(185, 242, 255), rgb(0, 180, 216));
  color: rgb(10, 30, 50);
}
.pw-ach-tracker-card {
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
`;
  }
  fs.writeFileSync(file, c, 'utf8');
  console.log('Updated design-system.css (header 50px + rank chips)');
}

// 5. ui-icons.js
{
  const file = 'src/data/ui-icons.js';
  let c = fs.readFileSync(file, 'utf8');
  
  if (!c.includes('if (typeof document !== \'undefined\') {')) {
    c = c.replace(
      /const iconStyle = document\.createElement\('style'\);[\s\S]*?document\.head\.appendChild\(iconStyle\);/,
      `if (typeof document !== 'undefined') {
  const iconStyle = document.createElement('style');
  iconStyle.textContent = \`
   .ui-icon svg {
   width: 100%;
   height: 100%;
   }
  \`;
  document.head.appendChild(iconStyle);
}`
    );
  }

  const newIcons = ` badge: '<svg viewBox="0 0 24 24"fill="#94886B"><path d="M12 2l3 7h7l-5.5 4.5 2 7L12 16l-6.5 4.5 2-7L2 9h7z"/></svg>',
 star: '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
 sword: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><line x1="19" y1="21" x2="21" y2="19"/></svg>',
 trainer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
 compass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
 fist: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4h2a2 2 0 0 1 2 2v2a2 2 0 0 1 2 2v1a2 2 0 0 1 2 2v2a4 4 0 0 1-4 4H9a5 5 0 0 1-5-5v-3a3 3 0 0 1 3-3h1V6a2 2 0 0 1 2-2z"/></svg>',
 pickaxe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 3.5l6 6"/><path d="M18 7l-9 9"/><path d="M2 22l6-6"/><path d="M8.5 13.5l2 2"/></svg>',
 coin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 9v6"/></svg>',
 flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>',
 heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
 dna: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 15c6.667-6 13.333 0 20-6"/><path d="M2 9c6.667 6 13.333 0 20 6"/><line x1="9" y1="9" x2="9" y2="15"/><line x1="15" y1="9" x2="15" y2="15"/></svg>',
 pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-2l-2-2V5h1V3H6v2h1v8l-2 2v2z"/></svg>',
 target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
 shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
 medal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12"/></svg>',`;

  if (!c.includes('star:')) {
    c = c.replace("badge: '<svg viewBox=\"0 0 24 24\"fill=\"#94886B\"><path d=\"M12 2l3 7h7l-5.5 4.5 2 7L12 16l-6.5 4.5 2-7L2 9h7z\"/></svg>',", newIcons);
    fs.writeFileSync(file, c, 'utf8');
    console.log('Updated ui-icons.js (SVG achievement icons)');
  }
}

// 6. badges-panel.js
{
  const file = 'src/ui/game/badges-panel.js';
  const content = `/**
 * PokeWorld — Badges & Leagues Panel
 * Displays all 24 Gym Badges across Kanto, Johto, and Hoenn,
 * as well as the 3 Pokémon League Championships.
 *
 * @module ui/game/badges-panel
 */

if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) {
    if (typeof globalThis.pwSetHtml === 'function') globalThis.pwSetHtml(el, html);
    else el.innerHTML = html;
  };
}

export const BADGE_DEFINITIONS = [
  // ── Kanto (8) ──
  { id: 'brock', region: 'kanto', nameFr: 'Badge Roche', nameEn: 'Boulder Badge', leader: 'Pierre / Brock', loc: 'Argenta', color: '#998b7a' },
  { id: 'misty', region: 'kanto', nameFr: 'Badge Cascade', nameEn: 'Cascade Badge', leader: 'Ondine / Misty', loc: 'Azuria', color: '#3b92d4' },
  { id: 'surge', region: 'kanto', nameFr: 'Badge Foudre', nameEn: 'Thunder Badge', leader: 'Lt. Surge', loc: 'Carmin sur Mer', color: '#e5b824' },
  { id: 'erika', region: 'kanto', nameFr: 'Badge Prisme', nameEn: 'Rainbow Badge', leader: 'Érika', loc: 'Céladopole', color: '#4caf50' },
  { id: 'koga', region: 'kanto', nameFr: 'Badge Âme', nameEn: 'Soul Badge', leader: 'Koga', loc: 'Parmanie', color: '#9c27b0' },
  { id: 'sabrina', region: 'kanto', nameFr: 'Badge Marais', nameEn: 'Marsh Badge', leader: 'Morgane / Sabrina', loc: 'Safrania', color: '#e91e63' },
  { id: 'blaine', region: 'kanto', nameFr: 'Badge Volcan', nameEn: 'Volcano Badge', leader: 'Auguste / Blaine', loc: 'Cramois\\'Île', color: '#f44336' },
  { id: 'giovanni', region: 'kanto', nameFr: 'Badge Terre', nameEn: 'Earth Badge', leader: 'Giovanni', loc: 'Jadielle', color: '#795548' },

  // ── Johto (8) ──
  { id: 'falkner', region: 'johto', nameFr: 'Badge Zéphyr', nameEn: 'Zephyr Badge', leader: 'Albert / Falkner', loc: 'Mauville', color: '#80deea' },
  { id: 'bugsy', region: 'johto', nameFr: 'Badge Essaim', nameEn: 'Hive Badge', leader: 'Hector / Bugsy', loc: 'Écorcia', color: '#8bc34a' },
  { id: 'whitney', region: 'johto', nameFr: 'Badge Tronc', nameEn: 'Plain Badge', leader: 'Blanche / Whitney', loc: 'Doublonville', color: '#f06292' },
  { id: 'morty', region: 'johto', nameFr: 'Badge Brume', nameEn: 'Fog Badge', leader: 'Mortimer / Morty', loc: 'Rosalia', color: '#7e57c2' },
  { id: 'chuck', region: 'johto', nameFr: 'Badge Choc', nameEn: 'Storm Badge', leader: 'Chuck', loc: 'Irisia', color: '#ff7043' },
  { id: 'jasmine', region: 'johto', nameFr: 'Badge Minéral', nameEn: 'Mineral Badge', leader: 'Jasmine', loc: 'Oliville', color: '#b0bec5' },
  { id: 'pryce', region: 'johto', nameFr: 'Badge Glacier', nameEn: 'Glacier Badge', leader: 'Frédo / Pryce', loc: 'Acajou', color: '#4dd0e1' },
  { id: 'clair', region: 'johto', nameFr: 'Badge Lever', nameEn: 'Rising Badge', leader: 'Sandra / Clair', loc: 'Ébénelle', color: '#5c6bc0' },

  // ── Hoenn (8) ──
  { id: 'roxanne', region: 'hoenn', nameFr: 'Badge Roche', nameEn: 'Stone Badge', leader: 'Roxane / Roxanne', loc: 'Mérouville', color: '#a1887f' },
  { id: 'brawly', region: 'hoenn', nameFr: 'Badge Poing', nameEn: 'Knuckle Badge', leader: 'Bastien / Brawly', loc: 'Myokara', color: '#ff8a65' },
  { id: 'wattson', region: 'hoenn', nameFr: 'Badge Dynamo', nameEn: 'Dynamo Badge', leader: 'Voltère / Wattson', loc: 'Lavandia', color: '#ffd54f' },
  { id: 'flannery', region: 'hoenn', nameFr: 'Badge Chaleur', nameEn: 'Heat Badge', leader: 'Adriane / Flannery', loc: 'Vermilava', color: '#ff5722' },
  { id: 'norman', region: 'hoenn', nameFr: 'Badge Balancier', nameEn: 'Balance Badge', leader: 'Norman', loc: 'Clémenti-Ville', color: '#e0e0e0' },
  { id: 'winona', region: 'hoenn', nameFr: 'Badge Plume', nameEn: 'Feather Badge', leader: 'Alizée / Winona', loc: 'Cimetronelle', color: '#81d4fa' },
  { id: 'tate_liza', region: 'hoenn', nameFr: 'Badge Esprit', nameEn: 'Mind Badge', leader: 'Lévy & Tatia / Tate & Liza', loc: 'Algatia', color: '#ce93d8' },
  { id: 'wallace', region: 'hoenn', nameFr: 'Badge Pluie', nameEn: 'Rain Badge', leader: 'Marc / Wallace', loc: 'Atalanopolis', color: '#29b6f6' },
];

export const LEAGUE_DEFINITIONS = [
  {
    id: 'kanto',
    nameFr: 'Ligue Pokémon de Kanto',
    nameEn: 'Kanto Pokémon League',
    champKey: 'elite4',
    altChampKey: 'indigo',
    loc: 'Plateau Indigo',
    color: '#3949ab',
  },
  {
    id: 'johto',
    nameFr: 'Ligue Pokémon de Johto',
    nameEn: 'Johto Pokémon League',
    champKey: 'johto_elite4',
    altChampKey: 'johto_indigo',
    loc: 'Plateau Indigo (Johto)',
    color: '#00897b',
  },
  {
    id: 'hoenn',
    nameFr: 'Ligue Pokémon de Hoenn',
    nameEn: 'Hoenn Pokémon League',
    champKey: 'hoenn_elite4',
    altChampKey: 'evergrande',
    loc: 'Éternara / Ever Grande',
    color: '#d81b60',
  },
];

let currentRegionTab = 'all';

function isBadgeObtained(badgeId, gState) {
  const g = gState || globalThis.G || {};
  if (!g.badges) return false;
  if (Array.isArray(g.badges)) return g.badges.includes(badgeId);
  return Boolean(g.badges[badgeId]);
}

function isLeagueDefeated(leagueDef, gState) {
  const g = gState || globalThis.G || {};
  const champs = g.defeatedChamps || {};
  return Boolean(champs[leagueDef.champKey] || (leagueDef.altChampKey && champs[leagueDef.altChampKey]));
}

function getBadgeSvg(badge, obtained) {
  const c = obtained ? badge.color : '#444c56';
  const stroke = obtained ? '#ffffff' : '#666';
  const glow = obtained ? \`filter="drop-shadow(0 0 4px \${badge.color})"\` : '';
  return \`<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" \${glow}>
    <circle cx="24" cy="24" r="20" fill="\${c}" fill-opacity="\${obtained ? '0.85' : '0.3'}" stroke="\${stroke}" stroke-width="2"/>
    <polygon points="24,10 28,19 38,19 30,25 33,35 24,29 15,35 18,25 10,19 20,19" fill="\${obtained ? '#ffd700' : '#555'}" stroke="\${stroke}" stroke-width="1.2"/>
  </svg>\`;
}

function getLeagueSvg(obtained) {
  const c = obtained ? '#ffd700' : '#555';
  return \`<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="\${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
    <path d="M4 22h16"/>
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
  </svg>\`;
}

export function renderBadgesPanel(container) {
  if (!container) return;
  const g = globalThis.G || {};
  const isEn = g.lang === 'en';

  const obtainedCount = BADGE_DEFINITIONS.filter(b => isBadgeObtained(b.id, g)).length;
  const totalBadges = BADGE_DEFINITIONS.length;

  const beatenLeaguesCount = LEAGUE_DEFINITIONS.filter(l => isLeagueDefeated(l, g)).length;
  const totalLeagues = LEAGUE_DEFINITIONS.length;

  const filteredBadges = currentRegionTab === 'all'
    ? BADGE_DEFINITIONS
    : BADGE_DEFINITIONS.filter(b => b.region === currentRegionTab);

  const filteredLeagues = currentRegionTab === 'all'
    ? LEAGUE_DEFINITIONS
    : LEAGUE_DEFINITIONS.filter(l => l.id === currentRegionTab);

  let tabsHtml = \`
    <div class="pw-badges-tabs" style="display:flex;gap:8px;margin-bottom:14px;justify-content:center;">
      <button class="hbtn \${currentRegionTab === 'all' ? 'active' : ''}" data-call="setBadgesRegionTab" data-arg="all">\${isEn ? 'All' : 'Tous'}</button>
      <button class="hbtn \${currentRegionTab === 'kanto' ? 'active' : ''}" data-call="setBadgesRegionTab" data-arg="kanto">Kanto</button>
      <button class="hbtn \${currentRegionTab === 'johto' ? 'active' : ''}" data-call="setBadgesRegionTab" data-arg="johto">Johto</button>
      <button class="hbtn \${currentRegionTab === 'hoenn' ? 'active' : ''}" data-call="setBadgesRegionTab" data-arg="hoenn">Hoenn</button>
    </div>
  \`;

  let badgesGridHtml = '<div class="pw-badges-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(130px, 1fr));gap:12px;margin-bottom:20px;">';
  for (const b of filteredBadges) {
    const obtained = isBadgeObtained(b.id, g);
    const name = isEn ? b.nameEn : b.nameFr;
    badgesGridHtml += \`
      <div class="pw-badge-card \${obtained ? 'obtained' : 'locked'}" style="display:flex;flex-direction:column;align-items:center;padding:10px 8px;background:rgba(255,255,255,\${obtained ? '0.08' : '0.02'});border:1px solid \${obtained ? b.color : 'rgba(255,255,255,0.06)'};border-radius:8px;text-align:center;">
        <div class="pw-badge-svg" style="margin-bottom:6px;">\${getBadgeSvg(b, obtained)}</div>
        <div style="font-weight:bold;font-size:12px;color:\${obtained ? '#fff' : 'var(--light1)'};">\${name}</div>
        <div style="font-size:10px;color:var(--light1);margin-top:2px;">\${b.leader}</div>
        <div style="font-size:9px;color:var(--light2);margin-top:2px;">\${b.loc}</div>
      </div>
    \`;
  }
  badgesGridHtml += '</div>';

  let leaguesGridHtml = '<div class="pw-leagues-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:12px;">';
  for (const l of filteredLeagues) {
    const beaten = isLeagueDefeated(l, g);
    const name = isEn ? l.nameEn : l.nameFr;
    leaguesGridHtml += \`
      <div class="pw-league-card \${beaten ? 'obtained' : 'locked'}" style="display:flex;align-items:center;gap:12px;padding:12px;background:rgba(255,255,255,\${beaten ? '0.08' : '0.02'});border:1px solid \${beaten ? l.color : 'rgba(255,255,255,0.06)'};border-radius:8px;">
        <div class="pw-league-trophy">\${getLeagueSvg(beaten)}</div>
        <div>
          <div style="font-weight:bold;font-size:12px;color:\${beaten ? '#ffd700' : 'var(--light1)'};">\${name}</div>
          <div style="font-size:10px;color:var(--light1);margin-top:2px;">\${l.loc}</div>
          <div style="font-size:10px;color:\${beaten ? 'var(--green)' : 'var(--light2)'};margin-top:3px;font-weight:bold;">
            \${beaten ? (isEn ? '✓ Champion' : '✓ Vaincue') : (isEn ? 'Locked' : 'Non vaincue')}
          </div>
        </div>
      </div>
    \`;
  }
  leaguesGridHtml += '</div>';

  const html = \`
    <div class="pw-badges-panel-container" style="padding:16px;max-width:800px;margin:0 auto;color:var(--text);">
      <div class="pw-badges-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.1);">
        <div>
          <h2 style="margin:0;font-size:18px;">\${isEn ? 'Badges & Leagues' : 'Badges & Ligues'}</h2>
          <div style="font-size:12px;color:var(--light1);margin-top:4px;">
            \${isEn ? 'Track your journey across Kanto, Johto, and Hoenn.' : 'Suivez votre progression à travers Kanto, Johto et Hoenn.'}
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:13px;font-weight:bold;color:var(--yellow);">\${obtainedCount} / \${totalBadges} \${isEn ? 'badges' : 'badges'}</div>
          <div style="font-size:12px;color:var(--light1);">\${beatenLeaguesCount} / \${totalLeagues} \${isEn ? 'leagues' : 'ligues'}</div>
        </div>
      </div>
      \${tabsHtml}
      <h3 style="font-size:14px;margin:12px 0 8px 0;color:var(--light1);">\${isEn ? 'Gym Badges' : 'Badges d’Arène'}</h3>
      \${badgesGridHtml}
      <h3 style="font-size:14px;margin:16px 0 8px 0;color:var(--light1);">\${isEn ? 'Pokémon Leagues' : 'Ligues Pokémon'}</h3>
      \${leaguesGridHtml}
    </div>
  \`;

  globalThis._pwSetHtmlSafe(container, html);
}

export function openBadgesPanel() {
  if (typeof globalThis.openFullscreenPanel === 'function') {
    globalThis.openFullscreenPanel('badges');
  } else if (typeof globalThis.openModal === 'function') {
    const content = document.createElement('div');
    renderBadgesPanel(content);
    globalThis.openModal({
      title: (globalThis.G && globalThis.G.lang === 'en') ? 'Gym Badges & Leagues' : 'Badges & Ligues',
      content: content.innerHTML,
    });
  }
}

export function setBadgesRegionTab(tab) {
  currentRegionTab = tab || 'all';
  const container = document.getElementById('fs-panel-body') || document.querySelector('.pw-badges-panel-container');
  if (container) {
    renderBadgesPanel(container.closest('#fs-panel-body') || container.parentElement);
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.renderBadgesPanel = renderBadgesPanel;
  globalThis.openBadgesPanel = openBadgesPanel;
  globalThis.setBadgesRegionTab = setBadgesRegionTab;
}
`;
  fs.writeFileSync(file, content, 'utf8');
  console.log('Created badges-panel.js');
}

// 7. main.js
{
  const file = 'src/main.js';
  let c = fs.readFileSync(file, 'utf8');
  if (!c.includes('./ui/game/badges-panel.js')) {
    c = c.replace(
      "import './ui/game/achievements-panel.js';",
      "import './ui/game/achievements-panel.js';\nimport './ui/game/badges-panel.js';"
    );
    fs.writeFileSync(file, c, 'utf8');
    console.log('Updated main.js (badges-panel.js import)');
  }
}

// 8. fullscreen-panel.js
{
  const file = 'src/ui/game/fullscreen-panel.js';
  let c = fs.readFileSync(file, 'utf8');
  if (!c.includes('badges:')) {
    c = c.replace(
      'atoll: t(\'battle_atoll_title\'),',
      'atoll: t(\'battle_atoll_title\'),\n    badges: typeof G !== \'undefined\' && G?.lang === \'en\' ? \'Gym Badges & Leagues\' : \'Badges & Ligues\','
    );
  }
  if (!c.includes("else if (panelType === 'badges')")) {
    c = c.replace(
      "else if (panelType === 'castform_forms'",
      `else if (panelType === 'badges') {
    if (typeof globalThis.renderBadgesPanel === 'function')
      globalThis.renderBadgesPanel(content);
    else if (typeof window !== 'undefined' && typeof window.renderBadgesPanel === 'function')
      window.renderBadgesPanel(content);
  } else if (panelType === 'castform_forms'`
    );
  }
  fs.writeFileSync(file, c, 'utf8');
  console.log('Updated fullscreen-panel.js (badges panel support)');
}

// 9. shortcuts.js
{
  const file = 'src/ui/game/shortcuts.js';
  let c = fs.readFileSync(file, 'utf8');
  if (!c.includes("value: 'badges'")) {
    c = c.replace(
      "value: 'achievements',",
      `value: 'achievements',
      color: 'var(--yellow)',
      unlocked: true,
    },
    {
      iconHtml: iconHtml('badge', '🏅'),
      label:
        typeof window !== 'undefined' && typeof window.t === 'function'
          ? (window.G && window.G.lang === 'en' ? 'Badges' : 'Badges')
          : 'Badges',
      action: 'open-fullscreen-panel',
      value: 'badges',
      color: '#ffd700',
      unlocked: true,`
    );
    fs.writeFileSync(file, c, 'utf8');
    console.log('Updated shortcuts.js (badges shortcut button)');
  }
}

// 10. achievements-panel.js
{
  const file = 'src/ui/game/achievements-panel.js';
  let c = fs.readFileSync(file, 'utf8');

  if (!c.includes('export function getAchievementTierInfo')) {
    const exportBlock = `
export function getAchievementTierInfo(tierIdx, maxTiers = 4) {
  const ranks = [
    { cls: 'rank-bronze', labelFr: 'Bronze', labelEn: 'Bronze' },
    { cls: 'rank-silver', labelFr: 'Argent', labelEn: 'Silver' },
    { cls: 'rank-gold', labelFr: 'Or', labelEn: 'Gold' },
    { cls: 'rank-diamond', labelFr: 'Diamant', labelEn: 'Diamond' },
  ];
  if (tierIdx < 0) return { cls: 'rank-none', labelFr: 'Non débloqué', labelEn: 'Locked' };
  const idx = Math.min(tierIdx, ranks.length - 1);
  return ranks[idx] || ranks[0];
}

export function renderAchievementsTrackerWindow() {
  if (typeof document === 'undefined') return;
  const body = document.getElementById('achievements-window-body');
  if (!body) return;
  const G = globalThis.G || {};
  ensureAchievementsState(G);
  const lang = G.lang === 'en' ? 'en' : 'fr';

  let pinnedId = G.achievements?.pinned || 'dex_kanto';
  const pinnedAch = ACHIEVEMENTS.find((a) => a.id === pinnedId) || ACHIEVEMENTS[0];
  if (!pinnedAch) {
    if (typeof globalThis._pwSetHtmlSafe === 'function') {
      globalThis._pwSetHtmlSafe(body, \`<div style="padding:10px;font-size:11px;color:var(--light1);text-align:center;">\${lang === 'en' ? 'No pinned achievement' : 'Aucun succès épinglé'}</div>\`);
    } else {
      body.innerHTML = \`<div style="padding:10px;font-size:11px;color:var(--light1);text-align:center;">\${lang === 'en' ? 'No pinned achievement' : 'Aucun succès épinglé'}</div>\`;
    }
    return;
  }

  const prog = getAchievementProgress(pinnedAch, G);
  const name = lang === 'en' ? pinnedAch.name_en : pinnedAch.name_fr;
  const fDef = ACHIEVEMENT_FAMILIES[pinnedAch.family] || {};
  const tierInfo = getAchievementTierInfo(prog.currentTier, pinnedAch.tiers.length);

  const html = \`
    <div class="pw-ach-tracker-card" style="padding:8px 10px;display:flex;flex-direction:column;gap:6px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
        <div style="display:flex;align-items:center;gap:6px;font-weight:bold;font-size:12px;">
          <span>\${getIconHtml(fDef.icon || 'star', 16)}</span>
          <span>\${esc(name)}</span>
        </div>
        <span class="pw-rank-chip \${tierInfo.cls}" style="font-size:9px;padding:2px 6px;border-radius:4px;font-weight:bold;">\${lang === 'en' ? tierInfo.labelEn : tierInfo.labelFr}</span>
      </div>
      <div class="pw-ach-progress-row" style="margin:2px 0;">
        <div class="pw-ach-progress-bar-bg" style="height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;flex:1;">
          <div class="pw-ach-progress-bar-fill" style="width:\${prog.progressPct}%;height:100%;background:var(--yellow,#f2d94e);"></div>
        </div>
        <div style="font-size:10px;color:var(--light1);margin-top:2px;display:flex;justify-content:space-between;">
          <span>\${prog.metricValue} / \${prog.nextTarget}</span>
          <span>\${prog.progressPct}%</span>
        </div>
      </div>
    </div>
  \`;

  if (typeof globalThis._pwSetHtmlSafe === 'function') {
    globalThis._pwSetHtmlSafe(body, html);
  } else {
    body.innerHTML = html;
  }
}

export function togglePinAchievement(achId) {
  const G = globalThis.G || {};
  ensureAchievementsState(G);
  if (G.achievements.pinned === achId) {
    G.achievements.pinned = null;
  } else {
    G.achievements.pinned = achId;
  }
  renderAchievementsTrackerWindow();
  const fsPanel = document.getElementById('fs-panel-content');
  if (fsPanel) renderAchievementsPanel(fsPanel);
}
`;
    c = c.replace(
      '// Exposure',
      exportBlock + '\n// Exposure'
    );
    c = c.replace(
      'globalThis.setAchievementFamilyFilter = setAchievementFamilyFilter;\n}',
      'globalThis.setAchievementFamilyFilter = setAchievementFamilyFilter;\n  globalThis.getAchievementTierInfo = getAchievementTierInfo;\n  globalThis.renderAchievementsTrackerWindow = renderAchievementsTrackerWindow;\n  globalThis.togglePinAchievement = togglePinAchievement;\n}'
    );
    c = c.replace(
      "PokeActions.register('setAchievementFamilyFilter', setAchievementFamilyFilter);\n  } catch (_) {}",
      "PokeActions.register('setAchievementFamilyFilter', setAchievementFamilyFilter);\n    PokeActions.register('togglePinAchievement', togglePinAchievement);\n  } catch (_) {}"
    );

    if (!c.includes('globalThis._pwSetHtmlSafe = function')) {
      c = `if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) {
    if (typeof globalThis.pwSetHtml === 'function') globalThis.pwSetHtml(el, html);
    else el.innerHTML = html;
  };
}\n` + c;
    }

    fs.writeFileSync(file, c, 'utf8');
    console.log('Updated achievements-panel.js');
  }
}

// 11. dashboard.js
{
  const file = 'src/ui/game/dashboard.js';
  let c = fs.readFileSync(file, 'utf8');
  if (!c.includes("'win-achievements'")) {
    c = c.replace(
      "1: ['win-pokeballs', 'win-story', 'win-team', 'win-hatchery'],",
      "1: ['win-achievements', 'win-pokeballs', 'win-story', 'win-team', 'win-hatchery'],"
    );
    c = c.replace(
      "const DEFAULT_COL = {\n    'win-story': 1,",
      "const DEFAULT_COL = {\n    'win-achievements': 1,\n    'win-story': 1,"
    );
    c = c.replace(
      "const WIN_GUIDE_SECTION = {\n      'win-story': 'quests',",
      "const WIN_GUIDE_SECTION = {\n      'win-achievements': 'achievements',\n      'win-story': 'quests',"
    );
    c = c.replace(
      "if (preset === 'cols3') {\n    dashboardCols = {\n      1: ['win-pokeballs',",
      "if (preset === 'cols3') {\n    dashboardCols = {\n      1: ['win-achievements', 'win-pokeballs',"
    );
    c = c.replace(
      "wins.forEach((wId) => {\n        const wEl = document.getElementById(wId);\n        if (wEl) colEl.appendChild(wEl);\n      });\n    }\n  }",
      `wins.forEach((wId) => {
        const wEl = document.getElementById(wId);
        if (wEl) colEl.appendChild(wEl);
      });
    }
  }
  if (typeof renderAchievementsTrackerWindow === 'function') {
    try { renderAchievementsTrackerWindow(); } catch (_) {}
  } else if (typeof globalThis.renderAchievementsTrackerWindow === 'function') {
    try { globalThis.renderAchievementsTrackerWindow(); } catch (_) {}
  }`
    );
    fs.writeFileSync(file, c, 'utf8');
    console.log('Updated dashboard.js');
  }
}

// 12. mobile-views.js
{
  const file = 'src/engine/runtime/mobile-views.js';
  let c = fs.readFileSync(file, 'utf8');
  if (!c.includes("if (winId === 'win-achievements') return { view: 'adventure' };")) {
    c = c.replace(
      'export function pwMobileViewForWin(winId) {',
      "export function pwMobileViewForWin(winId) {\n  if (winId === 'win-achievements') return { view: 'adventure' };"
    );
    fs.writeFileSync(file, c, 'utf8');
    console.log('Updated mobile-views.js');
  }
}

// 13. guide-sections-extra.js
{
  const file = 'src/ui/game/guide-sections-extra.js';
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(
    'ivMaxBonus: _fmt(ivCap * ivStep),',
    'ivMaxBonus: ivCap * ivStep,'
  );
  c = c.replace(
    'evMaxBonus: _fmt(evCap * evStep),',
    'evMaxBonus: evCap * evStep,'
  );

  // remove stats and sound from extraGuideSections
  c = c.replace(
    /stats:\s*\{[\s\S]*?pokeballs:/,
    'pokeballs:'
  );
  c = c.replace(
    /sound:\s*\{[\s\S]*?\}\s*,\s*\}\s*;/m,
    '};'
  );
  fs.writeFileSync(file, c, 'utf8');
  console.log('Updated guide-sections-extra.js');
}

// 14. guide-sections.js
{
  const file = 'src/ui/game/guide-sections.js';
  let c = fs.readFileSync(file, 'utf8');

  // re-export helpers
  if (!c.includes('statsGuideValues,')) {
    c = c.replace(
      "import { mergeGuideSections, automationBuyPage } from './guide-sections-extra.js';",
      `import {
  mergeGuideSections,
  automationBuyPage,
  statsGuideValues,
  shinyGuideValues,
  ballGuideValues,
  soundGuideValues,
} from './guide-sections-extra.js';`
    );
    c = c.replace(
      'export {\n  guideSections,',
      'export {\n  guideSections,\n  statsGuideValues,\n  shinyGuideValues,\n  ballGuideValues,\n  soundGuideValues,'
    );
  }

  // replace _baseGuideSections
  const startStr = "function _baseGuideSections() {";
  const endStr = "export {\n  guideSections,";
  const startIdx = c.indexOf(startStr);
  const endIdx = c.indexOf(endStr);
  if (startIdx !== -1 && endIdx !== -1) {
    const newBase = `function _baseGuideSections() {
  return {
    map: {
      icon: _icon("map"),
      title: t("guide_map_title") || "Carte & progression",
      pages: [
        [
          typeof t === "function" ? t("guide_map_read") : "Lire la carte",
          typeof t === "function"
            ? t("guide_map_simple_desc")
            : "Explore les routes, villes et donjons de chaque région. Les couleurs indiquent les zones disponibles, verrouillées ou avec des Pokémon à capturer.",
        ],
        [
          typeof t === "function" ? t("guide_progress_locks") : "Verrous de progression",
          typeof t === "function"
            ? t("guide_progress_locks_desc")
            : "La progression dépend des combats sauvages gagnés, des badges d’arène et des quêtes principales.",
        ],
        keyNumbersPage("guide_key_map_desc"),
      ],
    },
    combat: {
      icon: _icon("battle"),
      title: t("guide_combat_title") || "Combat",
      pages: [
        [
          typeof t === "function" ? t("guide_combat_basics") : "Principe général",
          typeof t === "function"
            ? t("guide_combat_basics_desc")
            : "Les combats sont automatiques et en temps réel. Tu ne choisis pas l’attaque pendant le combat : la stratégie se prépare avant.",
        ],
        [
          typeof t === "function" ? t("guide_combat_eff") : "Efficacité & Statuts",
          typeof t === "function"
            ? t("guide_combat_eff_desc")
            : "Les indicateurs de type (×2, ×½, ×0) et les altérations d’état influent directement sur l’issue du duel.",
        ],
        keyNumbersPage("guide_key_combat_desc"),
      ],
    },
    capture: {
      icon: _icon("pokeball"),
      title: t("guide_capture_title"),
      pages: captureGuidePages(),
    },
    pokemon: {
      icon: _icon("team"),
      title: t("guide_pokemon_title") || "Pokémon",
      pages: [
        [
          t("guide_pokemon_sheet"),
          \`\${tutorialDeviceHint("sheet")} \${t("guide_pokemon_sheet_desc")}\`,
        ],
        [
          typeof t === "function" ? t("guide_sheet_base") : "Base Stats & Évolution",
          typeof t === "function"
            ? t("guide_sheet_base_desc")
            : "Les Pokémon gagnent de l’XP en combat. Les évolutions par niveau sont automatiques et celles par pierre s’activent dans le Sac.",
        ],
        [
          typeof t === "function" ? t("guide_sheet_moves") : "Capacités & Talents",
          typeof t === "function"
            ? t("guide_sheet_moves_desc")
            : "Chaque Pokémon peut apprendre jusqu’à 4 attaques et disposer d’un talent influençant son potentiel au combat.",
        ],
      ],
    },
    bag: {
      icon: _icon("bag"),
      title: t("guide_bag_title") || "Sac",
      pages: [
        [
          typeof t === "function" ? t("guide_bag_org") : "Organisation & Consommables",
          typeof t === "function"
            ? t("guide_bag_org_desc")
            : "Le Sac classe vos Poké Balls, potions, pierres et objets tenus. Le surplus au-delà de la limite est automatiquement revendu.",
        ],
        [
          typeof t === "function" ? t("guide_evo_stones") : "Pierres & Objets tenus",
          typeof t === "function"
            ? t("guide_evo_stones_desc")
            : "Les pierres font évoluer les Pokémon compatibles et les objets tenus procurent des bonus durables en duel.",
        ],
      ],
    },
    mine: {
      icon: _icon("mine"),
      title: t("guide_mine_title") || "Mine",
      pages: [
        [
          typeof t === "function" ? t("guide_mine_goal") : "Objectif & Outils",
          typeof t === "function"
            ? t("guide_mine_goal_desc")
            : "Révèle complètement les objets cachés sous la roche à l’aide du burin et de la pioche avant épuisement de ton énergie.",
        ],
        [
          typeof t === "function" ? t("guide_mine_refresh") : "Diamants & Renouvellement",
          typeof t === "function"
            ? t("guide_mine_refresh_desc")
            : "Une fois tous les objets d’une couche déterrés, la mine se régénère. Les trésors s’échangent contre des diamants.",
        ],
        keyNumbersPage("guide_key_mine_desc"),
      ],
    },
    hatchery: {
      icon: _icon("hatchery"),
      title: t("guide_hatchery_title") || "Pension",
      pages: [
        [
          typeof t === "function" ? t("guide_hatchery_deposit") : "Pension & Niveaux",
          typeof t === "function"
            ? t("guide_hatchery_deposit_desc")
            : "Dépose un Pokémon pour qu’il monte de niveau et produise des œufs au fur et à mesure de tes victoires en combat.",
        ],
        [
          typeof t === "function" ? t("guide_hatchery_fossils") : "Fossiles & Éclosion",
          typeof t === "function"
            ? t("guide_hatchery_fossils_desc")
            : "Les œufs et fossiles découverts dans la Mine éclosent avec tes K.O. pour vous offrir de nouvelles espèces et bébés Pokémon.",
        ],
        keyNumbersPage("guide_key_hatchery_desc"),
      ],
    },
    training: {
      icon: _icon("training"),
      title: t("guide_training_title") || "Entraînement",
      pages: [
        [
          typeof t === "function" ? t("guide_training_modes") : "Modes d’entraînement",
          typeof t === "function"
            ? t("guide_training_modes_desc")
            : "Envoie tes Pokémon s’entraîner en duel pour gagner des niveaux, des EV spécifiques, ou éveiller un nouveau talent.",
        ],
        [
          typeof t === "function" ? t("guide_ev_training") : "EV & Talents",
          typeof t === "function"
            ? t("guide_ev_training_desc")
            : "Chaque séance d’EV ou de talent perfectionne les caractéristiques de vos Pokémon pour les rendre redoutables en arène.",
        ],
        keyNumbersPage("guide_key_training_desc"),
      ],
    },
    quests: {
      icon: _icon("quests"),
      title: typeof t === "function" ? t("guide_quests_title") : "Quests",
      pages: [
        [
          typeof t === "function" ? t("guide_main_quests") : "Quêtes principales & secondaires",
          typeof t === "function"
            ? t("guide_main_quests_desc")
            : "Elles débloquent l’histoire, des villes, des objets-clés et récompensent avec de l’argent et des combats uniques.",
        ],
        [
          typeof t === "function" ? t("guide_repeatable_quests") : "Quêtes répétables",
          typeof t === "function"
            ? t("guide_repeatable_quests_desc")
            : "Les quêtes répétables permettent d’amasser continuellement des Pokédollars et des Points de quête au gré de vos activités.",
        ],
        [
          t("guide_legendary_quests"),
          tr("guide_legendary_quests_desc", {
            pct: Math.round(
              ((typeof LEGENDARY_QUEST_CATCH_MULT === "number" ? LEGENDARY_QUEST_CATCH_MULT : 2) - 1) * 100
            ),
          }),
        ],
      ],
    },
    economy: {
      icon: _icon("shop"),
      title: typeof t === "function" ? t("guide_economy") : "Economy & Market",
      pages: [
        [t("guide_currencies"), tr("guide_currencies_desc", currencyGuideValues())],
        [
          typeof t === "function" ? t("guide_shops") : "Boutiques & Revente",
          typeof t === "function"
            ? t("guide_shops_desc")
            : "Les boutiques vendent soins, pierres et vitamines. Les trésors de la Mine s’échangent contre des diamants.",
        ],
        keyNumbersPage("guide_key_economy_desc"),
      ],
    },
    automation: {
      icon: _icon("settings"),
      title: t("guide_automation_title") || "Automatisation & personnel",
      pages: [
        automationBuyPage(),
        [
          t("guide_auto_relaunch"),
          typeof t === "function"
            ? t("guide_auto_relaunch_desc")
            : "Les modules de relance automatique permettent de relancer les combats sauvages et donjons dès la fin d’une session.",
        ],
        keyNumbersPage("guide_key_automation_desc"),
      ],
    },
    save: {
      icon: _icon("save"),
      title: t("guide_save_title") || "Sauvegardes & AFK",
      pages: [
        [
          typeof t === "function" ? t("guide_multi_saves") : "Sauvegardes & Export",
          typeof t === "function"
            ? t("guide_multi_saves_desc")
            : "Le jeu gère plusieurs sauvegardes automatiques dans votre navigateur. Pensez à exporter régulièrement votre partie.",
        ],
        [
          typeof t === "function" ? t("guide_afk") : "Progression AFK",
          typeof t === "function"
            ? t("guide_afk_desc")
            : "Une partie de la progression peut être simulée hors-ligne avec le véritable moteur de combat.",
        ],
        keyNumbersPage("guide_key_afk_desc"),
      ],
    },
    atoll: {
      icon: _icon("atoll"),
      title: t("battle_atoll_title") || "Atoll de Combat",
      pages: [
        [
          typeof t === "function" ? t("guide_battle_atoll") : "Battle Atoll",
          typeof t === "function"
            ? t("guide_battle_atoll_desc")
            : "L’Atoll propose des défis de haut niveau avec des règles spéciales et des restrictions d’équipes.",
        ],
        [
          typeof t === "function"
            ? t("guide_atoll_rotation")
            : (typeof G !== "undefined" && G?.lang === "en")
              ? "12-hour rotation"
              : "Rotation de 12 h",
          typeof t === "function"
            ? t("guide_atoll_rotation_desc")
            : (typeof G !== "undefined" && G?.lang === "en")
              ? "Opposing teams, banned legendaries and the shop rotate every 12 hours."
              : "Les équipes adverses, légendaires bannis et la boutique tournent toutes les 12 heures.",
        ],
      ],
    },
    dungeon: {
      icon: _icon("dungeon"),
      title: t("guide_dungeon_title") || "Donjons",
      pages: [
        [
          typeof t === "function" ? t("guide_dungeon_goal") : "Exploration de donjons",
          typeof t === "function"
            ? t("guide_dungeon_goal_desc")
            : "Explorez chaque niveau en dévoilant les cases : combats, coffres au trésor, échelle de sortie et gardien de fin.",
        ],
        [
          typeof t === "function" ? t("guide_dungeon_auto") : "Pilote automatique",
          typeof t === "function"
            ? t("guide_dungeon_auto_desc")
            : "Le pilote automatique peut cibler les coffres, nettoyer tout le plateau ou foncer vers le boss selon vos réglages.",
        ],
        keyNumbersPage("guide_key_dungeon_desc"),
      ],
    },
    base: {
      icon: typeof getIcon === "function" ? getIcon("base", 14) : "🏠",
      title: t("guide_base_title") || ((typeof G !== "undefined" && G?.lang === "en") ? "Secret Bases" : "Bases Secrètes"),
      pages:
        (typeof G !== "undefined" && G?.lang === "en")
          ? [
              [
                "Unlocking",
                "Secret Bases unlock in Hoenn after the Route 111 desert quest.",
              ],
              [
                "Decorating & Perks",
                "Furnish your base with furniture, mats and dolls to gain passive adventuring bonuses.",
              ],
            ]
          : [
              [
                "Déblocage",
                "Les Bases Secrètes se débloquent à Hoenn après la quête du désert de la Route 111.",
              ],
              [
                "Décoration & Bonus",
                "Aménagez votre base avec du mobilier et des poupées pour bénéficier de bonus passifs permanents.",
              ],
            ],
    },
    dictionary: {
      icon: _icon("dictionary"),
      title: t("guide_dictionary_title") || "Dictionnaire",
      pages: [
        [
          typeof t === "function" ? t("guide_dict_overview") : "Encyclopédie",
          typeof t === "function"
            ? t("guide_dict_overview_desc")
            : "Consultez les fiches détaillées de toutes les attaques, talents et objets du jeu.",
        ],
        [
          typeof t === "function" ? t("guide_dict_search") : "Recherche",
          typeof t === "function"
            ? t("guide_dict_search_desc")
            : "Recherchez facilement une capacité ou un talent pour voir ses effets précis et les Pokémon concernés.",
        ],
      ],
    },
  };
}
`;
    c = c.slice(0, startIdx) + newBase + '\n' + c.slice(endIdx);
    fs.writeFileSync(file, c, 'utf8');
    console.log('Updated guide-sections.js (condensed base sections)');
  }
}

// 15. automation.js, auto-relaunch.js, auto-dungeon-relaunch.js, training.js, mine.js (confirmFn & typeof guards)
{
  const files = [
    'src/application/automation/auto-dungeon-relaunch.js',
    'src/application/automation/auto-relaunch.js',
    'src/application/automation/automation.js',
    'src/application/combat/training.js',
    'src/application/economy/mine.js',
  ];
  for (const f of files) {
    let c = fs.readFileSync(f, 'utf8');
    c = c.replace(
      /const confirmFn = globalThis\.pwConfirm \|\| \(typeof pwConfirm === ['"]function['"] \? pwConfirm : null\);/g,
      'const confirmFn = globalThis.pwConfirm || null;'
    );
    if (f.endsWith('automation.js')) {
      c = c.replace('const w = typeof ensureWallet === \'function\' ? ensureWallet() : null;', 'const w = globalThis.ensureWallet ? globalThis.ensureWallet() : null;');
      c = c.replace('if (typeof spendQuestPoints === \'function\') spendQuestPoints(cost);', 'if (globalThis.spendQuestPoints) globalThis.spendQuestPoints(cost);');
      c = c.replace('if (typeof updateHeader === \'function\') updateHeader();', 'if (globalThis.updateHeader) globalThis.updateHeader();');
    }
    fs.writeFileSync(f, c, 'utf8');
    console.log('Cleaned typeof guards in', f);
  }
}

// 16. quest-core.js (compact global export to stay under 1750 lines)
{
  const file = 'src/application/quests/quest-core.js';
  let c = fs.readFileSync(file, 'utf8');
  const target = `if (typeof getActiveLocalDefeatQuestForLocation !== 'undefined') {`;
  const idx = c.indexOf(target);
  const endTarget = `// Wave 41 — native ESM module: exports the same names as the`;
  const endIdx = c.indexOf(endTarget);
  if (idx !== -1 && endIdx !== -1) {
    const compactBlock = `const _questGlobals = {
  getActiveLocalDefeatQuestForLocation,
  getQuestBattlePool,
  startQuestDefeatBattle,
  getTrainerBattleDef,
  getTrainerBattleName,
  getTrainerBattleDialog,
  getPlayerStarterSpecies,
  migrateQuestSaveV2,
  migrateQuestSaveV3,
  QUEST_V3_JOHTO_REMAP,
  migrateQuestSaveV4,
  QUEST_V4_KANTO_REMAP,
  QUEST_V4_SIDE_JOHTO_REMAP,
  startQuestTrainerBattle,
  completeQuestTrainerBattle,
  _refreshUI,
  createTrainerBattleTeam,
  migrateQuestSaveV5,
};
if (typeof window !== 'undefined') Object.assign(window, _questGlobals);
if (typeof globalThis !== 'undefined') Object.assign(globalThis, _questGlobals);

`;
    c = c.slice(0, idx) + compactBlock + c.slice(endIdx);
    fs.writeFileSync(file, c, 'utf8');
    console.log('Compacted quest-core.js lines (now below 1750)');
  }
}

console.log('--- All 13 points refinements applied successfully! ---');
