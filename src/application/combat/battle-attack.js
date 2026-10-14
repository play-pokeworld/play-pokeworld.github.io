// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.

// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
}

function getBattleSideCard(side){
 const row = document.getElementById('battle-team-row');
 if(!row) return null;
 if(side === 'enemy') return row.querySelector('.poke-card:first-child');
 return row.querySelector('.poke-card.active') || row.querySelector('.poke-card:nth-child(2)');
}
function battleTypeColor(type){ return (typeof TYPE_COLORS !== 'undefined' && TYPE_COLORS[type]) ? TYPE_COLORS[type] : 'var(--light2)'; }
function battleEffShort(mult){
 if(mult === 0) return (typeof t === 'function' ? t('eff_immune') : '×0');
 if(mult >= 4) return (typeof t === 'function' ? t('eff_4x') : '×4');
 if(mult >= 2) return (typeof t === 'function' ? t('eff_2x') : '×2');
 if(mult <= 0.25) return (typeof t === 'function' ? t('eff_quarter') : '×¼');
 if(mult <= 0.5) return (typeof t === 'function' ? t('eff_half') : '×½');
 return '';
}
function battleEffKind(mult){
 if(mult === 0) return 'immune';
 if(mult >= 2) return 'super';
 if(mult < 1) return 'resist';
 return 'normal';
}
// DORM-01 — normalise les graphies météo (rain/rainy, sun/sunny, sand/sandstorm…).
function normalizeWeather(w){
 const v = String(w || 'none').toLowerCase();
 if(v === 'rainy') return 'rain';
 if(v === 'sun' ) return 'sun';
 if(v === 'sunny') return 'sun';
 if(v === 'sand') return 'sand';
 if(v === 'sandstorm') return 'sand';
 if(v === 'hail' || v === 'snow') return 'hail';
 if(v === 'none' || v === '') return 'none';
 return v;
}
function normalizeTerrain(t){
 const v = String(t || 'none').toLowerCase();
 if(v === 'foggy') return 'psychic';
 return v;
}
// DORM-02j — puissance des objets tenus selon le nombre possédé (comme
// PokeChill). PokeChill monte à 20 (5 paliers) ; le sac PokéWorld plafonne
// à 25 → 6 paliers (le 6ᵉ atteint à 25). Miroir local de
// ItemEngine.getPowerLevel (le moteur de combat ne dépend pas d'item-engine).
function heldPowerLevel(qty){
 const q = Math.max(0, Number(qty) || 0);
 if(q >= 25) return 6;
 if(q >= 20) return 5;
 if(q >= 15) return 4;
 if(q >= 10) return 3;
 if(q >= 5) return 2;
 return 1;
}
function heldItemPower(itemKey){
 if(!itemKey || typeof ITEMS === 'undefined' || !ITEMS[itemKey]) return 1;
 const itm = ITEMS[itemKey];
 if(!itm || !itm.powerFormula) return 1;
 const qty = (typeof G !== 'undefined' && G && G.inventory) ? (G.inventory[itemKey] || 0) : 0;
 try { return Function('level', '"use strict"; return (' + itm.powerFormula + ')')(heldPowerLevel(qty)); }
 catch(_e){ return 1; }
}
// DORM-02j — un objet tenu par un NPC (dresseur officiel, Atoll) ne dépend
// JAMAIS de l'inventaire du joueur : il garde la valeur canonique historique
// (celle d'avant la mise à l'échelle 1→25). Aucun bonus n'est ajouté à
// l'ennemi : son objet s'applique exactement comme celui du joueur, à sa
// valeur de référence.
function npcHeldItemMult(itemKey){
 if(!itemKey || typeof ITEMS === 'undefined' || !ITEMS[itemKey]) return 1;
 const itm = ITEMS[itemKey];
 if(!itm || !itm.powerFormula) return 1;
 if(itemKey === 'choice_band' || itemKey === 'choice_specs') return 1.5;
 if(itemKey === 'life_orb') return 1.3;
 // Muscle Band est « type_boost » en catégorie mais s'applique à part (physique).
 if(itemKey === 'muscle_band') return 1.1;
 if(itemKey === 'light_clay') return 1.06;
 if(itemKey === 'heavy_duty_boots') return 1.15;
 if(itm.category === 'type_boost') return 1.3;
 return 1;
}
function heldItemMultFor(itemKey, side){
 if(side === 'enemy') return npcHeldItemMult(itemKey);
 return heldItemPower(itemKey);
}
// DORM-02h — Herbe Mentale : les statuts subis durent 1 tour de moins.
function heldStatusTurns(poke, turns, applier){
 if(!poke || turns == null) return turns;
 let t = Math.floor(Number(turns) || 0);
 const held = (typeof getHeldItemForPokemon === 'function') ? getHeldItemForPokemon(poke) : (poke && poke.heldItem);
 if(held === 'mental_herb') t = Math.max(1, t - 1);
 // DORM-04 — Color Spore : les statuts appliqués durent ×3 plus longtemps.
 const _cs = applier && ((typeof hasTalent === 'function' && hasTalent(applier, 'colorspore')) || String(applier.talent || '').toLowerCase() === 'colorspore');
 if(_cs) t = Math.max(1, t * 3);
 return t;
}
// DORM-04 — Climatact : la météo invoquée dure 15 tours.
function weatherTurnsFor(poke, base){
 const t = poke && (String(poke.talent || '').toLowerCase() === 'climatact'
   || (typeof getPokemonHiddenTalent === 'function' && getPokemonHiddenTalent(poke) === 'climatact'));
 return t ? 15 : base;
}
// DORM-04 — Synchro : renvoie le statut actif à celui qui l'a infligé.
function syncStatusBack(attacker, defender){
 if(!attacker || !defender || !attacker.status || !defender.status) return;
 const hasSync = String(defender.talent || '').toLowerCase() === 'synchronize'
   || (typeof getPokemonHiddenTalent === 'function' && getPokemonHiddenTalent(defender) === 'synchronize');
 if(!hasSync) return;
 if(typeof isImmuneToStatus === 'function' && isImmuneToStatus(attacker, defender.status, (typeof battle !== 'undefined' && battle) ? battle.weather : null)) return;
 attacker.status = defender.status;
 attacker.statusTurns = heldStatusTurns(attacker, defender.statusTurns || 2);
 addBattleLog(`${defender.name} renvoie son statut via Synchro !`);
}
// ── DORM-06 — baies tenues (aucune consommée ; effets par catégorie) ──────
function berryHeld(poke){
 const held = (typeof getHeldItemForPokemon === 'function') ? getHeldItemForPokemon(poke) : (poke && poke.heldItem);
 if(!held || !/_berry$/.test(String(held))) return null;
 const itm = (typeof ITEMS !== 'undefined' && ITEMS[held]) ? ITEMS[held] : null;
 return itm ? { key: held, itm } : null;
}
function berryLevel(poke, key, side){
 const qty = (typeof G !== 'undefined' && G && G.inventory) ? (G.inventory[key] || 0) : 0;
 if(side === 'enemy') return 3; // valeur canonique NPC (10 exemplaires)
 return qty>=25?6:qty>=20?5:qty>=15?4:qty>=10?3:qty>=5?2:1;
}
function berryPowerVal(key, level){
 const itm = (typeof ITEMS !== 'undefined' && ITEMS[key]) ? ITEMS[key] : null;
 if(!itm || !itm.powerFormula) return 1;
 try{ return Function('level', '"use strict"; return (' + itm.powerFormula + ')')(level); }catch(_){ return 1; }
}
function berryUsed(poke, flag){ try{ return poke[flag] === (battle && battle.berryEpoch); }catch(_){ return false; } }
function berryMark(poke, flag){ try{ if(battle) poke[flag] = battle.berryEpoch; }catch(_){} }

// DORM-02h — Poing Chance : capacités de poing (famille Iron Fist).
function isPunchMove(moveId){
 return /_punch$/.test(String(moveId || ''));
}
// DORM-04 — familles de capacités « divers » (vocabulaire PokeChill).
function isFangMove(moveId){ return /_fang$/.test(String(moveId || '')); }
function isClawMove(moveId){ return /_claw$/.test(String(moveId || '')); }
function isPulseMove(moveId){ return /_pulse$/.test(String(moveId || '')); }
const SHARP_MOVES = {
 bitter_blade:1, cut:1, fury_cutter:1, leaf_blade:1, night_slash:1,
 psycho_cut:1, razor_leaf:1, razor_shell:1, razor_talons:1, slash:1,
 solar_blade:1, x_scissor:1,
};
function isSharpMove(moveId){ return !!SHARP_MOVES[String(moveId || '')]; }
const HEAD_MOVES = { head_charge:1, headlong_rush:1, iron_head:1, zen_headbut:1 };
function isHeadMove(moveId){ return !!HEAD_MOVES[String(moveId || '')]; }
const SOUND_MOVES = {
 alluring_voice:1, bug_buzz:1, chatter:1, disarming_voice:1, echoed_voice:1,
 growl:1, hyper_voice:1, metal_sound:1, noble_roar:1, relic_song:1,
 roar_of_time:1, screech:1, snarl:1, sparkling_aria:1,
};
function isSoundMove(moveId){ return !!SOUND_MOVES[String(moveId || '')]; }
const DANCE_MOVES = {
 dragon_dance:1, feather_dance:1, fiery_dance:1, quiver_dance:1,
 revelation_dance:1, swords_dance:1,
};
function isDanceMove(moveId){ return !!DANCE_MOVES[String(moveId || '')]; }
const WIND_MOVES = {
 fairy_wind:1, gust:1, hurricane:1, icy_wind:1, ominous_wind:1,
 silver_wind:1, tailwind:1,
};
function isWindMove(moveId){ return !!WIND_MOVES[String(moveId || '')]; }
// DORM-04 — effets secondaires des ATTAQUES (source : desc PokeChill).
// 103 capacités offensives ont un effet secondaire dans leur description
// (statut, baisse/hausse de stats, flinch, précision) sans champ structuré.
const STATUS_WORDS = { burn:'burn', freeze:'freeze', paralysis:'para', poisoned:'poison', poison:'poison', confusion:'confuse', sleep:'sleep' };
function _pwSecondaryFromDesc(mv){
  const d = String(mv.desc || '');
  const out = { status:null, statusChance:0, drops:[], boosts:[], selfDrops:[], flinch:0, accDown:0 };
  // 1) statut : « X% chance to inflict Burn » / « Has a chance to burn the target. »
  let m = d.match(/(\d+)%\s+chance to inflict\s+([A-Za-z]+)/);
  if(m){ const st = STATUS_WORDS[String(m[2]).toLowerCase()]; if(st){ out.status = st; out.statusChance = parseInt(m[1],10); } }
  if(!out.status && /has a chance to (freeze|burn|paralyze) the target/i.test(d)){
    const m2 = d.match(/has a chance to (freeze|burn|paralyze)/i);
    out.status = STATUS_WORDS[String(m2[1]).toLowerCase()]; out.statusChance = 30;
  }
  if(!out.status && /chance to inflict (Burn,Paralysis or Freeze)/.test(d)){
    const r = ['burn','para','freeze'][Math.floor(Math.random()*3)];
    out.status = r; out.statusChance = 10;
  }
  // 2) baisses : « X% chance to decrease enemy [Stat] by N% »
  const dropRe = /(\d+)%\s+chance to decrease enemy\s+([A-Za-z ]+?)\s+by\s+(\d+)%/g;
  while((m = dropRe.exec(d))){
    const st = STAT_WORD_MAP[String(m[2]).toLowerCase().trim()];
    if(st) out.drops.push({ stat: st, pct: parseInt(m[3],10), chance: parseInt(m[1],10) });
  }
  // 3) hausses : « X% chance to increase [Stat|all Stats] by N% »
  const upRe = /(\d+)%\s+chance to increase\s+([A-Za-z ]+?)\s+by\s+(\d+)%/g;
  while((m = upRe.exec(d))){
    const pct = parseInt(m[3],10), ch = parseInt(m[1],10);
    const what = String(m[2]).toLowerCase().trim();
    if(what === 'all stats'){ for(const k of ['atk','def','spa','spd','spe']) out.boosts.push({stat:k, pct, chance:ch}); }
    else if(STAT_WORD_MAP[what]) out.boosts.push({ stat: STAT_WORD_MAP[what], pct, chance:ch });
  }
  // 4) « Has a chance to lower the target's X by one stage » (défense/attaque)
  let m3 = d.match(/chance to lower the target(?:'s|’s)\s+(\w+)/i);
  if(m3){
    const st = { defense:'def', attack:'atk', accuracy:'acc' }[String(m3[1]).toLowerCase()];
    if(st === 'def' || st === 'atk') out.drops.push({ stat: st, pct: 50, chance: 30 });
    else if(st === 'acc') out.accDown = 30;
  }
  // 5) flinch : « Has a chance to make the target flinch. »
  if(/make the target flinch/i.test(d)) out.flinch = 20;
  // 6) auto-débuff : « Decreases [Stat] by N% » (SANS « enemy » → le porteur).
  if(!/decreases enemy/i.test(d)){
    const selfRe = /decreases\s+([A-Za-z ]+?)\s+by\s+(\d+)%/g;
    while((m = selfRe.exec(d))){
      const what = String(m[1]).toLowerCase().trim();
      const pct = parseInt(m[2],10);
      if(what === 'defense, special defense'){
        out.selfDrops.push({stat:'def', pct, chance:100});
        out.selfDrops.push({stat:'spd', pct, chance:100});
      } else if(STAT_WORD_MAP[what]){
        out.selfDrops.push({stat: STAT_WORD_MAP[what], pct, chance:100});
      }
    }
  }
  return out;
}
// DORM-04 — recul / drain (source : desc PokeChill).
const RECOIL_MAP = { doubleedge:0.25, head_charge:0.25, chloroblast:0.25 };
function _pwRecoilOf(mv){
  const id = String(mv.id || '');
  if(RECOIL_MAP[id]) return RECOIL_MAP[id];
  if(id === 'mind_blown') return 0.5; // la moitié des PV MAX
  return 0;
}
const DRAIN_MAP = { bitter_blade:0.5 };
function _pwDrainOf(mv){ return DRAIN_MAP[String(mv.id || '')] || 0; }
// DORM-04 — talents « -ate » (PokeChill) : les capacités Normal deviennent
// du type indiqué et gagnent ×1,3.
const ATE_MAP = {
 aerilate:'Flying', pixilate:'Fairy', galvanize:'Electric', pyrolate:'Fire',
 toxilate:'Poison', hydrolate:'Water', glaciate:'Ice', gloomilate:'Dark',
 ferrilate:'Steel', espilate:'Psychic', chrysilate:'Bug', dragonmaw:'Dragon',
 terralate:'Ground', verdify:'Grass',
};
function isImmuneToStatus(poke, statusName, weather) {
 if (!poke) return false;
 // DORM-04 — écran Safeguard : toute l'équipe est protégée des statuts.
 try { if (typeof battle !== 'undefined' && battle && battle.weather === 'safeguard') return true; } catch(_){}
 // DORM-04 — voiles d'équipe (PokeChill) : un coéquipier porteur protège tout le monde.
 try {
  if (typeof G !== 'undefined' && G && Array.isArray(G.team)) {
   for (const tp of G.team) {
    if (!tp || Number(tp.currentHP ?? tp.hp ?? 1) <= 0) continue;
    const _v = String(tp.talent || '').toLowerCase();
    if (statusName === 'para' && (_v === 'flowerveil' || (typeof hasTalent === 'function' && hasTalent(tp, 'flowerveil')))) return true;
    if (statusName === 'burn' && (_v === 'aromaveil' || (typeof hasTalent === 'function' && hasTalent(tp, 'aromaveil')))) return true;
    if (statusName === 'confuse' && (_v === 'sweetveil' || (typeof hasTalent === 'function' && hasTalent(tp, 'sweetveil')))) return true;
    if ((statusName === 'poison' || statusName === 'badpoison') && (_v === 'pastelveil' || (typeof hasTalent === 'function' && hasTalent(tp, 'pastelveil')))) return true;
   }
  }
 } catch(_){}
 const tal = poke.talent;
 if (tal === 'insomnia' && statusName === 'sleep') return true;
 if (tal === 'immunity' && (statusName === 'poison' || statusName === 'badpoison')) return true;
 if (tal === 'limber' && statusName === 'para') return true;
 if (tal === 'owntempo' && statusName === 'confuse') return true;
 if (tal === 'magmaarmor' && statusName === 'freeze') return true;
 if (tal === 'waterveil' && statusName === 'burn') return true;
 if (tal === 'hydratation' && (weather === 'rainy' || weather === 'rain')) return true;
 if (tal === 'wonderskin' && chance(50)) return true;
 // DORM-06 — baies d'immunité (Cheri → Persim) : immunité totale au statut.
 const bImm = berryHeld(poke);
 if(bImm && bImm.itm.category === 'immunity_berry' && bImm.itm.immunity === statusName) return true;
 // DORM-04 — *pelt : immunité aux statuts tant que la météo/le terrain correspond.
 const peltMap = {
  moistpelt:'rain', fierypelt:'sun', sandypelt:'sand', icypelt:'hail',
  grassypelt:'grassy', pixiepelt:'psychic', spikypelt:'electric', blackpelt:'somber'
 };
 if (peltMap[tal]) {
  const w = normalizeWeather((typeof battle !== 'undefined' && battle) ? battle.weather : weather);
  const terr = normalizeTerrain((typeof battle !== 'undefined' && battle) ? battle.terrain : null);
  if (w === peltMap[tal] || terr === peltMap[tal]) return true;
 }
 return false;
}
function spawnBattleFloat(side, text, kind='normal', sub=''){
 const card = getBattleSideCard(side);
 if(!card) return;
 const el = document.createElement('div');
 el.className = `battle-float ${kind}`;
 _pwSetHtmlSafe(el, `<b>${text}</b>${sub?`<span>${sub}</span>`:''}`);
 card.appendChild(el);
 setTimeout(()=>el.remove(), 1100);
}
function spawnBattleChip(side, text, kind='move', type=''){
 const card = getBattleSideCard(side);
 if(!card || !text) return;
 const el = document.createElement('div');
 el.className = `battle-chip ${kind}`;
 if(type) el.style.setProperty('--chip-color', battleTypeColor(type));
 el.textContent = text;
 card.appendChild(el);
 setTimeout(()=>el.remove(), 1300);
 addBattleTimeline(text, kind, type);
}
function ensureBattleTimeline(){
 const scene = document.getElementById('battle-active-scene');
 if(!scene) return null;
 let tl = document.getElementById('battle-visual-timeline');
 if(!tl){
  tl = document.createElement('div');
  tl.id = 'battle-visual-timeline';
  scene.insertBefore(tl, scene.firstChild);
 }
 return tl;
}
function addBattleTimeline(text, kind='normal', type=''){
 const tl = ensureBattleTimeline();
 if(!tl || !text) return;
 const chip = document.createElement('span');
 chip.className = `battle-timeline-chip ${kind}`;
 if(type) chip.style.setProperty('--chip-color', battleTypeColor(type));
 chip.textContent = text;
 tl.appendChild(chip);
 while(tl.children.length > 8) tl.firstChild.remove();
}
function visualMoveUsed(side, moveId, mv){
 const name = typeof getMoveName === 'function' ? getMoveName(moveId) : moveId;
 spawnBattleChip(side, name, 'move', mv && mv.type);
 const card = getBattleSideCard(side);
 if(card){
  card.querySelectorAll('.poke-move').forEach(el=>{
   if((el.textContent||'').includes(name)){
    el.classList.add('visual-firing');
    setTimeout(()=>el.classList.remove('visual-firing'), 450);
   }
  });
 }
}
function visualDamage(attackerSide, damage, eff, crit){
 const targetSide = attackerSide === 'player' ? 'enemy' : 'player';
 const sub = [battleEffShort(eff), crit ? 'CRIT' : ''].filter(Boolean).join(' ');
 const kind = crit ? 'crit' : battleEffKind(eff);
 spawnBattleFloat(targetSide, '-' + damage, kind, sub);
 if(eff !== 1 || crit) addBattleTimeline(`${damage}${sub?` ${sub}`:''}`, kind);
 // P3 · ANI-01 — secousse de 200 ms sur la rangée touchée quand le coup est
 // super-efficace ou critique. Passe par shakeElement(), donc l'interrupteur
 // unique des réglages (et prefers-reduced-motion) la neutralise.
 if((eff > 1 || crit) && typeof shakeElement === 'function' && typeof document !== 'undefined'){
  try{
   const row = document.getElementById('battle-team-row');
   if(row){
    const cards = row.querySelectorAll('.poke-card');
    const target = (targetSide === 'enemy') ? cards[0] : row.querySelector('.poke-card.active');
    if(target) shakeElement(target);
   }
  }catch(_){}
 }
}
function visualHeal(side, amount, label=''){
 spawnBattleFloat(side, '+' + amount, 'heal', label);
 addBattleTimeline(`+${amount}${label?` ${label}`:''}`, 'heal');
}
function visualStatus(side, status){
 if(!status || typeof statusLabel !== 'function') return;
 spawnBattleFloat(side, statusLabel(status), 'status ' + status, '');
 addBattleTimeline(statusLabel(status), 'status ' + status);
}
function visualTalent(side, talent, detail=''){
 const name = typeof getTalentName === 'function' ? getTalentName(talent) : talent;
 spawnBattleChip(side, detail ? `${name} ${detail}` : name, 'talent');
}
function visualItem(side, item, detail=''){
 const name = typeof getItemName === 'function' ? getItemName(item) : item;
 spawnBattleChip(side, detail ? `${name} ${detail}` : name, 'item');
}
function visualStatusChanges(attackerSide, prevAttackerStatus, prevDefenderStatus, attacker, defender){
 const defenderSide = attackerSide === 'player' ? 'enemy' : 'player';
 if(attacker && attacker.status && attacker.status !== prevAttackerStatus) visualStatus(attackerSide, attacker.status);
 if(defender && defender.status && defender.status !== prevDefenderStatus) visualStatus(defenderSide, defender.status);
}

function transformPokemon(attacker, defender, _side){
 if(!attacker || !defender) return false;
 if(attacker._transformed){
   addBattleLog(`${attacker.name} est déjà transformé !`);
   return true;
 }
 const hpRatio = attacker.maxHP ? attacker.currentHP / attacker.maxHP : 1;
 attacker._transformBackup = {
   id: attacker.id, name: attacker.name, emoji: attacker.emoji,
   type1: attacker.type1, type2: attacker.type2,
   maxHP: attacker.maxHP, atk: attacker.atk, def: attacker.def, spa: attacker.spa, spd: attacker.spd, spe: attacker.spe,
   talent: attacker.talent, moves: (attacker.moves||[]).map(m=>({...m})), shinyActive: attacker.shinyActive, shiny: attacker.shiny
 };
 attacker._transformed = true;
 attacker._transformedFrom = defender.id;
 attacker.id = defender.id;
 attacker.name = (attacker._transformBackup.name || (typeof t === 'function' ? t('ditto') : 'Métamorph')) + ' → ' + defender.name;
 attacker.emoji = defender.emoji;
 attacker.type1 = defender.type1;
 attacker.type2 = defender.type2;
 attacker.maxHP = defender.maxHP;
 attacker.currentHP = Math.max(1, Math.min(attacker.maxHP, Math.floor(attacker.maxHP * hpRatio)));
 attacker.atk = defender.atk;
 attacker.def = defender.def;
 attacker.spa = defender.spa || defender.atk;
 attacker.spd = defender.spd || defender.def;
 attacker.spe = defender.spe;
 attacker.talent = defender.talent;
 attacker.moves = (defender.moves||[]).map(m=>({id:m.id}));
 attacker.shinyActive = defender.shinyActive || defender.shiny;
 attacker.shiny = attacker.shinyActive;
 addBattleLog(tr('battle_transform_log', {source:attacker._transformBackup.name, target:defender.name}));
 try{ renderMoveButtons(); }catch(_){}
 try{ renderBattleTeamRow(); }catch(_){}
 updateBattleUI();
 return true;
}
function restoreTransformedPokemon(p){
 if(!p || !p._transformed || !p._transformBackup) return;
 const b = p._transformBackup;
 const hpRatio = p.maxHP ? p.currentHP / p.maxHP : 1;
 p.id=b.id; p.name=b.name; p.emoji=b.emoji; p.type1=b.type1; p.type2=b.type2;
 p.maxHP=b.maxHP; p.currentHP=Math.max(0, Math.min(p.maxHP, Math.floor(p.maxHP*hpRatio)));
 p.atk=b.atk; p.def=b.def; p.spa=b.spa; p.spd=b.spd; p.spe=b.spe;
 p.talent=b.talent; p.moves=(b.moves||[]).map(m=>({...m}));
 p.shinyActive=b.shinyActive; p.shiny=b.shiny;
 delete p._transformed; delete p._transformedFrom; delete p._transformBackup;
}
function restoreAllTransformedPokemon(){
 try{ (G.team||[]).forEach(restoreTransformedPokemon); }catch(_){}
 try{ Object.values(G.collection||{}).forEach(restoreTransformedPokemon); }catch(_){}
 try{ (G.hatchery||[]).forEach(s=>s&&s.poke&&restoreTransformedPokemon(s.poke)); }catch(_){}
 try{ if(battle&&battle.enemyPoke) restoreTransformedPokemon(battle.enemyPoke); }catch(_){}
 try{ if(battle&&battle.champTeam) battle.champTeam.forEach(restoreTransformedPokemon); }catch(_){}
}

function handleStatusBeforeMove(poke, _side){
 // DORM-04 — flinch : la cible saute sa prochaine action.
 if(poke && poke._flinch){
  poke._flinch = false;
  addBattleLog(`${poke.name} tressaille et rate son tour !`);
  updateBattleUI();
  return false;
 }
 // DORM-06 — Baie Prine (Lum) : soigne tous les statuts une fois par combat.
 const bLum = berryHeld(poke);
 if(bLum && bLum.itm.category === 'cure_all' && poke && poke.status && !berryUsed(poke, '_lumUsed')){
  poke.status = null; poke.statusTurns = 0; berryMark(poke, '_lumUsed');
  addBattleLog(`${poke.name} est guéri par sa Baie Prine !`);
 }
 const s=poke.status;
 if(!s) return true;
 if(s==='sleep'){
 poke.statusTurns=(poke.statusTurns||1)-1;
 if(poke.statusTurns<=0){
 poke.status=null;poke.statusTurns=0;
 addBattleLog(tr('woke_up_log', {name:poke.name}));
 } else {
 addBattleLog(tr('sleeping_turns_log', {name:poke.name, turns:poke.statusTurns, plural:poke.statusTurns>1?'s':''}));
 updateBattleUI();return false;
 }
 }
 if(s==='freeze'){
 
 if(poke.statusTurns && poke.statusTurns > 0){
 poke.statusTurns--;
 if(poke.statusTurns <= 0){ poke.status=null; poke.statusTurns=0; addBattleLog(tr('thawed_log', {name:poke.name})); return true; }
 }
 if(chance(20)){poke.status=null;poke.statusTurns=0;addBattleLog(tr('thawed_log', {name:poke.name}));}
 else{addBattleLog(tr('frozen_skip_log', {name:poke.name}));updateBattleUI();return false;}
 }
 if(s==='para'){
 if(chance(25)){addBattleLog(tr('paralyzed_skip_log', {name:poke.name}));updateBattleUI();return false;}
 }
 if(s==='confuse'){
 poke.statusTurns=(poke.statusTurns||1)-1;
 if(poke.statusTurns<=0){ poke.status=null; poke.statusTurns=0; addBattleLog(`${poke.name} n'est plus confus !`); }
 else if(chance(50)){ addBattleLog(`${poke.name} se blesse dans sa confusion !`); updateBattleUI(); return false; }
 }
 return true;
}


function playAttackAnim(side){
 const el = side === 'player' ? document.querySelector('.active-hero .poke-sprite') : document.getElementById('e-sprite');
 if(!el) return;
 const cls=side==='player'?'atk-anim-player':'atk-anim-enemy';
 el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
 setTimeout(()=>el.classList.remove(cls),400);
}

function playHitAnim(side){
 const el = side === 'player' ? document.getElementById('e-sprite') : document.querySelector('.active-hero .poke-sprite');
 if(!el) return;
 el.classList.remove('hit-anim'); void el.offsetWidth; el.classList.add('hit-anim');
 setTimeout(()=>el.classList.remove('hit-anim'),350);
}


// ── DORM-04 — capacités de statut (PokeChill) ──────────────────────────────
// Les 91 capacités « cat:stat » étaient inertes (seuls les statuts simples
// passaient). Cette fonction interprète leurs descriptions PokeChill et les
// applique réellement : hausses/baisses de stats (50% → ×1,5 · 75% → ×1,75 ·
// 100% → ×2 · 150% → ×2,5), météos/écrans/salles, ajout de type temporaire,
// et les cas spéciaux (memento, clonage, métronome…).
const STAT_WORD_RE = /(special attack|special defense|attack|defense|speed|all stats)/g;
const STAT_WORD_MAP = {
  'special attack':'spa', 'special defense':'spd', 'attack':'atk',
  'defense':'def', 'speed':'spe',
};
function _parseStatPcts(text){
  const out = [];
  const re = /(special attack|special defense|attack|defense|speed|all stats)(?:\s+and\s+(special attack|special defense|attack|defense|speed|all stats))?\s+by\s+(\d+)%/g;
  let m;
  while((m = re.exec(text))){
    const pct = parseInt(m[3], 10);
    const stats = [m[1]];
    if(m[2]) stats.push(m[2]);
    for(const s of stats){
      if(s === 'all stats') for(const k of ['atk','def','spa','spd','spe']) out.push({stat:k, pct});
      else out.push({stat: STAT_WORD_MAP[s], pct});
    }
  }
  return out;
}
function _statMult(pct, isDrop){
  if(isDrop) return Math.max(0.25, 1 - pct/100);
  return Math.min(3.0, 1 + pct/100);
}
function executeStatMove(attacker, defender, moveId, mv, side){
  const selfSide = side;
  const enemySide = side === 'player' ? 'enemy' : 'player';
  const d = String(mv.desc || '').toLowerCase();
  const id = moveId;

  // ── Météos / écrans / salles ─────────────────────────────────────────────
  const SCREEN_WEATHER = {
    light_screen: { w:'lightscreen', log:'active un Mur Lumière !' },
    reflect:      { w:'reflect',     log:'active un Mur de Protection !' },
    safeguard:    { w:'safeguard',   log:'active une Rune Protectrice !' },
  };
  if(SCREEN_WEATHER[id]){
    const cfg = SCREEN_WEATHER[id];
    const held = (typeof getHeldItemForPokemon === 'function') ? getHeldItemForPokemon(attacker) : attacker.heldItem;
    let turns = 5;
    if(held === 'light_clay') turns = 8;
    if(typeof weatherTurnsFor === 'function') turns = weatherTurnsFor(attacker, turns);
    battle.weather = cfg.w; battle.weatherTurns = turns;
    addBattleLog(`${attacker.name} ${cfg.log}`);
    updateBattleUI();
    return true;
  }
  if(id === 'cross_room'){ battle.weather='crossroom'; battle.weatherTurns=(typeof weatherTurnsFor==='function'?weatherTurnsFor(attacker,5):5); addBattleLog(`${attacker.name} lance Cross Room !`); updateBattleUI(); return true; }
  if(id === 'weird_room'){ battle.weather='weirdroom'; battle.weatherTurns=(typeof weatherTurnsFor==='function'?weatherTurnsFor(attacker,5):5); addBattleLog(`${attacker.name} lance Weird Room !`); updateBattleUI(); return true; }
  if(id === 'trick_room'){ battle.weather='trickroom'; battle.weatherTurns=(typeof weatherTurnsFor==='function'?weatherTurnsFor(attacker,5):5); addBattleLog(`${attacker.name} lance Distorsion !`); updateBattleUI(); return true; }
  if(id === 'fog'){ battle.weather='fog'; battle.weatherTurns=(typeof weatherTurnsFor==='function'?weatherTurnsFor(attacker,5):5); addBattleLog(`${attacker.name} lance du brouillard !`); updateBattleUI(); return true; }
  if(id === 'snowscape'){ battle.weather='hail'; battle.weatherTurns=(typeof weatherTurnsFor==='function'?weatherTurnsFor(attacker,5):5); if(typeof pwStatChange==='function') pwStatChange(selfSide,'spa',1.5,{poke:attacker}); addBattleLog(`${attacker.name} lance Blizzard et gagne en Attaque Spéciale !`); updateBattleUI(); return true; }
  if(id === 'morning_sun'){ battle.weather='sun'; battle.weatherTurns=(typeof weatherTurnsFor==='function'?weatherTurnsFor(attacker,5):5); if(typeof pwStatChange==='function') pwStatChange(selfSide,'spa',1.5,{poke:attacker}); addBattleLog(`${attacker.name} invoque le soleil (Aurore) !`); updateBattleUI(); return true; }

  // ── Ajout de type temporaire à l'ennemi ──────────────────────────────────
  const TYPE_ADD = {
    soak:'Water', forest_curse:'Grass', magic_powder:'Psychic', electrify:'Electric',
    fairy_lock:'Fairy', mud_sport:'Ground', trick_or_treat:'Ghost',
  };
  if(TYPE_ADD[id]){
    defender._temporalType = TYPE_ADD[id];
    addBattleLog(`${defender.name} gagne temporairement le type ${TYPE_ADD[id]} !`);
    return true;
  }

  // ── Statuts (dont toxique + baisse, vantardise/rage + boost) ─────────────
  const STATUS_EFF = { para:'para', poison:'poison', badpoison:'badpoison', sleep:'sleep', freeze:'freeze', burn:'burn', confuse:'confuse' };
  if(mv.eff && STATUS_EFF[mv.eff]){
    const st = STATUS_EFF[mv.eff];
    const t1 = defender.type1, t2 = defender.type2;
    const typeImmune =
      (st === 'para' && (t1==='Electric'||t2==='Electric'||t1==='Ground'||t2==='Ground')) ||
      ((st === 'poison' || st === 'badpoison') && (t1==='Poison'||t2==='Poison'||t1==='Steel'||t2==='Steel')) ||
      (st === 'burn' && (t1==='Fire'||t2==='Fire')) ||
      (st === 'freeze' && (t1==='Ice'||t2==='Ice'));
    const talentImmune = (typeof isImmuneToStatus === 'function') && isImmuneToStatus(defender, st, battle.weather);
    if(typeImmune || talentImmune){ addBattleLog(`${defender.name} est immunisé !`); return true; }
    if(mv.effC && (typeof chance === 'function') && !chance(mv.effC)){ addBattleLog(`${attacker.name} rate ${getMoveName(id)} !`); return true; }
    if(defender.status){ addBattleLog(tr('combat_attack_auto_5', {p0:defender.name})); return true; }
    defender.status = st;
    defender.statusTurns = (typeof heldStatusTurns === 'function')
      ? heldStatusTurns(defender, st === 'sleep' ? ((typeof rand==='function'?rand(1,3):2)) : (st === 'para' ? 2 : 3), attacker)
      : 2;
    if(st === 'badpoison'){ defender.statusTurns = 0; }
    addBattleLog(`${defender.name} subit ${st} !`);
    // effets combinés
    if(id === 'toxic_thread'){ if(typeof pwStatChange==='function') pwStatChange(enemySide,'spe',0.5,{poke:defender}); addBattleLog(`${defender.name} est englué (Vitesse réduite) !`); }
    if(id === 'swagger'){ if(typeof pwStatChange==='function') pwStatChange(enemySide,'atk',2,{poke:defender}); addBattleLog(`${defender.name} gagne en Attaque (Vantardise) !`); }
    if(id === 'rage_powder'){ if(typeof pwStatChange==='function') pwStatChange(enemySide,'spa',2,{poke:defender}); addBattleLog(`${defender.name} gagne en Attaque Spéciale (Poudre Rage) !`); }
    if(typeof syncStatusBack === 'function') syncStatusBack(attacker, defender);
    return true;
  }

  // ── Memento (avant la baisse générique : « decreases enemy » est dans sa desc) ──
  if(id === 'memento'){
    if(typeof pwStatChange==='function'){ pwStatChange(enemySide,'atk',0.25,{poke:defender}); pwStatChange(enemySide,'spa',0.25,{poke:defender}); }
    attacker.currentHP = 0;
    addBattleLog(`${attacker.name} se sacrifie et affaiblit ${defender.name} !`);
    return true;
  }

  // ── Baisse de stats de l'ennemi ──────────────────────────────────────────
  if(/decreases enemy/.test(d)){
    for(const ch of _parseStatPcts(d)) if(typeof pwStatChange==='function') pwStatChange(enemySide, ch.stat, _statMult(ch.pct, true), {poke:defender});
    addBattleLog(`${defender.name} voit ses stats baisser !`);
    return true;
  }

  // ── Spéciaux ─────────────────────────────────────────────────────────────
  if(id === 'splash'){ addBattleLog(`${attacker.name} fait un plouf sans effet !`); return true; }
  if(id === 'embargo'){
    defender._flinch = true; // la cible est empêchée d'agir (effet « embargo »)
    addBattleLog(`${defender.name} est sous Embargo !`);
    return true;
  }
  if(id === 'acupressure'){
    const pool = ['atk','def','spa','spd','spe'];
    const a = (typeof rand==='function') ? rand(0,pool.length-1) : 0;
    let b = (typeof rand==='function') ? rand(0,pool.length-1) : 1;
    if(b === a) b = (a + 1) % pool.length;
    if(typeof pwStatChange==='function'){ pwStatChange(selfSide,pool[a],2,{poke:attacker}); pwStatChange(selfSide,pool[b],2,{poke:attacker}); }
    addBattleLog(`${attacker.name} booste deux stats au hasard !`);
    return true;
  }
  if(id === 'belly_drum'){
    if(typeof pwStatChange==='function'){ pwStatChange(selfSide,'atk',2.5,{poke:attacker}); pwStatChange(selfSide,'def',0.5,{poke:attacker}); pwStatChange(selfSide,'spd',0.5,{poke:attacker}); }
    addBattleLog(`${attacker.name} se surchauffe (Cognobidon) !`);
    return true;
  }
  if(id === 'baton_pass'){
    attacker.status = null; attacker.statusTurns = 0;
    addBattleLog(`${attacker.name} passe le relais (statuts et boosts partagés) !`);
    return true;
  }
  if(id === 'floral_healing'){
    try{ if(typeof G !== 'undefined' && G && Array.isArray(G.team)) for(const tp of G.team){ if(tp){ tp.status=null; tp.statusTurns=0; } } }catch(_){}
    addBattleLog(`${attacker.name} soigne toute l'équipe !`);
    return true;
  }
  if(id === 'camouflage'){
    const w = normalizeWeather((typeof battle !== 'undefined' && battle) ? battle.weather : null);
    const t = { rain:'Water', sun:'Fire', sand:'Ground', hail:'Ice' }[w] || 'Normal';
    attacker._camouflageType = t;
    addBattleLog(`${attacker.name} se camoufle en type ${t} !`);
    return true;
  }
  if(id === 'conversion'){
    const fm = (attacker.moves && attacker.moves[0]) ? attacker.moves[0] : null;
    const fmv = fm && typeof MOVES !== 'undefined' && MOVES[fm.id] ? MOVES[fm.id] : null;
    if(fmv && fmv.type){ attacker._conversionType = fmv.type; addBattleLog(`${attacker.name} adopte le type ${fmv.type} !`); }
    return true;
  }
  if(id === 'metronome'){
    const pool = [];
    try{ if(typeof MOVES !== 'undefined') for(const k of Object.keys(MOVES)){ const mm=MOVES[k]; if(mm && mm.power>0 && mm.cat!=='stat' && !['metronome','mimic','me_first','sketch'].includes(k)) pool.push(k); } }catch(_){}
    if(pool.length){
      const r = pool[(typeof rand==='function') ? rand(0,pool.length-1) : 0];
      addBattleLog(`${attacker.name} improvise ${getMoveName(r)} (Métronome) !`);
      executeAttack(attacker, defender, r, side);
      return true;
    }
    return true;
  }
  if(id === 'mimic' || id === 'me_first'){
    const em = (defender && Array.isArray(defender.moves) && defender.moves[0]) ? defender.moves[0] : null;
    if(em && em.id && em.id !== id){
      attacker._tmpDmgMult = (id === 'mimic') ? 2 : (attacker._tmpDmgMult || 1);
      addBattleLog(`${attacker.name} copie ${getMoveName(em.id)} !`);
      executeAttack(attacker, defender, em.id, side);
      return true;
    }
    return true;
  }
  if(id === 'sketch'){
    const om = (attacker && Array.isArray(attacker.moves) && attacker.moves[0]) ? attacker.moves[0] : null;
    if(om && om.id && om.id !== id){ addBattleLog(`${attacker.name} exécute ${getMoveName(om.id)} (Gribouille) !`); executeAttack(attacker, defender, om.id, side); return true; }
    return true;
  }
  if(id === 'chilly_reception'){
    battle.weather='hail'; battle.weatherTurns=(typeof weatherTurnsFor==='function'?weatherTurnsFor(attacker,5):5);
    addBattleLog(`${attacker.name} invoque la grêle et se retire !`);
    if(side === 'player' && typeof G !== 'undefined' && G && Array.isArray(G.team) && G.team.length > 1){
      const cur = battle.playerPokeIdx || 0;
      let next = -1;
      for(let i = 1; i < G.team.length; i++){ const c = (cur + i) % G.team.length; if(G.team[c] && Number(G.team[c].currentHP ?? G.team[c].hp ?? 1) > 0){ next = c; break; } }
      if(next !== -1 && next !== cur){ if(typeof doSwitchBattlePoke === 'function') doSwitchBattlePoke(next); else if(typeof switchBattlePoke === 'function') switchBattlePoke(next); }
    }
    return true;
  }
  if(id === 'pay_day'){
    battle._payDayBonus = true;
    addBattleLog(`${attacker.name} attire la chance (Jackpot) !`);
    return true;
  }
  if(id === 'teatime'){
    battle._teatimeBonus = true;
    addBattleLog(`${attacker.name} attire les Pokémon rares (Heure du Thé) !`);
    return true;
  }
  if(id === 'venoshock'){
    // « stat » dans les données mais offensif (PokeChill) : 65 → 130 si empoisonné.
    const base = (defender.status === 'poison' || defender.status === 'badpoison') ? 130 : 65;
    const spec = Number(attacker.spa || 0) > Number(attacker.atk || 0);
    const atk = spec ? (attacker.spa || attacker.atk) : attacker.atk;
    const def = spec ? (defender.spd || defender.def) : defender.def;
    const eff = typeEff('Poison', defender.type1, defender.type2);
    const rnd = (typeof rand === 'function') ? rand(85, 100) / 100 : 1;
    const dmg = Math.max(1, Math.floor(((2 * attacker.level / 5 + 2) * base * atk / def / 50 + 2) * eff * rnd));
    defender.currentHP = Math.max(0, defender.currentHP - dmg);
    visualDamage(side, dmg, eff, false);
    addBattleLog(`${defender.name} perd ${dmg} PV !`);
    return true;
  }

  // ── Hausses de stats (éventuellement sur toute l'équipe) ─────────────────
  const boosts = _parseStatPcts(d);
  if(boosts.length){
    for(const ch of boosts) if(typeof pwStatChange==='function') pwStatChange(selfSide, ch.stat, _statMult(ch.pct, false), {poke:attacker});
    addBattleLog(`${attacker.name} booste ses stats !`);
    return true;
  }

  // Rien trouvé : log simple pour ne jamais rester muet.
  addBattleLog(`${attacker.name} utilise ${getMoveName(id)} !`);
  return true;
}

// DORM-06b — Cristal Z (PokeChill) : tous les N tours, le porteur lance une
// attaque coordonnée de type `zType`. Bénéficie des stats et du type du
// porteur, MAIS PAS de ses talents ni de ses buffs (fidèle PokeChill).
function executeZCrystalAttack(poke, enemy, zType){
 if(!poke || !enemy || !zType) return;
 if(enemy.currentHP <= 0 || poke.currentHP <= 0) return;
 const type = String(zType);
 const atk = Number(poke.atk) || 1;
 const spa = Number(poke.spa) || 1;
 let split, offStat, defStat;
 let bonus = 1;
 if (atk > spa) { split = 'phys'; offStat = atk; defStat = Number(enemy.def) || 1; }
 else if (spa > atk) { split = 'spec'; offStat = spa; defStat = Number(enemy.spd) || 1; }
 else {
   // Stats égales : physique ou spéciale au hasard, ×1,25 de dégâts.
   split = (typeof rand === 'function' && rand(0, 1) === 1) ? 'spec' : 'phys';
   offStat = atk; defStat = (split === 'spec' ? (Number(enemy.spd) || 1) : (Number(enemy.def) || 1));
   bonus = 1.25;
 }
 // Buffs défensifs de la cible appliqués (comme une attaque normale),
 // buffs offensifs du porteur ignorés.
 const mods = (typeof battle !== 'undefined' && battle) ? battle.enemyMods : null;
 if (mods) defStat *= (Number(mods[split === 'spec' ? 'spd' : 'def']) || 1);
 const eff = (typeof typeEff === 'function') ? typeEff(type, enemy.type1, enemy.type2) : 1;
 if (eff === 0) {
   addBattleLog(`${enemy.name} est immunisé contre l'attaque coordonnée !`);
   return;
 }
 const stab = (poke.type1 === type || poke.type2 === type) ? 1.5 : 1;
 const randMult = (typeof rand === 'function') ? (rand(85, 100) / 100) : 1;
 const power = 60;
 const dmg = Math.max(1, Math.floor(((2 * (poke.level || 1) / 5 + 2) * power * offStat / defStat / 50 + 2) * stab * eff * randMult * bonus));
 enemy.currentHP = Math.max(0, enemy.currentHP - dmg);
 if (typeof spawnBattleChip === 'function') spawnBattleChip('player', 'Cristal Z', 'move', type);
 playHitAnim('player');
 visualDamage('player', dmg, eff, false);
 const tName = (typeof getTypeName === 'function') ? getTypeName(type) : type;
 addBattleLog(`${poke.name} lance une attaque coordonnée ${tName} (Cristal Z) !`);
 updateBattleUI();
}

function executeAttack(attacker, defender, moveId, side){
 const mv=MOVES[moveId];
 if(!mv) return;
 // DORM-06 — compteurs des balls spéciales (Quick Ball : attaques pour K.O.).
 if(side === 'player' && typeof battle !== 'undefined' && battle) battle.attacksOnCurrentEnemy = (battle.attacksOnCurrentEnemy || 0) + 1;
 const prevAttackerStatus = attacker ? attacker.status : null;
 const prevDefenderStatus = defender ? defender.status : null;
 visualMoveUsed(side, moveId, mv);
 const attackerHeldItem = (typeof getHeldItemForPokemon === 'function') ? getHeldItemForPokemon(attacker) : attacker.heldItem;
 const defenderHeldItem = (typeof getHeldItemForPokemon === 'function') ? getHeldItemForPokemon(defender) : defender.heldItem;
 const _atkMod=(side==='player'?battle.playerMods:battle.enemyMods).atk;
 const _defMod=(side==='player'?battle.enemyMods:battle.playerMods).def;

 addBattleLog(tr('uses_move_log', {name:attacker.name, move:getMoveName(moveId)}));
 playAttackAnim(side);
 // DORM-02h — Métronome : répéter la même capacité augmente sa puissance.
 if(attackerHeldItem === 'metronome'){
  if(attacker._lastMoveId === moveId) attacker._metronomeStacks = Math.min(5, (attacker._metronomeStacks || 0) + 1);
  else { attacker._metronomeStacks = 0; attacker._lastMoveId = moveId; }
 }
 // DORM-04 — Taillade : ×1,2 par utilisation consécutive (max 5).
 if(moveId === 'fury_cutter'){
  attacker._furyStacks = (attacker._furyLastMove === moveId) ? Math.min(5, (attacker._furyStacks || 0) + 1) : 1;
  attacker._furyLastMove = moveId;
 }
 // DORM-04 — Appel Attaque : ×1,15 par utilisation consécutive (max 10).
 if(moveId === 'attack_order'){
  attacker._aoStacks = (attacker._aoLastMove === moveId) ? Math.min(10, (attacker._aoStacks || 0) + 1) : 1;
  attacker._aoLastMove = moveId;
 }

 if(moveId === 'transform'){
 transformPokemon(attacker, defender, side);
 return;
 }

// Weather-changing moves
 if (moveId === 'rain_dance') {
   battle.weather = 'rain';
   battle.weatherTurns = weatherTurnsFor(attacker, attackerHeldItem === 'damp_rock' ? 8 : 5);
   addBattleLog(`${attacker.name} lance Danse Pluie ! La pluie commence à tomber.`);
   updateBattleUI();
   return;
 }
 if (moveId === 'sunny_day') {
   battle.weather = 'sunny';
   battle.weatherTurns = weatherTurnsFor(attacker, attackerHeldItem === 'heat_rock' ? 8 : 5);
   addBattleLog(`${attacker.name} lance Zénith ! Le soleil commence à briller.`);
   updateBattleUI();
   return;
 }
 if (moveId === 'sandstorm') {
   battle.weather = 'sandstorm';
   battle.weatherTurns = weatherTurnsFor(attacker, attackerHeldItem === 'smooth_rock' ? 8 : 5);
   addBattleLog(`${attacker.name} lance Tempête de Sable ! Une tempête de sable se lève.`);
   updateBattleUI();
   return;
 }
 if (moveId === 'hail') {
   battle.weather = 'hail';
   battle.weatherTurns = weatherTurnsFor(attacker, attackerHeldItem === 'icy_rock' ? 8 : 5);
   addBattleLog(`${attacker.name} lance Grêle ! La grêle commence à tomber.`);
   updateBattleUI();
   return;
 }

 // Terrain-changing moves
 if (moveId === 'electric_terrain') {
   battle.terrain = 'electric';
   battle.terrainTurns = attackerHeldItem === 'terrain_extender' ? 8 : 5;
   addBattleLog(`${attacker.name} active un Champ Électrique !`);
   updateBattleUI();
   return;
 }
 if (moveId === 'grassy_terrain') {
   battle.terrain = 'grassy';
   battle.terrainTurns = attackerHeldItem === 'terrain_extender' ? 8 : 5;
   addBattleLog(`${attacker.name} active un Champ Herbeux !`);
   updateBattleUI();
   return;
 }
 if (moveId === 'misty_terrain') {
   battle.terrain = 'misty';
   battle.terrainTurns = attackerHeldItem === 'terrain_extender' ? 8 : 5;
   addBattleLog(`${attacker.name} active un Champ Brumeux !`);
   updateBattleUI();
   return;
 }
 if (moveId === 'psychic_terrain') {
   battle.terrain = 'psychic';
   battle.terrainTurns = attackerHeldItem === 'terrain_extender' ? 8 : 5;
   addBattleLog(`${attacker.name} active un Champ Psychique !`);
   updateBattleUI();
   return;
 }

 if(defender.talent === 'levitate' && mv.type === 'Ground'){
 visualTalent(side === 'player' ? 'enemy' : 'player', defender.talent, '×0');
 spawnBattleFloat(side === 'player' ? 'enemy' : 'player', '×0', 'immune');
 addBattleLog(tr('combat_attack_auto_1', {p0:defender.name}));
 return;
 }
 if(defender.talent === 'lightningrod' && mv.type === 'Electric'){
 visualTalent(side === 'player' ? 'enemy' : 'player', defender.talent, '×0');
 spawnBattleFloat(side === 'player' ? 'enemy' : 'player', '×0', 'immune');
 addBattleLog(tr('combat_attack_auto_2', {p0:defender.name}));
 return;
 }
 const absorbMap = {
  waterabsorb:'Water', stormdrain:'Water', voltabsorb:'Electric', flashfire:'Fire', sapsipper:'Grass',
  poisonabsorb:'Poison', frostabsorb:'Ice', psychicabsorb:'Psychic', lightabsorb:'Fairy',
  growthabsorb:'Grass', flareabsorb:'Fire', curseabsorb:'Ghost'
 };
 if(absorbMap[defender.talent] === mv.type || (getPokemonHiddenTalent(defender) && absorbMap[getPokemonHiddenTalent(defender)] === mv.type)){
 const heal = Math.max(1, Math.floor(defender.maxHP * 0.25));
 defender.currentHP = Math.min(defender.maxHP, defender.currentHP + heal);
 visualTalent(side === 'player' ? 'enemy' : 'player', defender.talent, '+PV');
 visualHeal(side === 'player' ? 'enemy' : 'player', heal);
 addBattleLog(`${defender.name} absorbe ${getMoveName(moveId)} grâce à ${getTalentName(defender.talent)} ! (+${heal} PV)`);
 updateBattleUI();
 return;
 }
 // DORM-04 — flash* : annule le type correspondant et +50 % de vitesse.
 const flashMap = {
  flashelectro:'Electric', flashaqua:'Water', flashpyro:'Fire', flashumbra:'Ghost',
  flashvenum:'Poison', flashcryo:'Ice', flashpsycha:'Psychic', flashfae:'Fairy', flashherba:'Grass'
 };
 const flashTal = flashMap[defender.talent] ? defender.talent : (flashMap[getPokemonHiddenTalent(defender)] ? getPokemonHiddenTalent(defender) : null);
 if(flashTal && flashMap[flashTal] === mv.type){
  const mods = (side === 'player' ? battle.enemyMods : battle.playerMods);
  if(mods) mods.spe = Math.min(3.0, (mods.spe || 1) * 1.5);
  visualTalent(side === 'player' ? 'enemy' : 'player', flashTal, '×0');
  spawnBattleFloat(side === 'player' ? 'enemy' : 'player', '×0', 'immune');
  addBattleLog(`${defender.name} annule ${getMoveName(moveId)} grâce à ${getTalentName(flashTal)} et gagne en vitesse !`);
  updateBattleUI();
  return;
 }

 
 let acc = mv.acc || 100;
 // DORM-04 — baisse de précision (Coud'Boue…) : la prochaine attaque est moins précise.
 if(attacker._accDown){ acc = Math.max(50, acc - 30 * attacker._accDown); attacker._accDown = 0; }
 // DORM-04 — multiplicateur de dégâts des talents (utilisé plus bas dans le
 // calcul final et alimenté par les talents d'efficacité ci-dessus).
 let talentDmgMult = 1;
 if(attacker.talent === 'noguard' || defender.talent === 'noguard') acc = 1000;
 if(attacker.talent === 'compoundeyes') acc += 30;
 if(defender.talent === 'sandveil' || defender.talent === 'snowcloak') acc -= 20;
 if(mv.pow!==null && mv.pow!==undefined && !chance(acc)){
 spawnBattleFloat(side === 'player' ? 'enemy' : 'player', 'MISS', 'miss');
 addBattleLog(tr('combat_attack_auto_3', {p0:attacker.name}));
 return;
 }

 
 let eff = typeEff(mv.type, defender.type1, defender.type2);
 // DORM-04 — Normalise : toutes les capacités deviennent Normal (×1,3).
 const _talNorm = attacker.talent || (typeof getPokemonHiddenTalent === 'function' ? getPokemonHiddenTalent(attacker) : null);
 if(_talNorm === 'normalize' && mv.type !== 'Normal'){
  eff = typeEff('Normal', defender.type1, defender.type2);
  talentDmgMult *= 1.3;
 }
 // DORM-04 — talents « -ate » : Normal → type X ×1,3 (recalcul de l'efficacité).
 const _talAte = attacker.talent || (typeof getPokemonHiddenTalent === 'function' ? getPokemonHiddenTalent(attacker) : null);
 const _ateType = ATE_MAP[_talAte];
 if(mv.type === 'Normal' && _ateType){
  eff = typeEff(_ateType, defender.type1, defender.type2);
  talentDmgMult *= 1.3;
 }
 // DORM-04 — type temporaire (Soak, Forêt Maudite, Trac…) : bonus/malus.
 if(defender._temporalType){
  const _effT = typeEff(mv.type, defender._temporalType, null);
  if(_effT > 1) eff *= 1.25;
  else if(_effT < 1) eff *= 0.75;
 }
 // DORM-04 — TintedLens : ×2 sur les coups résistés (sans _hasTal, déclaré plus bas).
 const _talTl = attacker.talent || (typeof getPokemonHiddenTalent === 'function' ? getPokemonHiddenTalent(attacker) : null);
 if(_talTl === 'tintedlens' && eff > 0 && eff < 1) eff *= 2;
 // DORM-04 — Scrappy : les capacités Normal/Combat touchent les Spectres.
 const _talSc = attacker.talent || (typeof getPokemonHiddenTalent === 'function' ? getPokemonHiddenTalent(attacker) : null);
 if(_talSc === 'scrappy' && eff === 0 && (mv.type === 'Normal' || mv.type === 'Fighting')) eff = 1;
 // DORM-04 — Écran Pilon : les coups super efficaces deviennent neutres.
 const _talSd = attacker.talent || (typeof getPokemonHiddenTalent === 'function' ? getPokemonHiddenTalent(attacker) : null);
 if(_talSd === 'shieldsdown' && eff > 1) eff = 1;
 // DORM-04 — Mille Bras : tous les coups deviennent super efficaces.
 const _talTa = attacker.talent || (typeof getPokemonHiddenTalent === 'function' ? getPokemonHiddenTalent(attacker) : null);
 if(_talTa === 'thousandarms' && eff < 2) eff = 2;
 if(eff === 0 && !mv.fixed){
 spawnBattleFloat(side === 'player' ? 'enemy' : 'player', '×0', 'immune');
 addBattleLog(tr('combat_attack_auto_4', {p0:defender.name}));
 return;
 }

 
 if(mv.cat==='stat'){
 // DORM-04 — toutes les capacités de statut sont interprétées (PokeChill).
 if(executeStatMove(attacker, defender, moveId, mv, side)){
  syncStatusBack(attacker, defender);
  visualStatusChanges(side, prevAttackerStatus, prevDefenderStatus, attacker, defender);
  updateBattleUI();
  return;
 }
 // mv.eff === 'slow' (baisse de Vitesse) — cas conservé pour compat.
 const targetMods = (side==='player'?battle.enemyMods:battle.playerMods);
 if(typeof pwStatChange === 'function'){ pwStatChange(side==='player'?'enemy':'player', 'spe', 2/3, {poke:defender}); }
 else targetMods.spe = Math.max(0.25, targetMods.spe * 0.67);
 syncStatusBack(attacker, defender);
 visualStatusChanges(side, prevAttackerStatus, prevDefenderStatus, attacker, defender);
 updateBattleUI();
 return;
 }

 
 let power=mv.pow;
 if(mv.fixed!==null&&mv.fixed!==undefined){
 const dmg=typeof mv.fixed==='number'?mv.fixed:attacker.level;
 defender.currentHP=Math.max(0,defender.currentHP-dmg);
 playHitAnim(side);
 visualDamage(side, dmg, 1, false);
 addBattleLog(`${defender.name} perd ${dmg} PV !`);
 visualStatusChanges(side, prevAttackerStatus, prevDefenderStatus, attacker, defender);
 updateBattleUI();return;
 }
 if(!power) return;

 const _hasTal = (poke, talentName) => (typeof hasTalent === 'function') ? hasTalent(poke, talentName) : poke.talent === talentName;
 // DORM-04 — Camouflage / Conversion : le type de l'utilisateur change.
 const _atkCam = attacker._camouflageType || attacker._conversionType || null;
 let stabMult=((attacker.type1===mv.type||attacker.type2===mv.type) || (_atkCam && _atkCam===mv.type))?(_hasTal(attacker, 'adaptability')?2.0:1.5):1;
 // DORM-04 — Protéen : STAB sur toutes les capacités (le type « suit » l'attaque).
 if(_hasTal(attacker, 'protean') && stabMult < 1.5) stabMult = 1.5;
 const critBlocked = _hasTal(defender, 'shellarmor') || _hasTal(defender, 'battlearmor');
 const critMult = (mv.crit && !critBlocked && chance(15)) ? (_hasTal(attacker, 'sniper') ? 2.25 : 1.5) : 1;
 const randMult=(rand(85,100)/100);

 const isSpec = mv.cat === 'spec';
 const atkModVal = (side==='player'?battle.playerMods:battle.enemyMods)[isSpec ? 'spa' : 'atk'] || 1;
 let defModVal = (side==='player'?battle.enemyMods:battle.playerMods)[isSpec ? 'spd' : 'def'] || 1;
 // DORM-04 — Insouciant : en attaquant, ignore les boosts défensifs de la cible.
 if(_hasTal(attacker, 'unaware')) defModVal = 1;
 // DORM-04 — « Bypasses all defense buffs » (Rayon Spectral, Choc Météore).
 if(/bypasses all defense buffs/i.test(String(mv.desc || ''))) defModVal = 1;

 const atkBuff = 1 + (getHeldBuff(attacker)[isSpec ? 'spa' : 'atk'] || 0);
 const defBuff = 1 + (getHeldBuff(defender)[isSpec ? 'spd' : 'def'] || 0);
 let atk = (isSpec ? (attacker.spa || attacker.atk) : attacker.atk) * atkBuff * atkModVal;
 let def = (isSpec ? (defender.spd || defender.def) : defender.def) * defBuff * defModVal;

 if(_hasTal(defender, 'intimidate') && !isSpec){
   atk = Math.max(1, Math.floor(atk * 0.75));
 }
 if(_hasTal(attacker, 'lightningrod') && isSpec){
   atk = Math.floor(atk * 1.25);
 }
 if(_hasTal(defender, 'livingshield') && defender.status && isSpec){
   def *= 1.5;
 }

 if((_hasTal(attacker, 'hugepower') || _hasTal(attacker, 'purepower')) && !isSpec){
 atk *= 1.6;
 if(chance(35)) addBattleLog(t('combat_attack_auto_25'));
 }
 if(_hasTal(attacker, 'solarpower') && isSpec){
 atk *= 1.3;
 if(chance(35)) visualTalent(side, 'solarpower', '+30%');
 }
 // DORM-04 — talents de statut/météo (PokeChill).
 if(_hasTal(attacker, 'gorillatactics') && !isSpec) atk *= 1.5;
 if(_hasTal(attacker, 'brittlearmor') && attacker.status && isSpec) atk *= 1.5;
 if(_hasTal(attacker, 'flareboost') && attacker.status === 'burn') talentDmgMult *= 1.2;
 if(_hasTal(attacker, 'toxicboost') && (attacker.status === 'poison' || attacker.status === 'badpoison')) talentDmgMult *= 1.2;
 if(_hasTal(attacker, 'raindish') && isSpec && (battle.weather === 'rainy' || battle.weather === 'rain')) atk *= 1.5;
 const _protoWeather = (battle.weather === 'sunny' || battle.weather === 'sun');
 const _quarkTerrain = (battle.terrain === 'electric');
 if((_hasTal(attacker, 'protosynthesis') && _protoWeather) || (_hasTal(attacker, 'quarkdrive') && _quarkTerrain)){
  if(isSpec) atk *= 1.5; else atk *= 1.5;
 }
 if(_hasTal(attacker, 'guts') && attacker.status && !isSpec){
 atk *= 1.5;
 addBattleLog(t('combat_attack_auto_26'));
 }
 if(_hasTal(attacker, 'technician') && power <= 60){
 power = Math.floor(power * 1.5);
 if(chance(35)){
   visualTalent(side, 'technician', '+50%');
   addBattleLog(`${attacker.name} renforce ${getMoveName(moveId)} avec Technicien !`);
 }
 }
 const LOW_HP_BOOST_MAP = {
   overgrow: 'Grass', blaze: 'Fire', torrent: 'Water', swarm: 'Bug',
   bastion: 'Steel', average: 'Normal', resolve: 'Fighting', mistify: 'Psychic',
   hexerei: 'Ghost', glimmer: 'Fairy', skyward: 'Flying', draconic: 'Dragon',
   noxious: 'Poison', solid: 'Rock', rime: 'Ice', voltage: 'Electric',
   earthy: 'Ground', shadowy: 'Dark'
 };
 const talLowHp = LOW_HP_BOOST_MAP[attacker.talent] ? attacker.talent : (LOW_HP_BOOST_MAP[getPokemonHiddenTalent(attacker)] ? getPokemonHiddenTalent(attacker) : null);
 if(talLowHp && LOW_HP_BOOST_MAP[talLowHp] === mv.type && attacker.currentHP < attacker.maxHP * 0.35){
   power = Math.floor(power * 1.35);
 }
 if(_hasTal(attacker, 'steelyspirit') && mv.type === 'Steel') power = Math.floor(power * 1.25);

 if(_hasTal(defender, 'thickfat') && (mv.type === 'Fire' || mv.type === 'Ice')){
 def *= 2;
 addBattleLog(t('combat_attack_auto_30'));
 }
 if(_hasTal(defender, 'multiscale') && defender.currentHP >= defender.maxHP){
 def *= 2;
 addBattleLog(t('combat_attack_auto_31'));
 }
 if((_hasTal(defender, 'filter') || _hasTal(defender, 'solidrock')) && eff > 1){
 def *= 1.33;
 }
 if(_hasTal(defender, 'marvelscale') && defender.status && !isSpec){
 def *= 1.5;
 }
 // DORM-04 — Corps Gelé : +50 % Défense sous la grêle.
 if(_hasTal(defender, 'icebody') && !isSpec && (battle.weather === 'hail' || battle.weather === 'snow')) def *= 1.5;
 // DORM-02h — Bottes Lourdes : dégâts subis réduits (PokeChill).
 if(defenderHeldItem === 'heavy_duty_boots') def *= heldItemMultFor('heavy_duty_boots', (side === 'player' ? 'enemy' : 'player'));

 
 let itemTypeMult = 1;
 const typeItemMap = {
 'black_belt':'Fighting','black_glasses':'Dark','charcoal':'Fire',
 'dragon_fang':'Dragon','miracle_seed':'Grass','mystic_water':'Water',
 'never_melt_ice':'Ice','sharp_beak':'Flying','poison_barb':'Poison',
 'spell_tag':'Ghost','hard_stone':'Rock','magnet':'Electric',
 'silk_scarf':'Normal','twisted_spoon':'Psychic','metal_coat':'Steel',
 'fairy_feather':'Fairy','silver_powder':'Bug','soft_sand':'Ground',
 };
 const heldItemType = typeItemMap[attackerHeldItem];
 if(heldItemType && heldItemType === mv.type){
 // DORM-02j — ×p selon le nombre possédé (PokeChill 1+0.1×niveau) côté
 // joueur ; valeur canonique fixe côté NPC (jamais liée à l'inventaire).
 itemTypeMult *= heldItemMultFor(attackerHeldItem, side);
 }
 
 if(attackerHeldItem === 'choice_band' && mv.cat === 'phys') itemTypeMult *= heldItemMultFor('choice_band', side);
 if(attackerHeldItem === 'choice_specs' && mv.cat === 'spec') itemTypeMult *= heldItemMultFor('choice_specs', side);
 
 if(attackerHeldItem === 'life_orb') itemTypeMult *= heldItemMultFor('life_orb', side);
 
 if(attackerHeldItem === 'muscle_band' && mv.cat === 'phys') itemTypeMult *= heldItemMultFor('muscle_band', side);

 // DORM-02h — Poing Chance : les capacités de poing frappent plus fort.
 if(attackerHeldItem === 'lucky_punch' && isPunchMove(moveId)) itemTypeMult *= heldItemMultFor('lucky_punch', side);
 // DORM-02h — Queue Lente : les capacités lentes frappent plus fort.
 if(attackerHeldItem === 'lagging_tail' && typeof getMoveCooldownMultiplier === 'function' && getMoveCooldownMultiplier(mv) > 1) itemTypeMult *= heldItemMultFor('lagging_tail', side);

 // DORM-02h — Métronome / Lumargile : bonus de dégâts.
 if(attackerHeldItem === 'metronome' && attacker._metronomeStacks > 0) itemTypeMult *= (1 + 0.2 * attacker._metronomeStacks);
 if(attackerHeldItem === 'light_clay') itemTypeMult *= heldItemMultFor('light_clay', side);
 // DORM-06 — baies offensives : stats à PV bas + Lansat + Snover.
 const _bAtt = berryHeld(attacker);
 if(_bAtt && _bAtt.itm.category === 'pinch_stat' && attacker.currentHP < attacker.maxHP * 0.25 && !berryUsed(attacker, '_pinchStatUsed')){
  if(typeof pwStatChange === 'function'){
   pwStatChange(side, _bAtt.itm.stat, 1 + berryPowerVal(_bAtt.key, berryLevel(attacker, _bAtt.key, side)), {poke:attacker});
   berryMark(attacker, '_pinchStatUsed');
   addBattleLog(`${attacker.name} est survolté par sa baie (${getItemName(_bAtt.key)}) !`);
  }
 }
 if(_bAtt && _bAtt.itm.category === 'pinch_random' && attacker.currentHP < attacker.maxHP * 0.25 && !berryUsed(attacker, '_pinchRandomUsed')){
  const _pool = ['atk','def','spa','spd','spe'];
  const _st = _pool[Math.floor(Math.random() * _pool.length)];
  if(typeof pwStatChange === 'function'){
   pwStatChange(side, _st, 1 + berryPowerVal(_bAtt.key, berryLevel(attacker, _bAtt.key, side)), {poke:attacker});
   berryMark(attacker, '_pinchRandomUsed');
   addBattleLog(`${attacker.name} est survolté (stat aléatoire) !`);
  }
 }
 if(_bAtt && _bAtt.itm.category === 'pinch_dmg' && attacker.currentHP < attacker.maxHP * 0.25){
  itemTypeMult *= (1 + berryPowerVal(_bAtt.key, berryLevel(attacker, _bAtt.key, side)));
 }
 if(_bAtt && _bAtt.itm.category === 'ice_boost' && mv.type === 'Ice'){
  itemTypeMult *= (1 + berryPowerVal(_bAtt.key, berryLevel(attacker, _bAtt.key, side)));
 }
 // DORM-04 — Taillade : ×1,2 par utilisation consécutive (max 5).
 if(moveId === 'fury_cutter' && (attacker._furyStacks || 0) > 1) itemTypeMult *= Math.pow(1.2, attacker._furyStacks - 1);
 // DORM-04 — Appel Attaque : ×1,15 par utilisation consécutive (max 10).
 if(moveId === 'attack_order' && (attacker._aoStacks || 0) > 1) itemTypeMult *= Math.pow(1.15, attacker._aoStacks - 1);
 // DORM-04 — cross-power : capacité dont le type diffère de la précédente.
 // (PokéChill applique ×1,3 de base ; PokéWorld garde 1,0 pour ne pas
 // gonfler les dégâts de tout le monde — seuls les talents et Cross Room
 // apportent leur bonus : Ambidextre +0,3 · Trésor de la Ruine +0,5 · ×1,3.)
 const _crossPrev = attacker._lastCrossType;
 if(_crossPrev && _crossPrev !== mv.type && !(_ateType && mv.type === 'Normal')){
  let _cross = 1.0;
  if(_hasTal(attacker, 'ambidextrous')) _cross += 0.3;
  if(_hasTal(attacker, 'treasureofruin')) _cross += 0.5;
  const _crossW = normalizeWeather((typeof battle !== 'undefined' && battle) ? battle.weather : null);
  if(_crossW === 'crossroom') _cross += 0.3;
  if(_cross > 1) itemTypeMult *= _cross;
 }
 if(power > 0) attacker._lastCrossType = mv.type;

 // DORM-04 — talents « divers » : ×famille de capacités (vocabulaire PokeChill).
 if(_hasTal(attacker, 'strongjaw') && isFangMove(moveId)) itemTypeMult *= 2;
 if(_hasTal(attacker, 'toughclaws') && isClawMove(moveId)) itemTypeMult *= 2;
 if(_hasTal(attacker, 'ironfist') && isPunchMove(moveId)) itemTypeMult *= 1.5;
 if(_hasTal(attacker, 'sharpness') && isSharpMove(moveId)) itemTypeMult *= 1.5;
 if(_hasTal(attacker, 'megalauncher') && isPulseMove(moveId)) itemTypeMult *= 1.5;
 // Témérité (PokeChill) : capacités lentes ×1,5.
 if(_hasTal(attacker, 'reckless') && typeof getMoveCooldownMultiplier === 'function' && getMoveCooldownMultiplier(mv) > 1) itemTypeMult *= 1.5;
 // Impitoyable : ×1,5 si la cible a un statut.
 if(_hasTal(attacker, 'merciless') && defender.status) itemTypeMult *= 1.5;
 // Rivalité : ×1,5 quand l'adversaire partage un type.
 const _shareType = (attacker.type1 && (attacker.type1 === defender.type1 || attacker.type1 === defender.type2)) || (attacker.type2 && (attacker.type2 === defender.type1 || attacker.type2 === defender.type2));
 if(_hasTal(attacker, 'rivalry') && _shareType) itemTypeMult *= 1.5;
 // Sans Limite : effet secondaire retiré, dégâts ×1,25.
 const _sheerForce = _hasTal(attacker, 'sheerforce') && mv.eff && mv.effC;
 if(_sheerForce) itemTypeMult *= 1.25;
 // Tête de Fer (PokeChill « metalhead ») : capacités « tête » ×1,5.
 if(_hasTal(attacker, 'metalhead') && isHeadMove(moveId)) itemTypeMult *= 1.5;
 // Libéro (PokeChill) : capacités rapides ×2.
 if(_hasTal(attacker, 'libero') && typeof getMoveCooldownMultiplier === 'function' && getMoveCooldownMultiplier(mv) < 1) itemTypeMult *= 2;
 // Amour Maternel : les capacités s'exécutent une 2ᵉ fois à mi-puissance (×1,5).
 if(_hasTal(attacker, 'parentalbond')) itemTypeMult *= 1.5;
 // Général Suprême : ×1,15 par coéquipier K.O.
 const _koTeammates = (typeof G !== 'undefined' && G && Array.isArray(G.team)) ? G.team.filter((tp) => tp && Number(tp.currentHP ?? tp.hp ?? 1) <= 0).length : 0;
 if(_hasTal(attacker, 'supremeoverlord') && _koTeammates > 0) itemTypeMult *= (1 + 0.15 * _koTeammates);
 // Garde Mystik : les coups non super efficaces sont réduits de 80 %.
 if(_hasTal(defender, 'wonderguard') && eff < 2) itemTypeMult *= 0.2;
 // Sel Purificateur : dégâts des capacités Spectre −25 %.
 if(_hasTal(defender, 'purifyingsalt') && mv.type === 'Ghost') itemTypeMult *= 0.75;
 // Auras d'équipe (PokeChill) : +10 % sur le type pour toute l'équipe.
 const _teamAliveHas = (t) => {
  try { return (typeof G !== 'undefined' && G && Array.isArray(G.team)) && G.team.some((tp) => tp && Number(tp.currentHP ?? tp.hp ?? 1) > 0 && _hasTal(tp, t)); } catch(_e){ return false; }
 };
 if(mv.type === 'Dark' && _teamAliveHas('darkaura')) itemTypeMult *= 1.1;
 if(mv.type === 'Ghost' && _teamAliveHas('soulasterism')) itemTypeMult *= 1.1;


 // DORM-02a — joyaux : ×1,3 sur la première capacité du type, puis consommé.
 const heldAttItem = (typeof ITEMS !== 'undefined' && ITEMS[attackerHeldItem]) ? ITEMS[attackerHeldItem] : null;
 if(heldAttItem && heldAttItem.gemType && String(heldAttItem.gemType).toLowerCase() === String(mv.type).toLowerCase()){
  itemTypeMult *= 1.3;
  try { if(typeof clearTeamSlotItem === 'function' && typeof getTeamIndexOfPokemon === 'function'){ const gi = getTeamIndexOfPokemon(attacker); if(gi >= 0) clearTeamSlotItem(gi); } if(typeof clearPokemonHeldItem === 'function') clearPokemonHeldItem(attacker); } catch(_){}
  addBattleLog(`${attacker.name} utilise son ${getItemName(attackerHeldItem)} ! (+30%)`);
 }

 // DORM-01 — multiplicateur de météo.
 const weatherKey = normalizeWeather((typeof battle !== 'undefined' && battle) ? battle.weather : null);
 let weatherMult = 1;
 if (weatherKey === 'rain' && mv.type === 'Water') weatherMult *= 1.5;
 if (weatherKey === 'rain' && mv.type === 'Fire') weatherMult *= 0.5;
 if (weatherKey === 'sun' && mv.type === 'Fire') weatherMult *= 1.5;
 if (weatherKey === 'sun' && mv.type === 'Water') weatherMult *= 0.5;
 // Tempête de sable : +50 % défense spéciale aux Pokémon Roche.
 if (weatherKey === 'sand' && isSpec && (defender.type1 === 'Rock' || defender.type2 === 'Rock')) def *= 1.5;
 // DORM-04 — Force Sable : +50 % d'Attaque sous la tempête de sable.
 if (weatherKey === 'sand' && !isSpec && _hasTal(attacker, 'sandforce')) itemTypeMult *= 1.5;

 // DORM-02b — graines de terrain : +50 % def/spd sur le terrain correspondant, consommée.
 const heldDefSeed = (typeof ITEMS !== 'undefined' && ITEMS[defenderHeldItem]) ? ITEMS[defenderHeldItem] : null;
 if(heldDefSeed && heldDefSeed.seedType && !defender._seedBoost){
  const seedTerrain = { electric:'electric', grass:'grassy', misty:'misty', fog:'psychic' }[String(heldDefSeed.seedType).toLowerCase()];
  const curTerrain = normalizeTerrain((typeof battle !== 'undefined' && battle) ? battle.terrain : null);
  if(seedTerrain && seedTerrain === curTerrain){
   defender._seedBoost = true;
   try { if(typeof clearTeamSlotItem === 'function' && typeof getTeamIndexOfPokemon === 'function'){ const gi = getTeamIndexOfPokemon(defender); if(gi >= 0) clearTeamSlotItem(gi); } if(typeof clearPokemonHeldItem === 'function') clearPokemonHeldItem(defender); } catch(_){}
   addBattleLog(`${defender.name} est renforcé par sa graine (terrain ${curTerrain}) !`);
  }
 }
 if(defender._seedBoost) def *= 1.5;

 let dmg=Math.max(1, Math.floor(((2*attacker.level/5+2)*power*atk/def/50+2)*stabMult*eff*critMult*randMult*itemTypeMult*weatherMult*talentDmgMult));
 // DORM-04 — capacités multi-coups (bullet_seed, rock_blast…).
 // Bouchon (skilllink) et Dé à Jouer (loaded_dice) forcent le maximum de coups.
 if(mv.multihit && Array.isArray(mv.multihit) && mv.multihit.length === 2){
  const _mMin = Math.max(2, Number(mv.multihit[0]) || 2);
  const _mMax = Math.max(_mMin, Number(mv.multihit[1]) || _mMin);
  let _hits = 1;
  if(_hasTal(attacker, 'skilllink') || attackerHeldItem === 'loaded_dice') _hits = _mMax;
  else _hits = (typeof rand === 'function') ? rand(_mMin, _mMax) : _mMin;
  if(_hits > 1){ dmg = Math.max(1, Math.floor(dmg * _hits)); addBattleLog(`${getMoveName(moveId)} frappe ${_hits} fois !`); }
 }
 // DORM-04 — écrans : Mur Lumière (spécial) / Mur de Protection (physique).
 if((typeof battle !== 'undefined' && battle) && battle.weather === 'lightscreen' && isSpec) dmg = Math.max(1, Math.floor(dmg * 0.5));
 if((typeof battle !== 'undefined' && battle) && battle.weather === 'reflect' && !isSpec) dmg = Math.max(1, Math.floor(dmg * 0.5));
 // DORM-04 — Mimic : dégâts doublés (consommé).
 if(attacker._tmpDmgMult){ dmg = Math.max(1, Math.floor(dmg * attacker._tmpDmgMult)); attacker._tmpDmgMult = null; }
 // Type-resistance berries: PokeChill base effect is has 30% reduction of super-effective damage.
 const heldDefItem = (typeof ITEMS !== 'undefined' && ITEMS[defenderHeldItem]) ? ITEMS[defenderHeldItem] : null;
 if(heldDefItem && heldDefItem.resistType === mv.type && eff > 1){
   const reduction = Number(heldDefItem.resistPercent || 30);
   dmg = Math.max(1, Math.floor(dmg * (1 - reduction / 100)));
   addBattleLog(`${defender.name} resists the attack with ${getItemName(defenderHeldItem)} (-${reduction}%).`);
 }
 if(side === 'enemy' && typeof battle !== 'undefined' && battle && battle.isTraining){
 dmg = Math.max(1, Math.floor(dmg * 0.25));
 }

 
 if(defenderHeldItem === 'assault_vest' && mv.cat === 'spec'){
 dmg = Math.max(1, Math.floor(dmg * 0.9));
 }

 
 if(attacker.status==='burn'&&mv.cat==='phys') dmg=Math.floor(dmg/2);

 if(_pwDrainOf(mv)){
 const drained=Math.max(1, Math.floor(dmg * _pwDrainOf(mv)));
 attacker.currentHP=Math.min(attacker.maxHP,attacker.currentHP+drained);
 visualHeal(side, drained, 'drain');
 addBattleLog(`${attacker.name} absorbe ${drained} PV !`);
 if(side === 'enemy' && battle.isChamp && battle.champTeam && battle.champTeam[battle.champPokeIdx]){
 battle.champTeam[battle.champPokeIdx].currentHP = attacker.currentHP;
 }
 }

 const TYPE_GUARD_MAP = {
   flameguard: 'Fire', waterguard: 'Water', leafguard: 'Grass',
   electricguard: 'Electric', voltage: 'Electric', iceguard: 'Ice', frostguard: 'Ice',
   fightingguard: 'Fighting', grabguard: 'Fighting', poisonguard: 'Poison',
   groundguard: 'Ground', flyingguard: 'Flying', psychicguard: 'Psychic',
   bugguard: 'Bug', rockguard: 'Rock', ghostguard: 'Ghost', curseguard: 'Ghost',
   dragonguard: 'Dragon', darkguard: 'Dark', sinisterguard: 'Dark',
   steelguard: 'Steel', fairyguard: 'Fairy', normalguard: 'Normal', plainguard: 'Normal'
 };
 const talGuard = TYPE_GUARD_MAP[defender.talent] ? defender.talent : (TYPE_GUARD_MAP[getPokemonHiddenTalent(defender)] ? getPokemonHiddenTalent(defender) : null);
 if(talGuard && TYPE_GUARD_MAP[talGuard] === mv.type){
   dmg = Math.max(1, Math.floor(dmg * 0.5));
 }
 if(_hasTal(defender, 'sturdy')){
   dmg = Math.max(1, Math.floor(dmg * 0.85));
 }

 if(_hasTal(defender, 'sturdy') && dmg >= defender.currentHP && defender.currentHP >= defender.maxHP){
 dmg = defender.currentHP - 1;
 visualTalent(side === 'player' ? 'enemy' : 'player', 'sturdy', '1 PV');
 addBattleLog(tr('combat_attack_auto_33', {p0:defender.name}));
 }

 // DORM-02d — Faiblesse Politique : +2 crans atk/spa après un coup super-efficace subi.
 if(defenderHeldItem === 'weakness_policy' && eff > 1 && defender.currentHP > 0){
  const wpMods = (side === 'player' ? battle.enemyMods : battle.playerMods);
  if(wpMods){ wpMods.atk = Math.min(3.0, (wpMods.atk || 1) * 2); wpMods.spa = Math.min(3.0, (wpMods.spa || 1) * 2); }
  addBattleLog(`${defender.name} est survolté par sa Faiblesse Politique !`);
 }

 // DORM-04 — Cœur Noble : +100 % d'Attaque Spéciale après un coup super-efficace subi.
 if(_hasTal(defender, 'justified') && eff > 1 && defender.currentHP > 0){
  const jMods = (side === 'player' ? battle.enemyMods : battle.playerMods);
  if(jMods){ jMods.spa = Math.min(3.0, (jMods.spa || 1) * 2); }
  addBattleLog(`${defender.name} est galvanisé par son Cœur Noble !`);
 }
 // DORM-04 — Colérique : +100 % d'Attaque après un coup super-efficace subi.
 if(_hasTal(defender, 'angerpoint') && eff > 1 && defender.currentHP > 0){
  const aMods = (side === 'player' ? battle.enemyMods : battle.playerMods);
  if(aMods){ aMods.atk = Math.min(3.0, (aMods.atk || 1) * 2); }
  addBattleLog(`${defender.name} entre dans une colère noire !`);
 }

 defender.currentHP=Math.max(0,defender.currentHP-dmg);
 if(side === 'player'){
  if(!battle.sessionDamageByPokemon) battle.sessionDamageByPokemon = {};
  const key = attacker.uid || String(attacker.id || attacker.name || 'poke');
  if(!battle.sessionDamageByPokemon[key]) battle.sessionDamageByPokemon[key] = {id:attacker.id, name:attacker.name, emoji:attacker.emoji||'', shiny:!!(attacker.shinyActive||attacker.shiny), damage:0, kos:0};
  battle.sessionDamageByPokemon[key].damage += dmg;
  if(defender.currentHP <= 0) battle.sessionDamageByPokemon[key].kos += 1;
 }
 if(battle.isChamp && battle.champTeam && battle.champTeam[battle.champPokeIdx]){
 if(side === 'player') battle.champTeam[battle.champPokeIdx].currentHP = defender.currentHP;
 }
 playHitAnim(side);
 visualDamage(side, dmg, eff, critMult>1);

 if((_hasTal(defender, 'roughskin') || _hasTal(defender, 'ironbarbs') || _hasTal(defender, 'spikypelt')) && mv.cat === 'phys'){
 const refl = Math.max(1, Math.floor(attacker.maxHP * 0.12));
 attacker.currentHP = Math.max(0, attacker.currentHP - refl);
 addBattleLog(tr('combat_attack_auto_34', {p0:attacker.name, p1:refl}));
 if(side === 'enemy' && battle.isChamp && battle.champTeam && battle.champTeam[battle.champPokeIdx]){
 battle.champTeam[battle.champPokeIdx].currentHP = attacker.currentHP;
 }
 }
 if(defender.talent === 'static' && mv.cat === 'phys' && chance(25) && !attacker.status){
 attacker.status = 'para';
 attacker.statusTurns = 2; 
 addBattleLog(tr('combat_attack_auto_35', {p0:attacker.name}));
 }
 if(defender.talent === 'poisonpoint' && mv.cat === 'phys' && chance(25) && !attacker.status){
 attacker.status = 'poison';
 attacker.statusTurns = 3; 
 addBattleLog(tr('combat_attack_auto_36', {p0:attacker.name}));
 }
 // DORM-04 — talents « au contact » (PokeChill) : statut infligé à l'attaquant.
 if(mv.cat === 'phys' && !attacker.status && !isImmuneToStatus(attacker, 'burn', battle.weather)){
  if(_hasTal(defender, 'flamebody') && chance(15)){ attacker.status='burn'; attacker.statusTurns=3; addBattleLog(`${attacker.name} est brûlé par le corps de ${defender.name} !`); }
  else if(_hasTal(defender, 'glacialbody') && chance(5)){ attacker.status='freeze'; attacker.statusTurns=3; addBattleLog(`${attacker.name} est gelé par le corps de ${defender.name} !`); }
  else if(_hasTal(defender, 'strangecharm') && chance(15)){ attacker.status='confuse'; attacker.statusTurns=2; addBattleLog(`${attacker.name} est confus par le charme de ${defender.name} !`); }
 }
 if(mv.cat === 'phys' && !attacker.status && _hasTal(defender, 'effectspore') && chance(5)){
  const roll = rand(1, 3);
  if(roll === 1 && !isImmuneToStatus(attacker, 'sleep', battle.weather)){ attacker.status='sleep'; attacker.statusTurns=heldStatusTurns(attacker, rand(1,3)); addBattleLog(`${attacker.name} s'endort (Spore) !`); }
  else if(roll === 2 && !isImmuneToStatus(attacker, 'poison', battle.weather)){ attacker.status='poison'; attacker.statusTurns=heldStatusTurns(attacker, 3); addBattleLog(`${attacker.name} est empoisonné (Spore) !`); }
  else if(roll === 3 && !isImmuneToStatus(attacker, 'para', battle.weather)){ attacker.status='para'; attacker.statusTurns=heldStatusTurns(attacker, 2); addBattleLog(`${attacker.name} est paralysé (Spore) !`); }
 }
 // DORM-04 — Poisseux : la vitesse de l'attaquant chute de moitié au contact.
 if(_hasTal(defender, 'gooey') && mv.cat === 'phys'){
  const _atkMods = (side === 'player' ? battle.playerMods : battle.enemyMods);
  if(_atkMods && !_hasTal(attacker, 'fullmetalbody') && attackerHeldItem !== 'clear_amulet'){
   _atkMods.spe = Math.max(0.25, (_atkMods.spe || 1) * 0.5);
   addBattleLog(`${attacker.name} est englué (Vitesse réduite) !`);
  }
 }

 // DORM-06 — baies réactives du défenseur (aucune consommée).
 const _bDef = berryHeld(defender);
 const _defSide = (side === 'player' ? 'enemy' : 'player');
 if(_bDef){
  if(_bDef.itm.category === 'counter_phys' && mv.cat === 'phys' && attacker.currentHP > 0){
   const refl = Math.max(1, Math.floor(attacker.maxHP * 0.12));
   attacker.currentHP = Math.max(0, attacker.currentHP - refl);
   addBattleLog(`${defender.name} renvoie ${refl} PV (${getItemName(_bDef.key)}) !`);
  }
  if(_bDef.itm.category === 'counter_spec' && mv.cat === 'spec' && attacker.currentHP > 0){
   const refl = Math.max(1, Math.floor(attacker.maxHP * 0.12));
   attacker.currentHP = Math.max(0, attacker.currentHP - refl);
   addBattleLog(`${defender.name} renvoie ${refl} PV (${getItemName(_bDef.key)}) !`);
  }
  if(_bDef.itm.category === 'hit_buff' && defender.currentHP > 0 && !berryUsed(defender, '_hitBuffUsed')){
   if(typeof pwStatChange === 'function'){
    pwStatChange(_defSide, _bDef.itm.stat, 1 + berryPowerVal(_bDef.key, berryLevel(defender, _bDef.key, _defSide)), {poke:defender});
    berryMark(defender, '_hitBuffUsed');
    addBattleLog(`${defender.name} se renforce (${getItemName(_bDef.key)}) !`);
   }
  }
  if(_bDef.itm.category === 'super_heal' && eff > 1 && defender.currentHP > 0 && !berryUsed(defender, '_enigmaUsed')){
   const heal = Math.max(1, Math.floor(defender.maxHP * berryPowerVal(_bDef.key, berryLevel(defender, _bDef.key, _defSide))));
   defender.currentHP = Math.min(defender.maxHP, defender.currentHP + heal);
   berryMark(defender, '_enigmaUsed');
   addBattleLog(`${defender.name} récupère ${heal} PV (${getItemName(_bDef.key)}) !`);
  }
 }

 const effMsg=effText(eff);
 addBattleLog(tr('combat_damage_lost', {name:defender.name, damage:dmg, effect:effMsg?' <span class="pw-light2">'+effMsg+'</span>':''}));
 if(critMult>1) addBattleLog(`<span class="pw-orange">${t('critical_hit')}</span>`);

 
 const _recoilRatio = _pwRecoilOf(mv);
 if(_recoilRatio > 0){
 let recoil = (_recoilRatio === 0.5) ? Math.max(1, Math.floor(attacker.maxHP / 2)) : Math.max(1, Math.floor(dmg * _recoilRatio));
 attacker.currentHP=Math.max(0,attacker.currentHP-recoil);
 spawnBattleFloat(side, '-' + recoil, 'recoil', 'recul');
 addBattleLog(`${attacker.name} subit le contrecoup (-${recoil} PV) !`);
 if(side === 'enemy' && battle.isChamp && battle.champTeam && battle.champTeam[battle.champPokeIdx]){
 battle.champTeam[battle.champPokeIdx].currentHP = attacker.currentHP;
 }
 }

 
 if(attackerHeldItem === 'life_orb' && power > 0){
 const loRecoil = Math.max(1, Math.floor(attacker.maxHP / 10));
 attacker.currentHP = Math.max(0, attacker.currentHP - loRecoil);
 visualItem(side, attackerHeldItem, '-PV');
 spawnBattleFloat(side, '-' + loRecoil, 'recoil', '');
 addBattleLog(tr('combat_attack_auto_38', {p0:attacker.name, p1:loRecoil}));
 if(side === 'enemy' && battle.isChamp && battle.champTeam && battle.champTeam[battle.champPokeIdx]){
 battle.champTeam[battle.champPokeIdx].currentHP = attacker.currentHP;
 }
 }


 
 
 let secChance = mv.effC || 0;
 if(attacker.talent === 'serenegrace') secChance *= 2;
 // DORM-02h — Poing Chance : les effets secondaires des capacités de poing
 // s'exécutent deux fois (PokeChill).
 if(attackerHeldItem === 'lucky_punch' && isPunchMove(moveId)) secChance *= 2;
 if(!_sheerForce&&mv.eff&&secChance&&defender.currentHP>0&&!defender.status&&!isImmuneToStatus(defender, mv.eff, battle.weather)){
 if(chance(secChance)){
 if(mv.eff==='burn'&&defender.type1!=='Fire'&&defender.type2!=='Fire'){
 defender.status='burn';defender.statusTurns=heldStatusTurns(defender, 3);addBattleLog(tr('combat_attack_auto_40', {p0:defender.name}));
 } else if(mv.eff==='para'){
 if(!(defender.type1==='Electric'||defender.type2==='Electric'||defender.type1==='Ground'||defender.type2==='Ground')){
 defender.status='para';defender.statusTurns=heldStatusTurns(defender, 2);addBattleLog(tr('combat_attack_auto_41', {p0:defender.name}));
 }
 } else if(mv.eff==='poison'){
 if(defender.type1!=='Poison'&&defender.type2!=='Poison'&&defender.type1!=='Steel'&&defender.type2!=='Steel'){
 defender.status='poison';defender.statusTurns=heldStatusTurns(defender, 3);addBattleLog(tr('combat_attack_auto_42', {p0:defender.name}));
 }
 } else if(mv.eff==='freeze'&&defender.type1!=='Ice'&&defender.type2!=='Ice'){
 defender.status='freeze';defender.statusTurns=heldStatusTurns(defender, 3);addBattleLog(tr('combat_attack_auto_43', {p0:defender.name}));
 } else if(mv.eff==='sleep'){
 defender.status='sleep';defender.statusTurns=heldStatusTurns(defender, rand(1,3));addBattleLog(tr('combat_attack_auto_44', {p0:defender.name}));
 }
 }
 }

 // DORM-04 — effets secondaires issus de la DESCRIPTION (statuts, baisses/
 // hausses de stats, flinch, précision) — les 103 attaques sans champ `eff`.
 if(!_sheerForce && defender.currentHP > 0 && power > 0){
  const fx = _pwSecondaryFromDesc(mv);
  const enemySideForDrop = (side === 'player' ? 'enemy' : 'player');
  // statut de repli (quand mv.eff absent)
  if(!mv.eff && fx.status && !defender.status && !isImmuneToStatus(defender, fx.status, battle.weather) && chance(fx.statusChance)){
   const st = fx.status;
   const t1 = defender.type1, t2 = defender.type2;
   const typeImmune =
    (st === 'para' && (t1==='Electric'||t2==='Electric'||t1==='Ground'||t2==='Ground')) ||
    ((st === 'poison') && (t1==='Poison'||t2==='Poison'||t1==='Steel'||t2==='Steel')) ||
    (st === 'burn' && (t1==='Fire'||t2==='Fire')) ||
    (st === 'freeze' && (t1==='Ice'||t2==='Ice'));
   if(!typeImmune){
    defender.status = st;
    defender.statusTurns = heldStatusTurns(defender, st === 'sleep' ? rand(1,3) : (st === 'para' ? 2 : 3), attacker);
    addBattleLog(`${defender.name} subit ${st} !`);
   }
  }
  // baisses de stats
  for(const dr of fx.drops){
   if(chance(dr.chance) && typeof pwStatChange === 'function'){
    pwStatChange(enemySideForDrop, dr.stat, 1 - dr.pct/100, {poke:defender});
    addBattleLog(`${defender.name} voit sa stat baisser (${getMoveName(moveId)}) !`);
   }
  }
  // hausses de stats (du porteur)
  for(const up of fx.boosts){
   if(chance(up.chance) && typeof pwStatChange === 'function'){
    pwStatChange(side, up.stat, 1 + up.pct/100, {poke:attacker});
    addBattleLog(`${attacker.name} booste sa stat (${getMoveName(moveId)}) !`);
   }
  }
  // flinch : la cible saute sa prochaine action
  if(fx.flinch && chance(fx.flinch) && !_hasTal(defender, 'fullmetalbody')){
   defender._flinch = true;
   addBattleLog(`${defender.name} tressaille (flinch) !`);
  }
  // baisse de précision : la prochaine attaque de la cible est moins précise
  if(fx.accDown && chance(fx.accDown)){
   defender._accDown = (defender._accDown || 0) + 1;
   addBattleLog(`La précision de ${defender.name} baisse !`);
  }
  // auto-débuff du porteur (capacités « demerit » : Centrifugifle, Psycho Boost…)
  for(const sd of fx.selfDrops){
   if(chance(sd.chance) && typeof pwStatChange === 'function'){
    pwStatChange(side, sd.stat, 1 - sd.pct/100, {poke:attacker});
    addBattleLog(`${attacker.name} s'affaiblit (${getMoveName(moveId)}) !`);
   }
  }
 }

 // DORM-02h — Bouton de Fuite / Sac de Fuite : switch forcé après l'attaque.
 if(side === 'player' && typeof G !== 'undefined' && G && Array.isArray(G.team) && G.team.length > 1 && (attackerHeldItem === 'eject_button' || attackerHeldItem === 'eject_pack')){
  const _ejCur = battle.playerPokeIdx || 0;
  let _ejNext = -1;
  for(let i = 1; i < G.team.length; i++){
   const cand = attackerHeldItem === 'eject_button' ? (_ejCur + i) % G.team.length : (_ejCur - i + G.team.length) % G.team.length;
   if(G.team[cand] && Number(G.team[cand].currentHP ?? G.team[cand].hp ?? 1) > 0){ _ejNext = cand; break; }
  }
  if(_ejNext !== -1 && _ejNext !== _ejCur){
   addBattleLog(`${attacker.name} est remplacé (${getItemName(attackerHeldItem)}) !`);
   if(typeof doSwitchBattlePoke === 'function') doSwitchBattlePoke(_ejNext);
   else if(typeof switchBattlePoke === 'function') switchBattlePoke(_ejNext);
   return;
  }
 }

 if((moveId === 'u_turn' || moveId === 'volt_switch' || moveId === 'baton_pass') && side === 'player' && typeof G !== 'undefined' && G && Array.isArray(G.team)){
   const curIdx = battle.playerPokeIdx || 0;
   let nextIdx = -1;
   for(let i = 1; i < G.team.length; i++){
     const candIdx = (curIdx + i) % G.team.length;
     const cand = G.team[candIdx];
     if(cand && cand.currentHP > 0){
       nextIdx = candIdx;
       break;
     }
   }
   if(nextIdx !== -1 && nextIdx !== curIdx){
     addBattleLog(`${attacker.name} fait relais à ${G.team[nextIdx].name} !`);
     if(typeof doSwitchBattlePoke === 'function') doSwitchBattlePoke(nextIdx);
     else if(typeof switchBattlePoke === 'function') switchBattlePoke(nextIdx);
     return;
   }
 }

 syncStatusBack(attacker, defender);
 visualStatusChanges(side, prevAttackerStatus, prevDefenderStatus, attacker, defender);
 updateBattleUI();
}


// --- Migrated to ES module, globals exposed ---
if (typeof heldItemPower !== 'undefined') { if (typeof window !== 'undefined') window.heldItemPower = heldItemPower; if (typeof globalThis !== 'undefined') globalThis.heldItemPower = heldItemPower; }
if (typeof heldPowerLevel !== 'undefined') { if (typeof window !== 'undefined') window.heldPowerLevel = heldPowerLevel; if (typeof globalThis !== 'undefined') globalThis.heldPowerLevel = heldPowerLevel; }
if (typeof npcHeldItemMult !== 'undefined') { if (typeof window !== 'undefined') window.npcHeldItemMult = npcHeldItemMult; if (typeof globalThis !== 'undefined') globalThis.npcHeldItemMult = npcHeldItemMult; }
if (typeof heldItemMultFor !== 'undefined') { if (typeof window !== 'undefined') window.heldItemMultFor = heldItemMultFor; if (typeof globalThis !== 'undefined') globalThis.heldItemMultFor = heldItemMultFor; }
if (typeof heldStatusTurns !== 'undefined') { if (typeof window !== 'undefined') window.heldStatusTurns = heldStatusTurns; if (typeof globalThis !== 'undefined') globalThis.heldStatusTurns = heldStatusTurns; }
if (typeof syncStatusBack !== 'undefined') { if (typeof window !== 'undefined') window.syncStatusBack = syncStatusBack; if (typeof globalThis !== 'undefined') globalThis.syncStatusBack = syncStatusBack; }
if (typeof weatherTurnsFor !== 'undefined') { if (typeof window !== 'undefined') window.weatherTurnsFor = weatherTurnsFor; if (typeof globalThis !== 'undefined') globalThis.weatherTurnsFor = weatherTurnsFor; }
if (typeof isHeadMove !== 'undefined') { if (typeof window !== 'undefined') window.isHeadMove = isHeadMove; if (typeof globalThis !== 'undefined') globalThis.isHeadMove = isHeadMove; }
if (typeof isSoundMove !== 'undefined') { if (typeof window !== 'undefined') window.isSoundMove = isSoundMove; if (typeof globalThis !== 'undefined') globalThis.isSoundMove = isSoundMove; }
if (typeof isDanceMove !== 'undefined') { if (typeof window !== 'undefined') window.isDanceMove = isDanceMove; if (typeof globalThis !== 'undefined') globalThis.isDanceMove = isDanceMove; }
if (typeof isWindMove !== 'undefined') { if (typeof window !== 'undefined') window.isWindMove = isWindMove; if (typeof globalThis !== 'undefined') globalThis.isWindMove = isWindMove; }
if (typeof executeStatMove !== 'undefined') { if (typeof window !== 'undefined') window.executeStatMove = executeStatMove; if (typeof globalThis !== 'undefined') globalThis.executeStatMove = executeStatMove; }
if (typeof berryHeld !== 'undefined') { if (typeof window !== 'undefined') window.berryHeld = berryHeld; if (typeof globalThis !== 'undefined') globalThis.berryHeld = berryHeld; }
if (typeof berryPowerVal !== 'undefined') { if (typeof window !== 'undefined') window.berryPowerVal = berryPowerVal; if (typeof globalThis !== 'undefined') globalThis.berryPowerVal = berryPowerVal; }
if (typeof berryLevel !== 'undefined') { if (typeof window !== 'undefined') window.berryLevel = berryLevel; if (typeof globalThis !== 'undefined') globalThis.berryLevel = berryLevel; }
if (typeof isImmuneToStatus !== 'undefined') { if (typeof window !== 'undefined') window.isImmuneToStatus = isImmuneToStatus; if (typeof globalThis !== 'undefined') globalThis.isImmuneToStatus = isImmuneToStatus; }
if (typeof transformPokemon !== 'undefined') { if (typeof window !== 'undefined') window.transformPokemon = transformPokemon; if (typeof globalThis !== 'undefined') globalThis.transformPokemon = transformPokemon; }
if (typeof restoreAllTransformedPokemon !== 'undefined') { if (typeof window !== 'undefined') window.restoreAllTransformedPokemon = restoreAllTransformedPokemon; if (typeof globalThis !== 'undefined') globalThis.restoreAllTransformedPokemon = restoreAllTransformedPokemon; }
if (typeof handleStatusBeforeMove !== 'undefined') { if (typeof window !== 'undefined') window.handleStatusBeforeMove = handleStatusBeforeMove; if (typeof globalThis !== 'undefined') globalThis.handleStatusBeforeMove = handleStatusBeforeMove; }
if (typeof playAttackAnim !== 'undefined') { if (typeof window !== 'undefined') window.playAttackAnim = playAttackAnim; if (typeof globalThis !== 'undefined') globalThis.playAttackAnim = playAttackAnim; }
if (typeof playHitAnim !== 'undefined') { if (typeof window !== 'undefined') window.playHitAnim = playHitAnim; if (typeof globalThis !== 'undefined') globalThis.playHitAnim = playHitAnim; }
if (typeof executeAttack !== 'undefined') { if (typeof window !== 'undefined') window.executeAttack = executeAttack; if (typeof globalThis !== 'undefined') globalThis.executeAttack = executeAttack; }
if (typeof executeZCrystalAttack !== 'undefined') { if (typeof window !== 'undefined') window.executeZCrystalAttack = executeZCrystalAttack; if (typeof globalThis !== 'undefined') globalThis.executeZCrystalAttack = executeZCrystalAttack; }
if (typeof spawnBattleFloat !== 'undefined') { if (typeof window !== 'undefined') window.spawnBattleFloat = spawnBattleFloat; if (typeof globalThis !== 'undefined') globalThis.spawnBattleFloat = spawnBattleFloat; }
if (typeof spawnBattleChip !== 'undefined') { if (typeof window !== 'undefined') window.spawnBattleChip = spawnBattleChip; if (typeof globalThis !== 'undefined') globalThis.spawnBattleChip = spawnBattleChip; }
if (typeof addBattleTimeline !== 'undefined') { if (typeof window !== 'undefined') window.addBattleTimeline = addBattleTimeline; if (typeof globalThis !== 'undefined') globalThis.addBattleTimeline = addBattleTimeline; }
if (typeof visualHeal !== 'undefined') { if (typeof window !== 'undefined') window.visualHeal = visualHeal; if (typeof globalThis !== 'undefined') globalThis.visualHeal = visualHeal; }
if (typeof visualItem !== 'undefined') { if (typeof window !== 'undefined') window.visualItem = visualItem; if (typeof globalThis !== 'undefined') globalThis.visualItem = visualItem; }
if (typeof visualTalent !== 'undefined') { if (typeof window !== 'undefined') window.visualTalent = visualTalent; if (typeof globalThis !== 'undefined') globalThis.visualTalent = visualTalent; }
if (typeof visualStatus !== 'undefined') { if (typeof window !== 'undefined') window.visualStatus = visualStatus; if (typeof globalThis !== 'undefined') globalThis.visualStatus = visualStatus; }



// --- Exported globals ---
if (typeof battleEffKind !== 'undefined') { if (typeof window !== 'undefined') window.battleEffKind = battleEffKind; if (typeof globalThis !== 'undefined') globalThis.battleEffKind = battleEffKind; }
if (typeof battleEffShort !== 'undefined') { if (typeof window !== 'undefined') window.battleEffShort = battleEffShort; if (typeof globalThis !== 'undefined') globalThis.battleEffShort = battleEffShort; }
if (typeof battleTypeColor !== 'undefined') { if (typeof window !== 'undefined') window.battleTypeColor = battleTypeColor; if (typeof globalThis !== 'undefined') globalThis.battleTypeColor = battleTypeColor; }
if (typeof ensureBattleTimeline !== 'undefined') { if (typeof window !== 'undefined') window.ensureBattleTimeline = ensureBattleTimeline; if (typeof globalThis !== 'undefined') globalThis.ensureBattleTimeline = ensureBattleTimeline; }
if (typeof getBattleSideCard !== 'undefined') { if (typeof window !== 'undefined') window.getBattleSideCard = getBattleSideCard; if (typeof globalThis !== 'undefined') globalThis.getBattleSideCard = getBattleSideCard; }
if (typeof restoreTransformedPokemon !== 'undefined') { if (typeof window !== 'undefined') window.restoreTransformedPokemon = restoreTransformedPokemon; if (typeof globalThis !== 'undefined') globalThis.restoreTransformedPokemon = restoreTransformedPokemon; }
if (typeof visualDamage !== 'undefined') { if (typeof window !== 'undefined') window.visualDamage = visualDamage; if (typeof globalThis !== 'undefined') globalThis.visualDamage = visualDamage; }
if (typeof visualMoveUsed !== 'undefined') { if (typeof window !== 'undefined') window.visualMoveUsed = visualMoveUsed; if (typeof globalThis !== 'undefined') globalThis.visualMoveUsed = visualMoveUsed; }
if (typeof visualStatusChanges !== 'undefined') { if (typeof window !== 'undefined') window.visualStatusChanges = visualStatusChanges; if (typeof globalThis !== 'undefined') globalThis.visualStatusChanges = visualStatusChanges; }

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  transformPokemon,
  restoreAllTransformedPokemon,
  handleStatusBeforeMove,
  playAttackAnim,
  playHitAnim,
  executeAttack,
  spawnBattleFloat,
  spawnBattleChip,
  addBattleTimeline,
  visualHeal,
  visualItem,
  visualTalent,
  visualStatus,
  battleEffKind,
  battleEffShort,
  battleTypeColor,
  ensureBattleTimeline,
  getBattleSideCard,
  restoreTransformedPokemon,
  visualDamage,
  visualMoveUsed,
  visualStatusChanges,
  heldItemPower,
  heldPowerLevel,
  npcHeldItemMult,
  heldItemMultFor,
  heldStatusTurns,
  syncStatusBack,
  weatherTurnsFor,
  isPunchMove,
  isFangMove,
  isClawMove,
  isPulseMove,
  isSharpMove,
  isHeadMove,
  isSoundMove,
  isDanceMove,
  isWindMove,
  executeStatMove,
  executeZCrystalAttack,
};



