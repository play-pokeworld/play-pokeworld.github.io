import fs from 'node:fs';
import { LOCS } from '../src/data/locations-data.js';
import { LOCS_JOHTO } from '../src/data/locations-johto.js';
import { LOCS_HOENN } from '../src/data/locations-hoenn.js';
import { LEVEL_EVO_MAP, EVO_LEVELS, STONE_EVO } from '../src/application/combat/progression.js';
import { MARKET_STOCK, MARKET_PRICE_OVERRIDES, getPokemonPrice } from '../src/domain/economy/market.js';
import { STORY_QUESTS } from '../src/data/story-quests.js';
import { STORY_QUESTS_HOENN } from '../src/data/story-quests-hoenn.js';
import { SIDE_QUESTS } from '../src/data/side-quests-data.js';
import { LEGENDARY_QUESTS } from '../src/data/legendary-quests.js';
import { L_pokemon_names_fr } from '../src/localization/fr/pokemon-names.js';
import { L_pokemon_names_en } from '../src/localization/en/pokemon-names.js';
const POKE_NAMES_FR = L_pokemon_names_fr;
const POKE_NAMES_EN = L_pokemon_names_en;
import { L_fr_quests } from '../src/localization/fr/quests.js';

// Read raw PD from src/data/pd-data.js
const pdFile = fs.readFileSync('src/data/pd-data.js', 'utf8');
const PD = [];
const pdLines = pdFile.split('\n');
for (const line of pdLines) {
  const m = line.match(/PD\[(\d+)\]\s*=\s*\["([^"]+)",\s*"([^"]*)",\s*"([^"]*)",\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)/);
  if (m) {
    const id = Number(m[1]);
    PD[id] = {
      id,
      nameDefault: m[2],
      type1: m[3] || 'Normal',
      type2: m[4] || '',
      hp: Number(m[5]),
      atk: Number(m[6]),
      def: Number(m[7]),
      spa: Number(m[8]),
      spd: Number(m[9]),
      spe: Number(m[10]),
    };
  }
}

// Build locations map
const allLocs = [
  ...Object.entries(LOCS).map(([k, v]) => ({ id: k, region: 'kanto', ...v })),
  ...Object.entries(LOCS_JOHTO).map(([k, v]) => ({ id: k, region: 'johto', ...v })),
  ...Object.entries(LOCS_HOENN).map(([k, v]) => ({ id: k, region: 'hoenn', ...v })),
];

// Roaming pools
const ROAMING_INFO = {
  144: { region: 'kanto', locName: 'Errant / Roaming Kanto (Routes extérieures)' },
  145: { region: 'kanto', locName: 'Errant / Roaming Kanto (Routes extérieures)' },
  146: { region: 'kanto', locName: 'Errant / Roaming Kanto (Routes extérieures)' },
  151: { region: 'kanto', locName: 'Errant / Roaming Kanto (Routes extérieures)' },
  243: { region: 'johto', locName: 'Errant / Roaming Johto (Routes extérieures)' },
  244: { region: 'johto', locName: 'Errant / Roaming Johto (Routes extérieures)' },
  245: { region: 'johto', locName: 'Errant / Roaming Johto (Routes extérieures)' },
  251: { region: 'johto', locName: 'Errant / Roaming Johto (Routes extérieures)' },
  380: { region: 'hoenn', locName: 'Errant / Roaming Hoenn (Routes extérieures)' },
  381: { region: 'hoenn', locName: 'Errant / Roaming Hoenn (Routes extérieures)' },
  385: { region: 'hoenn', locName: 'Errant / Roaming Hoenn (Routes extérieures)' },
  386: { region: 'hoenn', locName: 'Errant / Roaming Hoenn (Routes extérieures)' },
};

const wildByPokemon = {};
for (const loc of allLocs) {
  if (loc.wild && Array.isArray(loc.wild)) {
    for (const w of loc.wild) {
      const pid = Number(w[0]);
      if (!wildByPokemon[pid]) wildByPokemon[pid] = [];
      let locName = loc.name;
      if (pid === 249 && loc.id === 'whirlislands') locName += ' (Après quête #139)';
      if (pid === 250 && loc.id === 'tintower') locName += ' (Après quête #140)';
      wildByPokemon[pid].push({
        locId: loc.id,
        locName,
        region: loc.region,
        minLvl: Number(w[1] || 1),
        maxLvl: Number(w[2] || w[1] || 1),
        rarity: w[3] || 'common',
      });
    }
  }
}

// Add roaming entries
for (const [pidStr, rInfo] of Object.entries(ROAMING_INFO)) {
  const pid = Number(pidStr);
  if (!wildByPokemon[pid]) wildByPokemon[pid] = [];
  wildByPokemon[pid].push({
    locId: 'roaming_' + rInfo.region,
    locName: rInfo.locName,
    region: rInfo.region,
    minLvl: 75,
    maxLvl: 75,
    rarity: 'rare',
  });
}

// Evolution relations
const evoFromMap = {};
for (const [fromIdStr, toId] of Object.entries(LEVEL_EVO_MAP)) {
  const fromId = Number(fromIdStr);
  const lvl = EVO_LEVELS[fromId];
  evoFromMap[toId] = { fromId, type: 'level', level: lvl, details: `Évolution de #${fromId} au niveau ${lvl}` };
}
for (const [fromIdStr, stones] of Object.entries(STONE_EVO)) {
  const fromId = Number(fromIdStr);
  for (const [stone, toId] of Object.entries(stones)) {
    evoFromMap[toId] = { fromId, type: 'stone', stone, details: `Évolution de #${fromId} via ${stone}` };
  }
}

// Special evolutions
evoFromMap[237] = { fromId: 236, type: 'special', details: 'Évolution de Debugant (#236) au niveau 20 si Attaque = Défense' };
evoFromMap[106] = { fromId: 236, type: 'special', details: 'Évolution de Debugant (#236) au niveau 20 si Attaque > Défense (ou Dojo Safrania / Marché Noir)' };
evoFromMap[107] = { fromId: 236, type: 'special', details: 'Évolution de Debugant (#236) au niveau 20 si Défense > Attaque (ou Marché Noir)' };
evoFromMap[266] = { fromId: 265, type: 'level', level: 7, details: 'Évolution de Chenipotte (#265) au niveau 7 (Armulys)' };
evoFromMap[268] = { fromId: 265, type: 'level', level: 7, details: 'Évolution de Chenipotte (#265) au niveau 7 (Blindalys)' };
evoFromMap[267] = { fromId: 266, type: 'level', level: 10, details: 'Évolution d’Armulys (#266) au niveau 10 (Charmillon)' };
evoFromMap[269] = { fromId: 268, type: 'level', level: 10, details: 'Évolution de Blindalys (#268) au niveau 10 (Papinox)' };
evoFromMap[291] = { fromId: 290, type: 'level', level: 20, details: 'Évolution de Ningale (#290) au niveau 20 (Ninjask)' };
evoFromMap[292] = { fromId: 290, type: 'special', details: 'Apparaît lors de l’évolution de Ningale (#290) au niveau 20 (Munja)' };

// Quests mapping
const allQuests = [
  ...STORY_QUESTS.map(q => ({ cat: 'main', ...q })),
  ...STORY_QUESTS_HOENN.map(q => ({ cat: 'main', ...q })),
  ...Object.entries(SIDE_QUESTS).map(([k, q]) => ({ cat: 'side', qid: k, ...q })),
  ...Object.entries(LEGENDARY_QUESTS || {}).map(([k, q]) => ({ cat: 'legendary', qid: k, ...q })),
];

const questsByPokemon = {};
for (const q of allQuests) {
  if (q.rewardPoke) {
    const pid = Number(q.rewardPoke);
    if (!questsByPokemon[pid]) questsByPokemon[pid] = [];
    const title = (L_fr_quests.main && L_fr_quests.main[q.id]?.title) ||
                  (L_fr_quests.side && L_fr_quests.side[q.qid]?.title) ||
                  (L_fr_quests.legendary && L_fr_quests.legendary[q.qid]?.title) ||
                  `Quête #${q.id || q.qid}`;
    questsByPokemon[pid].push({
      id: q.id || q.qid,
      cat: q.cat,
      region: q.region,
      title,
      shiny: !!q.rewardShiny,
      level: q.rewardLevel || 1,
    });
  }
}

// Market mapping
const marketByPokemon = {};
for (const [reg, list] of Object.entries(MARKET_STOCK)) {
  for (const pid of list) {
    const price = MARKET_PRICE_OVERRIDES[pid] || 150000;
    marketByPokemon[pid] = { region: reg, price };
  }
}

// Fossils mapping
const fossilsMap = {
  138: { item: 'helix_fossil', name: 'Fossile Nautile' },
  140: { item: 'dome_fossil', name: 'Fossile Dôme' },
  142: { item: 'old_amber', name: 'Vieil Ambre' },
  345: { item: 'root_fossil', name: 'Fossile Racine' },
  347: { item: 'claw_fossil', name: 'Fossile Griffe' },
};

// Breeding mapping
const breedingMap = {
  172: { parents: 'Pikachu (#25) ou Raichu (#26)', name: 'Pichu' },
  173: { parents: 'Mélofée (#35) ou Mélodelfe (#36)', name: 'Mélo' },
  174: { parents: 'Rondoudou (#39) ou Grodoudou (#40)', name: 'Toudoudou' },
  175: { parents: 'Togetic (#176)', name: 'Togepi' },
  236: { parents: 'Kicklee (#106), Tygnon (#107) ou Kapoera (#237)', name: 'Debugant' },
  238: { parents: 'Lippoutou (#124)', name: 'Lippouti' },
  239: { parents: 'Élektek (#125)', name: 'Élékid' },
  240: { parents: 'Magmar (#126)', name: 'Magby' },
  298: { parents: 'Marill (#183) ou Azumarill (#184)', name: 'Azurill' },
  360: { parents: 'Qulbutoké (#202)', name: 'Okéoké' },
};

// Starters
const starterIds = [1, 4, 7, 152, 155, 158, 252, 255, 258];

const result = [];
for (let i = 1; i <= 386; i++) {
  const p = PD[i] || {
    id: i,
    nameDefault: POKE_NAMES_EN[i] || 'Pokemon ' + i,
    type1: 'Normal',
    type2: '',
    hp: 50, atk: 50, def: 50, spa: 50, spd: 50, spe: 50,
  };
  const nameFr = POKE_NAMES_FR[i] || p.nameDefault;
  const nameEn = POKE_NAMES_EN[i] || p.nameDefault;
  const reg = i <= 151 ? 'Kanto' : i <= 251 ? 'Johto' : 'Hoenn';

  const wilds = wildByPokemon[i] || [];
  const evo = evoFromMap[i] || null;
  const market = marketByPokemon[i] || null;
  const quests = questsByPokemon[i] || [];
  const fossil = fossilsMap[i] || null;
  const breed = breedingMap[i] || null;
  const isStarter = starterIds.includes(i);

  // Determine main method
  let primary = 'Sauvage';
  if (wilds.length > 0) primary = 'Sauvage';
  else if (evo) primary = 'Évolution';
  else if (quests.length > 0) primary = 'Quête';
  else if (fossil) primary = 'Fossile';
  else if (breed) primary = 'Pension';
  else if (isStarter) primary = 'Starter / Choix';
  else if (market) primary = 'Marché Noir';

  result.push({
    dex: i,
    nameFr,
    nameEn,
    type1: p.type1,
    type2: p.type2,
    region: reg,
    primaryMethod: primary,
    isStarter,
    wilds,
    evolution: evo,
    market,
    quests,
    fossil,
    breeding: breed,
    stats: { hp: p.hp, atk: p.atk, def: p.def, spa: p.spa, spd: p.spd, spe: p.spe },
  });
}

fs.writeFileSync('/tmp/pokedex_data.json', JSON.stringify({ pokemon: result, locations: allLocs }, null, 2));
console.log('Successfully exported pokedex data for', result.length, 'Pokemon.');
