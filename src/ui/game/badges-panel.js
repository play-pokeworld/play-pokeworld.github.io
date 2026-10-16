/**
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
  {
    id: 'brock',
    file: 'Boulder',
    region: 'kanto',
    nameFr: 'Badge Roche',
    nameEn: 'Boulder Badge',
    leader: 'Pierre / Brock',
    loc: 'Argenta',
    color: '#998b7a',
  },
  {
    id: 'misty',
    file: 'Cascade',
    region: 'kanto',
    nameFr: 'Badge Cascade',
    nameEn: 'Cascade Badge',
    leader: 'Ondine / Misty',
    loc: 'Azuria',
    color: '#3b92d4',
  },
  {
    id: 'surge',
    file: 'Thunder',
    region: 'kanto',
    nameFr: 'Badge Foudre',
    nameEn: 'Thunder Badge',
    leader: 'Lt. Surge',
    loc: 'Carmin sur Mer',
    color: '#e5b824',
  },
  {
    id: 'erika',
    file: 'Rainbow',
    region: 'kanto',
    nameFr: 'Badge Prisme',
    nameEn: 'Rainbow Badge',
    leader: 'Érika',
    loc: 'Céladopole',
    color: '#4caf50',
  },
  {
    id: 'koga',
    file: 'Soul',
    region: 'kanto',
    nameFr: 'Badge Âme',
    nameEn: 'Soul Badge',
    leader: 'Koga',
    loc: 'Parmanie',
    color: '#9c27b0',
  },
  {
    id: 'sabrina',
    file: 'Marsh',
    region: 'kanto',
    nameFr: 'Badge Marais',
    nameEn: 'Marsh Badge',
    leader: 'Morgane / Sabrina',
    loc: 'Safrania',
    color: '#e91e63',
  },
  {
    id: 'blaine',
    file: 'Volcano',
    region: 'kanto',
    nameFr: 'Badge Volcan',
    nameEn: 'Volcano Badge',
    leader: 'Auguste / Blaine',
    loc: 'Cramois’Île',
    color: '#f44336',
  },
  {
    id: 'giovanni',
    file: 'Earth',
    region: 'kanto',
    nameFr: 'Badge Terre',
    nameEn: 'Earth Badge',
    leader: 'Giovanni',
    loc: 'Jadielle',
    color: '#795548',
  },

  // ── Johto (8) ──
  {
    id: 'falkner',
    file: 'Zephyr',
    region: 'johto',
    nameFr: 'Badge Zéphyr',
    nameEn: 'Zephyr Badge',
    leader: 'Albert / Falkner',
    loc: 'Mauville',
    color: '#80deea',
  },
  {
    id: 'bugsy',
    file: 'Hive',
    region: 'johto',
    nameFr: 'Badge Essaim',
    nameEn: 'Hive Badge',
    leader: 'Hector / Bugsy',
    loc: 'Écorce',
    color: '#8bc34a',
  },
  {
    id: 'whitney',
    file: 'Plain',
    region: 'johto',
    nameFr: 'Badge Plaine',
    nameEn: 'Plain Badge',
    leader: 'Blanche / Whitney',
    loc: 'Doublonville',
    color: '#f06292',
  },
  {
    id: 'morty',
    file: 'Fog',
    region: 'johto',
    nameFr: 'Badge Brume',
    nameEn: 'Fog Badge',
    leader: 'Mortimer / Morty',
    loc: 'Rosalia',
    color: '#7e57c2',
  },
  {
    id: 'chuck',
    file: 'Storm',
    region: 'johto',
    nameFr: 'Badge Choc',
    nameEn: 'Storm Badge',
    leader: 'Chuck',
    loc: 'Irisia',
    color: '#ff7043',
  },
  {
    id: 'jasmine',
    file: 'Mineral',
    region: 'johto',
    nameFr: 'Badge Minéral',
    nameEn: 'Mineral Badge',
    leader: 'Jasmine',
    loc: 'Oliville',
    color: '#b0bec5',
  },
  {
    id: 'pryce',
    file: 'Glacier',
    region: 'johto',
    nameFr: 'Badge Glacier',
    nameEn: 'Glacier Badge',
    leader: 'Frédo / Pryce',
    loc: 'Acajou',
    color: '#4dd0e1',
  },
  {
    id: 'clair',
    file: 'Rising',
    region: 'johto',
    nameFr: 'Badge Lever',
    nameEn: 'Rising Badge',
    leader: 'Sandra / Clair',
    loc: 'Ébénelle',
    color: '#5c6bc0',
  },

  // ── Hoenn (8) ──
  {
    id: 'roxanne',
    file: 'Stone',
    region: 'hoenn',
    nameFr: 'Badge Roche',
    nameEn: 'Stone Badge',
    leader: 'Roxane / Roxanne',
    loc: 'Mérouville',
    color: '#a1887f',
  },
  {
    id: 'brawly',
    file: 'Knuckle',
    region: 'hoenn',
    nameFr: 'Badge Poing',
    nameEn: 'Knuckle Badge',
    leader: 'Bastien / Brawly',
    loc: 'Myokara',
    color: '#ff8a65',
  },
  {
    id: 'wattson',
    file: 'Dynamo',
    region: 'hoenn',
    nameFr: 'Badge Dynamo',
    nameEn: 'Dynamo Badge',
    leader: 'Voltère / Wattson',
    loc: 'Lavandia',
    color: '#ffd54f',
  },
  {
    id: 'flannery',
    file: 'Heat',
    region: 'hoenn',
    nameFr: 'Badge Chaleur',
    nameEn: 'Heat Badge',
    leader: 'Adriane / Flannery',
    loc: 'Vermilava',
    color: '#ff5722',
  },
  {
    id: 'norman',
    file: 'Balance',
    region: 'hoenn',
    nameFr: 'Badge Balancier',
    nameEn: 'Balance Badge',
    leader: 'Norman',
    loc: 'Clémenti-Ville',
    color: '#e0e0e0',
  },
  {
    id: 'winona',
    file: 'Feather',
    region: 'hoenn',
    nameFr: 'Badge Plume',
    nameEn: 'Feather Badge',
    leader: 'Alizée / Winona',
    loc: 'Cimetronelle',
    color: '#81d4fa',
  },
  {
    id: 'tate_liza',
    file: 'Mind',
    region: 'hoenn',
    nameFr: 'Badge Esprit',
    nameEn: 'Mind Badge',
    leader: 'Lévy & Tatia / Tate & Liza',
    loc: 'Algatia',
    color: '#ce93d8',
  },
  {
    id: 'wallace',
    file: 'Rain',
    region: 'hoenn',
    nameFr: 'Badge Pluie',
    nameEn: 'Rain Badge',
    leader: 'Marc / Wallace',
    loc: 'Atalanopolis',
    color: '#29b6f6',
  },
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
  const list = Array.isArray(g.badges)
    ? g.badges
    : Object.keys(g.badges).filter((k) => g.badges[k]);
  if (badgeId === 'wallace') return list.includes('wallace') || list.includes('juan');
  return list.includes(badgeId);
}

function isLeagueDefeated(leagueDef, gState) {
  const g = gState || globalThis.G || {};
  const champs = g.defeatedChamps || {};
  return Boolean(
    champs[leagueDef.champKey] || (leagueDef.altChampKey && champs[leagueDef.altChampKey])
  );
}

function getBadgeImgHtml(badge, obtained) {
  const file = badge.file || 'Boulder';
  const glow = obtained
    ? `filter: drop-shadow(0 0 6px ${badge.color});`
    : 'filter: grayscale(1) opacity(0.35);';
  return `<img src="src/assets/images/badges/${file}.svg" width="48" height="48" alt="${badge.nameEn}" style="${glow} transition: filter 0.2s ease;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" /><div style="display:none;"><svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" fill="${obtained ? badge.color : '#444'}" fill-opacity="${obtained ? '0.85' : '0.3'}" stroke="${obtained ? '#fff' : '#666'}" stroke-width="2"/></svg></div>`;
}

function getLeagueTrophyHtml(beaten) {
  const glow = beaten
    ? 'filter: drop-shadow(0 0 6px #ffd700);'
    : 'filter: grayscale(1) opacity(0.35);';
  return `<img src="src/assets/images/badges/Champion_Stamp.svg" width="40" height="40" alt="Champion Stamp" style="${glow} transition: filter 0.2s ease;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" /><div style="display:none;"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="${beaten ? '#ffd700' : '#555'}" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg></div>`;
}

export function renderBadgesPanel(container) {
  if (!container) return;
  const g = globalThis.G || {};
  const isEn = g.lang === 'en';

  const obtainedCount = BADGE_DEFINITIONS.filter((b) => isBadgeObtained(b.id, g)).length;
  const totalBadges = BADGE_DEFINITIONS.length;

  const beatenLeaguesCount = LEAGUE_DEFINITIONS.filter((l) => isLeagueDefeated(l, g)).length;
  const totalLeagues = LEAGUE_DEFINITIONS.length;

  const filteredBadges =
    currentRegionTab === 'all'
      ? BADGE_DEFINITIONS
      : BADGE_DEFINITIONS.filter((b) => b.region === currentRegionTab);

  const filteredLeagues =
    currentRegionTab === 'all'
      ? LEAGUE_DEFINITIONS
      : LEAGUE_DEFINITIONS.filter((l) => l.id === currentRegionTab);

  const tabsHtml = `
    <div class="pw-badges-tabs" style="display:flex;gap:8px;margin-bottom:14px;justify-content:center;">
      <button type="button" class="hbtn ${currentRegionTab === 'all' ? 'active' : ''}" data-action="legacy-call" data-call="setBadgesRegionTab" data-call-args="'all'">${isEn ? 'All' : 'Tous'}</button>
      <button type="button" class="hbtn ${currentRegionTab === 'kanto' ? 'active' : ''}" data-action="legacy-call" data-call="setBadgesRegionTab" data-call-args="'kanto'">Kanto</button>
      <button type="button" class="hbtn ${currentRegionTab === 'johto' ? 'active' : ''}" data-action="legacy-call" data-call="setBadgesRegionTab" data-call-args="'johto'">Johto</button>
      <button type="button" class="hbtn ${currentRegionTab === 'hoenn' ? 'active' : ''}" data-action="legacy-call" data-call="setBadgesRegionTab" data-call-args="'hoenn'">Hoenn</button>
    </div>
  `;

  let badgesGridHtml =
    '<div class="pw-badges-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(130px, 1fr));gap:12px;margin-bottom:20px;">';
  for (const b of filteredBadges) {
    const obtained = isBadgeObtained(b.id, g);
    const name = isEn ? b.nameEn : b.nameFr;
    badgesGridHtml += `
      <div class="pw-badge-card ${obtained ? 'obtained' : 'locked'}" style="display:flex;flex-direction:column;align-items:center;padding:12px 8px;background:rgba(255,255,255,${obtained ? '0.08' : '0.02'});border:1px solid ${obtained ? b.color : 'rgba(255,255,255,0.06)'};border-radius:8px;text-align:center;">
        <div class="pw-badge-svg" style="margin-bottom:8px;min-height:48px;display:flex;align-items:center;justify-content:center;">${getBadgeImgHtml(b, obtained)}</div>
        <div style="font-weight:bold;font-size:12px;color:${obtained ? '#fff' : 'var(--light1)'};">${name}</div>
        <div style="font-size:10px;color:var(--light1);margin-top:2px;">${b.leader}</div>
        <div style="font-size:9px;color:var(--light2);margin-top:2px;">${b.loc}</div>
      </div>
    `;
  }
  badgesGridHtml += '</div>';

  let leaguesGridHtml =
    '<div class="pw-leagues-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:12px;">';
  for (const l of filteredLeagues) {
    const beaten = isLeagueDefeated(l, g);
    const name = isEn ? l.nameEn : l.nameFr;
    leaguesGridHtml += `
      <div class="pw-league-card ${beaten ? 'obtained' : 'locked'}" style="display:flex;align-items:center;gap:12px;padding:12px;background:rgba(255,255,255,${beaten ? '0.08' : '0.02'});border:1px solid ${beaten ? l.color : 'rgba(255,255,255,0.06)'};border-radius:8px;">
        <div class="pw-league-trophy" style="flex-shrink:0;">${getLeagueTrophyHtml(beaten)}</div>
        <div>
          <div style="font-weight:bold;font-size:12px;color:${beaten ? '#ffd700' : 'var(--light1)'};">${name}</div>
          <div style="font-size:10px;color:var(--light1);margin-top:2px;">${l.loc}</div>
          <div style="font-size:10px;color:${beaten ? 'var(--green)' : 'var(--light2)'};margin-top:3px;font-weight:bold;">
            ${beaten ? (isEn ? '✓ Champion' : '✓ Vaincue') : isEn ? 'Locked' : 'Non vaincue'}
          </div>
        </div>
      </div>
    `;
  }
  leaguesGridHtml += '</div>';

  const html = `
    <div class="pw-badges-panel-container" style="padding:16px;max-width:800px;margin:0 auto;color:var(--text);">
      <div class="pw-badges-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.1);">
        <div>
          <h2 style="margin:0;font-size:18px;">${isEn ? 'Gym Badges & Leagues' : 'Badges & Ligues'}</h2>
          <div style="font-size:12px;color:var(--light1);margin-top:4px;">
            ${isEn ? 'Track your journey across Kanto, Johto, and Hoenn.' : 'Suivez votre progression à travers Kanto, Johto et Hoenn.'}
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:13px;font-weight:bold;color:var(--yellow);">${obtainedCount} / ${totalBadges} ${isEn ? 'badges' : 'badges'}</div>
          <div style="font-size:12px;color:var(--light1);">${beatenLeaguesCount} / ${totalLeagues} ${isEn ? 'leagues' : 'ligues'}</div>
        </div>
      </div>
      ${tabsHtml}
      <h3 style="font-size:14px;margin:12px 0 8px 0;color:var(--light1);">${isEn ? 'Gym Badges' : 'Badges d’Arène'}</h3>
      ${badgesGridHtml}
      <h3 style="font-size:14px;margin:16px 0 8px 0;color:var(--light1);">${isEn ? 'Pokémon Leagues' : 'Ligues Pokémon'}</h3>
      ${leaguesGridHtml}
    </div>
  `;

  globalThis._pwSetHtmlSafe(container, html);
}

export function openBadgesPanel() {
  if (typeof globalThis.openFullscreenPanel === 'function') {
    globalThis.openFullscreenPanel('badges');
  } else if (typeof globalThis.openModal === 'function') {
    const content = document.createElement('div');
    renderBadgesPanel(content);
    globalThis.openModal({
      title:
        globalThis.G && globalThis.G.lang === 'en' ? 'Gym Badges & Leagues' : 'Badges & Ligues',
      content: content.innerHTML,
    });
  }
}

export function setBadgesRegionTab(tab) {
  currentRegionTab = tab || 'all';
  const container =
    document.getElementById('fs-panel-content') ||
    document.querySelector('.pw-badges-panel-container')?.parentElement;
  if (container) {
    renderBadgesPanel(container);
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.renderBadgesPanel = renderBadgesPanel;
  globalThis.openBadgesPanel = openBadgesPanel;
  globalThis.setBadgesRegionTab = setBadgesRegionTab;
}
if (typeof window !== 'undefined') {
  window.renderBadgesPanel = renderBadgesPanel;
  window.openBadgesPanel = openBadgesPanel;
  window.setBadgesRegionTab = setBadgesRegionTab;
}
