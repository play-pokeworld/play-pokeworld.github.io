// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// ── Thin classic adapter → THE single complete Pokémon card (DS) ───────
// All game computation stays here (HP %, cooldown next-move index, held
// item buffs, stat stage arrows, drag contracts); ALL markup is produced
// by the design-system PokeFullCard component via window.PokeUI — zero
// legacy card markup below.

// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
}

function parseLegacyCall(code){
 if(!code) return null;
 const match = String(code).match(/^([A-Za-z_$][\w$]*)\((.*)\)$/);
 if(match) return { call: match[1], args: match[2].replace(/&quot;/g, '"') };
 return null;
}

function parseLegacyContext(code){
 if(!code) return null;
 const clean = String(code).replace(/^event\.preventDefault\(\);?/, '').replace(/;?return false;?$/, '').replace(/;$/, '');
 const match = clean.match(/^([A-Za-z_$][\w$]*)\((.*)\)$/);
 if(match) return { call: match[1], args: match[2].replace(/&quot;/g, '"') };
 return null;
}

function camelDataKey(dataAttr){ return String(dataAttr).replace(/-([a-z])/g, (m, c) => c.toUpperCase()); }

// Canonical sprite src resolution (same source as spriteImg; guarded for
// vm-based tests where SPRITE_DATA/DEX_MAP are absent → emoji orb).
function _pwCardSpriteSrc(id, shiny){
 try{
  const num = (typeof DEX_MAP !== 'undefined' && DEX_MAP && DEX_MAP[String(id)] != null) ? DEX_MAP[String(id)] : Number(id);
  const bucket = shiny ? 'frontShiny' : 'front';
  if (typeof SPRITE_DATA !== 'undefined' && SPRITE_DATA && SPRITE_DATA[bucket]) return SPRITE_DATA[bucket][String(num)] || null;
 }catch(_){}
 return null;
}

function generatePokeCardHTML(p, i, options = {}) {
  const comps = (typeof window !== 'undefined' && window.PokeUI && window.PokeUI.components) ? window.PokeUI.components : null;
  if(!comps || typeof comps.pokeFullCardHTML !== 'function') throw new Error('[ui] PokeUI components not loaded (pokeFullCardHTML)');
  const {
    isActive = false,
    isEnemy = false,
    isFainted = false,
    showMoves = true,
    showXP = false,
    movesAsBars = false,
    movesDraggable = false,
    onRightClickSprite = null,
    onLeftClickSprite = null,
    onLeftClickItem = null,
    showStatus = false,
    // Phase 25 — read-only "Factory preparation panel" (atoll)
    noSpriteHandlers = false,
    itemReadonly = false,
    moveDragAttr = null,
    spriteTitle = null,
    moveInfoContextless = false,
  } = options;

  const pct = p.currentHP / p.maxHP;
  const hpClass = pct > 0.5 ? 'high' : pct > 0.2 ? 'medium' : 'low';
  const nextIdx = isEnemy
    ? ((battle.eMoveIdx || 0) % Math.max(1, (p.moves || []).length))
    : ((battle.pMoveIdx || 0) % Math.max(1, (p.moves || []).length));
  const heldKey = (typeof getHeldItemForPokemon === 'function') ? getHeldItemForPokemon(p) : (p.heldItem || null);
  if(!isEnemy && heldKey) p.heldItem = heldKey;
  const itm = heldKey ? ITEMS[heldKey] : null;
  const b = getHeldBuff(p);

  const getArrows = (val) => {
    if (val > 1.8) return (typeof t === 'function' ? t('stat_up_high') : '\u25B2\u25B2\u25B2');
    if (val > 1.3) return (typeof t === 'function' ? t('stat_up_mid') : '\u25B2\u25B2');
    if (val > 1.0) return (typeof t === 'function' ? t('stat_up_low') : '\u25B2');
    if (val < 0.5) return (typeof t === 'function' ? t('stat_down_high') : '\u25BC\u25BC\u25BC');
    if (val < 0.75) return (typeof t === 'function' ? t('stat_down_mid') : '\u25BC\u25BC');
    if (val < 1.0) return (typeof t === 'function' ? t('stat_down_low') : '\u25BC');
    return '';
  };

  const sideMods = isEnemy ? battle.enemyMods : battle.playerMods;
  let pAtkMod = (sideMods?.atk || 1) * (1 + (b.atk || 0));
  let pDefMod = (sideMods?.def || 1) * (1 + (b.def || 0));
  let pSpeMod = (sideMods?.spe || 1) * (1 + (b.spe || 0));
  let pSpaMod = (sideMods?.spa || 1) * (1 + (b.spa || 0));
  let pSpdMod = (sideMods?.spd || 1) * (1 + (b.spd || 0));

  const _hasTal = (t) => (typeof hasTalent === 'function') ? hasTalent(p, t) : p.talent === t;
  const w = battle ? battle.weather : null;
  if (_hasTal('chlorophyll') && (w === 'sunny' || w === 'sun')) pSpeMod *= 1.35;
  else if (_hasTal('swiftswim') && (w === 'rainy' || w === 'rain')) pSpeMod *= 1.5;
  else if (_hasTal('sandrush') && (w === 'sand' || w === 'sandstorm')) pSpeMod *= 1.5;
  else if (_hasTal('slushrush') && (w === 'hail' || w === 'snow')) pSpeMod *= 1.5;
  else if (_hasTal('quickfeet') && p.status) pSpeMod *= 1.5;
  else if (_hasTal('unburden') && !p.heldItem) pSpeMod *= 1.5;

  if (_hasTal('hugepower') || _hasTal('purepower')) pAtkMod *= 1.6;
  else if (_hasTal('guts') && p.status) pAtkMod *= 1.5;

  if (_hasTal('solarpower')) pSpaMod *= 1.3;
  if (_hasTal('marvelscale') && p.status) pDefMod *= 1.5;
  if (_hasTal('livingshield') && p.status) pSpdMod *= 1.5;

  const atkArrow = getArrows(pAtkMod);
  const defArrow = getArrows(pDefMod);
  const speArrow = getArrows(pSpeMod);
  const spaArrow = getArrows(pSpaMod);
  const spdArrow = getArrows(pSpdMod);

  let statusBadgesHtml = '';
  if (showStatus) {
    if (p.status) {
      statusBadgesHtml += '<span class="status-badge ' + p.status + '">' + statusLabel(p.status) + '</span>';
    }
    if (atkArrow) statusBadgesHtml += '<span class="buff-badge ' + (atkArrow.includes('\u25B2') ? 'atk-up' : 'atk-down') + '">ATK ' + atkArrow + '</span>';
    if (defArrow) statusBadgesHtml += '<span class="buff-badge ' + (defArrow.includes('\u25B2') ? 'def-up' : 'def-down') + '">DEF ' + defArrow + '</span>';
    if (speArrow) statusBadgesHtml += '<span class="buff-badge ' + (speArrow.includes('\u25B2') ? 'spe-up' : 'spe-down') + '">VIT ' + speArrow + '</span>';
    if (spaArrow) statusBadgesHtml += '<span class="buff-badge ' + (spaArrow.includes('\u25B2') ? 'atk-up' : 'atk-down') + '">SPA ' + spaArrow + '</span>';
    if (spdArrow) statusBadgesHtml += '<span class="buff-badge ' + (spdArrow.includes('\u25B2') ? 'def-up' : 'def-down') + '">SPD ' + spdArrow + '</span>';
  }

  // Held item badge (readonly ⇒ info sheet only; hidden when empty).
  let itemModel = null;
  if (itemReadonly) {
    if (itm) {
      itemModel = {
        key: heldKey,
        spriteHtml: itemSpriteHtml(heldKey, 20),
        readonly: true,
        empty: false,
        click: null,
        context: { call: 'openItemInfo', args: "'" + heldKey + "'" },
        title: t('context_info_touch'),
      };
    }
  } else if (itm) {
    itemModel = {
      key: heldKey,
      spriteHtml: itemSpriteHtml(heldKey, 20),
      readonly: false,
      empty: false,
      click: onLeftClickItem ? parseLegacyCall(onLeftClickItem) : null,
      context: { call: 'openItemInfo', args: "'" + heldKey + "'" },
      title: t('change_or_info_title'),
    };
  } else {
    itemModel = {
      key: null,
      spriteHtml: null,
      readonly: false,
      empty: true,
      click: onLeftClickItem ? parseLegacyCall(onLeftClickItem) : null,
      context: null,
      title: t('equip_click_title'),
    };
  }

  // Moves (4 fixed cells — live anchors preserved for the 60fps ticker).
  let movesMode = null;
  const moveCells = [];
  if (showMoves) {
    movesMode = movesAsBars ? 'bars' : 'chips';
    const dragDataName = moveDragAttr ? 'data-' + moveDragAttr : 'data-move-drag';
    for (let mi = 0; mi < 4; mi++) {
      const m = p.moves && p.moves[mi] ? p.moves[mi] : null;
      if (m && MOVES[m.id]) {
        const mv = MOVES[m.id];
        const moveInfoArgs = moveInfoContextless ? ("'" + m.id + "'") : ("'" + m.id + "',-1");
        const draggable = (movesDraggable && !isEnemy && !movesAsBars);
        moveCells.push({
          name: getMoveName(m.id),
          typeLabel: (typeof getTypeName === 'function' ? getTypeName(mv.type) : mv.type),
          typeCls: String(mv.type || '').toLowerCase(),
          next: mi === nextIdx,
          contextArgs: moveInfoArgs,
          effHtml: battleMoveEffBadgeHtml(mv.type, isEnemy),
          drag: draggable ? { datasetKey: camelDataKey(dragDataName), value: i + '|' + mi } : null,
          title: t('context_info_touch'),
        });
      } else {
        moveCells.push({ empty: true });
      }
    }
  }

  // XP bar (party window only).
  let xpModel = null;
  if (showXP && !isEnemy) {
    const curBase = xpForLevel(p.level);
    const xpInLevel = Math.max(0, (p.xp || 0) - curBase);
    const xpReqLevel = Math.max(1, (p.xpNext || 1) - curBase);
    xpModel = { pct: Math.min(100, (xpInLevel / xpReqLevel) * 100) };
  }

  // Sprite interactions.
  const spriteClick = noSpriteHandlers ? null
    : (onLeftClickSprite ? parseLegacyCall(onLeftClickSprite)
      : (isEnemy ? null : (isActive ? null : { call: 'switchBattlePoke', args: String(i) })));
  const spriteContext = noSpriteHandlers ? null
    : (onRightClickSprite ? parseLegacyContext(onRightClickSprite)
      : (isEnemy ? { call: 'openBattleEnemyPokeModal', args: '' } : { call: 'openPokeInfo', args: String(p.id) }));

  return comps.pokeFullCardHTML({
    active: !!isActive,
    fainted: !!isFainted,
    shiny: !!p.shinyActive,
    shinyStar: !!p.shinyActive,
    sprite: {
      imgSrc: _pwCardSpriteSrc(p.id, !!p.shinyActive),
      emoji: p.emoji,
      title: spriteTitle || t('sprite_click_context_title'),
      click: spriteClick,
      context: spriteContext,
      handlers: !noSpriteHandlers,
    },
    item: itemModel,
    name: (typeof getPokeName === 'function' ? getPokeName(p.id) : p.name),
    level: p.level,
    hp: { current: p.currentHP, max: p.maxHP, pct: Math.floor(pct * 100), cls: hpClass },
    xp: xpModel,
    statusBadgesHtml: statusBadgesHtml,
    moves: movesMode,
    moveCells: moveCells,
  });
}

function battleMoveEffBadgeHtml(moveType, isEnemy){
 try{
  const target = isEnemy ? (typeof getActivePlayerPoke === 'function' ? getActivePlayerPoke() : null) : (battle && battle.enemyPoke);
  if(!target || !moveType || typeof typeEff !== 'function') return '';
  const eff = typeEff(moveType, target.type1, target.type2);
  let label = '';
  if(eff === 0) label = (typeof t === 'function' ? t('eff_immune') : '×0');
  else if(eff >= 4) label = (typeof t === 'function' ? t('eff_4x') : '×4');
  else if(eff >= 2) label = (typeof t === 'function' ? t('eff_2x') : '×2');
  else if(eff <= 0.25) label = (typeof t === 'function' ? t('eff_quarter') : '×¼');
  else if(eff <= 0.5) label = (typeof t === 'function' ? t('eff_half') : '×½');
  else label = (typeof t === 'function' ? t('eff_1x') : '×1');
  const cls = eff === 0 ? 'immune' : eff >= 2 ? 'super' : eff < 1 ? 'resist' : 'neutral';
  return `<span class="move-eff-badge ${cls}">${label}</span>`;
 }catch(_){ return ''; }
}

function trainerRoleLabel(role){
 const key = 'trainer_role_' + String(role || 'trainer').toLowerCase();
 const val = typeof t === 'function' ? t(key) : '';
 return val && val !== key ? val : (role || 'trainer');
}
function trainerStyleLabel(style){
 const key = 'trainer_style_' + String(style || '').toLowerCase().replace(/[^a-z0-9]+/g,'_');
 const val = typeof t === 'function' ? t(key) : '';
 return val && val !== key ? val : style;
}
// The opponent trainer card as a structured model — rendered by the DS
// component (trainerCardVNode); this adapter only resolves + localizes.
function trainerVisualModel(){
 if(!battle || !battle.isChamp) return null;
 let name = '';
 let role = '';
 let style = [];
 let spriteKey = '';
 if(battle.trainerVisual){
  const visual = battle.trainerVisual;
  const bid = battle.questTrainerBattleId || visual.id || visual.battleId || '';
  name = bid && typeof getTrainerBattleName === 'function' ? getTrainerBattleName(bid) : (visual.name || '');
  role = visual.role || '';
  style = visual.style || [];
  spriteKey = visual.sprite || (bid && typeof getTrainerSpriteKey === 'function' ? getTrainerSpriteKey(bid) : role);
 } else if(battle.champId){
  name = getChampName(battle.champId);
  role = battle.champId === 'atoll' ? 'atoll' : ((typeof isLeagueChampionId === 'function' && isLeagueChampionId(battle.champId)) ? 'league' : 'gym');
  const champ = (typeof getChampDef === 'function') ? getChampDef(battle.champId) : null;
  style = (champ && champ.strategy) || [];
  spriteKey = typeof getTrainerSpriteKey === 'function' ? getTrainerSpriteKey(battle.champId) : role;
 }
 if(!name && !role) return null;
 const sprite = typeof trainerSpriteImg === 'function' ? trainerSpriteImg(spriteKey || role || 'trainer', 58) : `<span>${String(name||role||'?').slice(0,2).toUpperCase()}</span>`;
 return {
  role,
  spriteHtml: sprite,
  name,
  roleLabel: trainerRoleLabel(role),
  styleLabels: (style || []).slice(0, 4).map((x) => trainerStyleLabel(x)),
 };
}
function trainerVisualHtml(){
 const model = trainerVisualModel();
 if(!model) return '';
 const comp = (typeof window !== 'undefined' && window.PokeUI && window.PokeUI.components) || null;
 if(!comp || typeof comp.trainerCardHTML !== 'function') throw new Error('[ui] PokeUI components not loaded (trainerCard)');
 return comp.trainerCardHTML(model);
}

function renderBattleTeamRow() {
  if(typeof syncTeamSlotHeldItems === 'function') syncTeamSlotHeldItems();
  const row = document.getElementById('battle-team-row');
  if (!row) return;

  const e = battle.enemyPoke;

  let html = trainerVisualHtml();

  
   if (e) {
    html += generatePokeCardHTML(e, -1, {
      isActive: false,
      isEnemy: true,
      isFainted: e.currentHP <= 0,
      showMoves: true,
      showXP: false,
      showStatus: true,
      movesAsBars: true,
      onRightClickSprite: 'openBattleEnemyPokeModal()',
    });
  }

  // Inject Weather / Terrain active indicator between camps!
  if (battle && ((battle.weather && battle.weather !== 'none') || (battle.terrain && battle.terrain !== 'none'))) {
    let weatherLabel = '';
    let terrainLabel = '';
    const _weatherColor = '';
    const weatherBadges = typeof STATUS_BADGES !== 'undefined' ? STATUS_BADGES : null;
    const enWeatherBadges = typeof EN_STATUS_BADGES !== 'undefined' ? EN_STATUS_BADGES : null;
    const currentLang = (typeof t==='function' && t('_lang_code') !== '_lang_code') ? t('_lang_code') : ((typeof G !== 'undefined' && G && G.lang) || 'fr');
    const wDict = currentLang === 'en' ? enWeatherBadges : weatherBadges;
    if(battle.weather === 'rain' && wDict && wDict.rainy) { weatherLabel = wDict.rainy; }
    else if(battle.weather === 'sunny' && wDict && wDict.sunny) { weatherLabel = wDict.sunny; }
    else if(battle.weather === 'sandstorm' && wDict && wDict.sand) { weatherLabel = wDict.sand; }
    else if(battle.weather === 'hail' && wDict && wDict.hail) { weatherLabel = wDict.hail; }
    const tDict = currentLang === 'en' ? enWeatherBadges : weatherBadges;
    if(battle.terrain === 'electric' && tDict && tDict.eterrain) { terrainLabel = tDict.eterrain; }
    else if(battle.terrain === 'grassy' && tDict && tDict.gterrain) { terrainLabel = tDict.gterrain; }
    else if(battle.terrain === 'misty' && tDict && tDict.mterrain) { terrainLabel = tDict.mterrain; }
    else if(battle.terrain === 'psychic' && tDict && tDict.pterrain) { terrainLabel = tDict.pterrain; }
    
    const turnsAbbrev = (typeof t === 'function' ? t('turns_abbrev') : 't.');
    const infoBlocks = [];
    if(battle.weather && battle.weather !== 'none') infoBlocks.push('<div data-style="display:inline-flex;align-items:center;gap:4px;">' + weatherLabel + ' <span data-style="font-size:10px;color:var(--light2);">(' + battle.weatherTurns + ' ' + turnsAbbrev + ')</span></div>');
    if(battle.terrain && battle.terrain !== 'none') infoBlocks.push('<div data-style="display:inline-flex;align-items:center;gap:4px;">' + terrainLabel + ' <span data-style="font-size:10px;color:var(--light2);">(' + battle.terrainTurns + ' ' + turnsAbbrev + ')</span></div>');
    
    const zoneTitle = (typeof t === 'function' ? t('active_zone_effects') : 'Effets de zone actifs');
    html += `<div class="battle-zone-effects" data-style="display:flex;flex-direction:column;gap:6px;justify-content:center;align-items:center;margin:10px 0;width:100%;box-sizing:border-box;">
      <div data-style="font-size:10px;text-transform:uppercase;color:var(--light2);letter-spacing:1px;font-weight:bold;">${zoneTitle}</div>
      <div data-style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">${infoBlocks.join('')}</div>
    </div>`;
  }

  
  if (battle && battle.isTraining && battle.trainee) {
    html += generatePokeCardHTML(battle.trainee, 0, {
      isActive: true,
      showMoves: true,
      showXP: true,
      showStatus: true,
      movesAsBars: true,
      onRightClickSprite: 'openPokeModal(' + G.team.findIndex(p => p && p.uid === battle.trainee.uid) + ')',
    });
  } else if (G && G.team) {
    for (let i = 0; i < G.team.length; i++) {
      const tp = G.team[i];
      if (!tp) continue;
      const isActive = i === battle.playerPokeIdx;
      const isFainted = tp.currentHP <= 0;

      html += generatePokeCardHTML(tp, i, {
        isActive: isActive,
        isFainted: isFainted,
        showMoves: isActive,
        showXP: true,
        showStatus: isActive,
        movesAsBars: true,
        onRightClickSprite: 'openPokeModal(' + i + ')',
        onLeftClickSprite: isActive ? '' : 'switchBattlePoke(' + i + ')',
      });
    }
  }

  _pwSetHtmlSafe(row, html);
}


function renderEnemyMoveBars() {
  
}


function renderBattleLoot() {
  const container = document.getElementById('battle-loot-inline');
  if (!container) return;

  if (battle && battle.isChamp) {
    container.replaceChildren();
    return;
  }

  const catches = battle.sessionCatches || [];
  const itemEntries = Object.entries(battle.sessionItems || {}).filter(([, qty]) => Number(qty) > 0);

  if (!catches.length && !itemEntries.length) {
    _pwSetHtmlSafe(container, '<div class="pw-text-sm pw-light1">' + (t('no_loot_yet') || 'Aucun butin récolté pour le moment.') + '</div>');
    return;
  }

  const lootCounts = {};
  catches.forEach(c => {
    const key = c.id + '_' + (c.shiny ? 'shiny' : 'normal');
    if (!lootCounts[key]) {
      lootCounts[key] = Object.assign({}, c, {count: 0});
    }
    lootCounts[key].count++;
  });

  const parts = Object.values(lootCounts).map(item => {
    return '<div class="loot-item" title="' + item.name + (item.shiny ? ' (Shiny)' : '') + '">' +
      spriteImg(item.id, item.emoji, {shiny: item.shiny, size: 40}) +
      (item.count > 1 ? '<span class="loot-count">\u00d7' + item.count + '</span>' : '') +
    '</div>';
  });

  itemEntries.forEach(([key, qty]) => {
    parts.push('<div class="loot-item" title="' + getItemName(key) + '">' +
      itemSpriteHtml(key, 40) +
      (qty > 1 ? '<span class="loot-count">\u00d7' + qty + '</span>' : '') +
    '</div>');
  });

  _pwSetHtmlSafe(container, parts.join(''));
}


// --- Migrated to ES module, globals exposed ---
if (typeof legacyClickAttributes !== 'undefined') { if (typeof window !== 'undefined') window.legacyClickAttributes = legacyClickAttributes; if (typeof globalThis !== 'undefined') globalThis.legacyClickAttributes = legacyClickAttributes; }
if (typeof legacyContextAttributes !== 'undefined') { if (typeof window !== 'undefined') window.legacyContextAttributes = legacyContextAttributes; if (typeof globalThis !== 'undefined') globalThis.legacyContextAttributes = legacyContextAttributes; }
if (typeof generatePokeCardHTML !== 'undefined') { if (typeof window !== 'undefined') window.generatePokeCardHTML = generatePokeCardHTML; if (typeof globalThis !== 'undefined') globalThis.generatePokeCardHTML = generatePokeCardHTML; }
if (typeof renderBattleTeamRow !== 'undefined') { if (typeof window !== 'undefined') window.renderBattleTeamRow = renderBattleTeamRow; if (typeof globalThis !== 'undefined') globalThis.renderBattleTeamRow = renderBattleTeamRow; }
if (typeof renderEnemyMoveBars !== 'undefined') { if (typeof window !== 'undefined') window.renderEnemyMoveBars = renderEnemyMoveBars; if (typeof globalThis !== 'undefined') globalThis.renderEnemyMoveBars = renderEnemyMoveBars; }
if (typeof renderBattleLoot !== 'undefined') { if (typeof window !== 'undefined') window.renderBattleLoot = renderBattleLoot; if (typeof globalThis !== 'undefined') globalThis.renderBattleLoot = renderBattleLoot; }



// --- Exported globals ---
if (typeof battleMoveEffBadgeHtml !== 'undefined') { if (typeof window !== 'undefined') window.battleMoveEffBadgeHtml = battleMoveEffBadgeHtml; if (typeof globalThis !== 'undefined') globalThis.battleMoveEffBadgeHtml = battleMoveEffBadgeHtml; }
if (typeof trainerRoleLabel !== 'undefined') { if (typeof window !== 'undefined') window.trainerRoleLabel = trainerRoleLabel; if (typeof globalThis !== 'undefined') globalThis.trainerRoleLabel = trainerRoleLabel; }
if (typeof trainerStyleLabel !== 'undefined') { if (typeof window !== 'undefined') window.trainerStyleLabel = trainerStyleLabel; if (typeof globalThis !== 'undefined') globalThis.trainerStyleLabel = trainerStyleLabel; }
if (typeof trainerVisualHtml !== 'undefined') { if (typeof window !== 'undefined') window.trainerVisualHtml = trainerVisualHtml; if (typeof globalThis !== 'undefined') globalThis.trainerVisualHtml = trainerVisualHtml; }
if (typeof trainerVisualModel !== 'undefined') { if (typeof window !== 'undefined') window.trainerVisualModel = trainerVisualModel; if (typeof globalThis !== 'undefined') globalThis.trainerVisualModel = trainerVisualModel; }

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  generatePokeCardHTML,
  renderBattleTeamRow,
  renderEnemyMoveBars,
  renderBattleLoot,
  battleMoveEffBadgeHtml,
  trainerRoleLabel,
  trainerStyleLabel,
  trainerVisualHtml,
  trainerVisualModel,
};

