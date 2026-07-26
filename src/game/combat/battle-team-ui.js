function legacyClickAttributes(code){
 if(!code) return '';
 const match = String(code).match(/^([A-Za-z_$][\w$]*)\((.*)\)$/);
 if(match) return 'data-action="legacy-call" data-call="' + match[1] + '" data-call-args="' + match[2].replace(/"/g, '&quot;') + '"';
 return '';
}

function legacyContextAttributes(code){
 if(!code) return '';
 const clean = String(code).replace(/^event\.preventDefault\(\);?/, '').replace(/;?return false;?$/, '').replace(/;$/, '');
 const match = clean.match(/^([A-Za-z_$][\w$]*)\((.*)\)$/);
 if(match) return 'data-context-call="' + match[1] + '" data-context-args="' + match[2].replace(/"/g, '&quot;') + '"';
 return '';
}

function generatePokeCardHTML(p, i, options = {}) {
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
    // Passe 25 — lecture seule « panneau de préparation Usine » (atoll) :
    // noSpriteHandlers = aucun clic gauche/droit sur le sprite ; itemReadonly =
    // badge objet affiché en info seule (clic droit fiche ok, jamais de
    // changement, badge masqué si aucun objet) ; moveDragAttr = nom d'attribut
    // de drag alternatif pour réordonner les attaques hors de G.team.
    noSpriteHandlers = false,
    itemReadonly = false,
    moveDragAttr = null,
    spriteTitle = null,
    // moveInfoContextless : la fiche attaque est ouverte SANS contexte explicite
    // (pas de « 'id',-1 ») → sa source de retour est déduite de l'écran courant
    // (ex. panneau de préparation Usine) au lieu de se contenter de fermer.
    moveInfoContextless = false,
  } = options;

  const pct = p.currentHP / p.maxHP;
  const hpClass = pct > 0.5 ? 'high' : pct > 0.2 ? 'medium' : 'low';
  const nextIdx = isEnemy
    ? ((battle.eMoveIdx || 0) % Math.max(1, (p.moves || []).length))
    : ((battle.pMoveIdx || 0) % Math.max(1, (p.moves || []).length));
  const cdPct = isEnemy
    ? ((battle.eCdMax) ? Math.max(0, 100 - (battle.eCd / battle.eCdMax * 100)) : 0)
    : ((battle.pCdMax) ? Math.max(0, 100 - (battle.pCd / battle.pCdMax * 100)) : 0);
  const heldKey = (typeof getHeldItemForPokemon === 'function') ? getHeldItemForPokemon(p) : (p.heldItem || null);
  if(!isEnemy && heldKey) p.heldItem = heldKey;
  const itm = heldKey ? ITEMS[heldKey] : null;
  const b = getHeldBuff(p);

  
  const getArrows = (val) => {
    if (val > 1.8) return (typeof t === 'function' ? t('stat_up_high') : '▲▲▲');
    if (val > 1.3) return (typeof t === 'function' ? t('stat_up_mid') : '▲▲');
    if (val > 1.0) return (typeof t === 'function' ? t('stat_up_low') : '▲');
    if (val < 0.5) return (typeof t === 'function' ? t('stat_down_high') : '▼▼▼');
    if (val < 0.75) return (typeof t === 'function' ? t('stat_down_mid') : '▼▼');
    if (val < 1.0) return (typeof t === 'function' ? t('stat_down_low') : '▼');
    return '';
  };

  
  const sideMods = isEnemy ? battle.enemyMods : battle.playerMods;
  const pAtkMod = (sideMods?.atk || 1) * (1 + (b.atk || 0));
  const pDefMod = (sideMods?.def || 1) * (1 + (b.def || 0));
  const pSpeMod = (sideMods?.spe || 1) * (1 + (b.spe || 0));

  const atkArrow = getArrows(pAtkMod);
  const defArrow = getArrows(pDefMod);
  const speArrow = getArrows(pSpeMod);

  
  let statusBadges = '';
  if (options.showStatus) {
    if (p.status) {
      statusBadges += '<span class="status-badge ' + p.status + '">' + statusLabel(p.status) + '</span>';
    }
    if (atkArrow) statusBadges += '<span class="buff-badge ' + (atkArrow.includes('\u25B2') ? 'atk-up' : 'atk-down') + '">ATK ' + atkArrow + '</span>';
    if (defArrow) statusBadges += '<span class="buff-badge ' + (defArrow.includes('\u25B2') ? 'def-up' : 'def-down') + '">DEF ' + defArrow + '</span>';
    if (speArrow) statusBadges += '<span class="buff-badge ' + (speArrow.includes('\u25B2') ? 'spe-up' : 'spe-down') + '">VIT ' + speArrow + '</span>';
  }

  
  const itemBadgeHtml = itemReadonly
    ? (itm
      ? '<div class="poke-item-badge" data-item-key="' + heldKey + '" data-context-call="openItemInfo" data-context-args="\'' + heldKey + '\'" title="' + t('context_info_touch') + '">' + itemSpriteHtml(heldKey, 20) + '</div>'
      : '')
    : (itm
      ? '<div class="poke-item-badge" data-item-key="' + heldKey + '" ' + legacyClickAttributes(onLeftClickItem) + ' data-context-call="openItemInfo" data-context-args="\'' + heldKey + '\'" title="' + t('change_or_info_title') + '">' + itemSpriteHtml(heldKey, 20) + '</div>'
      : '<div class="poke-item-badge empty" ' + legacyClickAttributes(onLeftClickItem) + ' title="'+t('equip_click_title')+'">+</div>');

  
  let movesHtml = '';
  if (showMoves) {
    movesHtml = '<div class="poke-moves">';
    for (let mi = 0; mi < 4; mi++) {
      const m = p.moves && p.moves[mi] ? p.moves[mi] : null;
      if (m && MOVES[m.id]) {
        const mv = MOVES[m.id];
        const isNext = mi === nextIdx;
        // Passe 25 : moveInfoContextless → fiche attaque sans contexte
        // explicite (retour déduit de l'écran, ex. panneau de préparation Usine).
        const moveInfoArgs = moveInfoContextless ? ("'" + m.id + "'") : ("'" + m.id + "',-1");
        const chargeColor = TYPE_COLORS[mv.type] || '#94886B';
        if (movesAsBars) {
          movesHtml += '<div class="poke-move' + (isNext ? ' ready' : '') + ' charging pw-charge-move"' +
            ' data-context-call=\"openMoveInfo\" data-context-args=\"' + moveInfoArgs + '\"' +
            ' title="' + t('context_info_touch') + '">' +
            '<span class="move-name">' + getMoveName(m.id) + '</span>' +
            '<span class="move-type type-' + mv.type.toLowerCase() + '">' + mv.type + '</span>' + battleMoveEffBadgeHtml(mv.type, isEnemy) +
            '</div>';
        } else {
          // Passe 17 : glisser-déposer des attaques équipées (fenêtre Party)
          // Passe 25 : moveDragAttr permet un autre attribut de drag
          // (ex. 'atoll-move-drag' pour l'équipe prêtée, hors G.team).
          const dragAttrs = (movesDraggable && !isEnemy)
            ? (moveDragAttr
              ? ' draggable="true" data-' + moveDragAttr + '="' + i + '|' + mi + '"'
              : ' draggable="true" data-move-drag="' + i + '|' + mi + '"')
            : '';
          movesHtml += '<div class="poke-move' + (dragAttrs ? ' draggable-move' : '') + '"' + dragAttrs +
            ' data-context-call=\"openMoveInfo\" data-context-args=\"' + moveInfoArgs + '\"' +
            ' title="' + t('context_info_touch') + '">' +
            '<span class="move-name">' + getMoveName(m.id) + '</span>' +
            '<span class="move-type type-' + mv.type.toLowerCase() + '">' + mv.type + '</span>' + battleMoveEffBadgeHtml(mv.type, isEnemy) +
            '</div>';
        }
      } else {
        movesHtml += '<div class="poke-move empty">-</div>';
      }
    }
    movesHtml += '</div>';
  }

  
  let xpHtml = '';
  if (showXP && !isEnemy) {
    const curBase = xpForLevel(p.level);
    const xpInLevel = Math.max(0, (p.xp || 0) - curBase);
    const xpReqLevel = Math.max(1, (p.xpNext || 1) - curBase);
    const xpPct = Math.min(100, (xpInLevel / xpReqLevel) * 100);
    xpHtml = '<div class="xp-bar-container"><div class="xp-bar"><div class="xp-fill" data-pct="' + xpPct + '"></div></div></div>';
  }

  
  const spriteClick = noSpriteHandlers
    ? ''
    : (onLeftClickSprite
      ? legacyClickAttributes(onLeftClickSprite)
      : (isEnemy ? '' : (isActive ? '' : 'data-action="legacy-call" data-call="switchBattlePoke" data-call-args="' + i + '"')));

  const spriteRightClick = noSpriteHandlers
    ? ''
    : (onRightClickSprite
      ? legacyContextAttributes(onRightClickSprite)
      : (isEnemy ? 'data-context-call="openBattleEnemyPokeModal"' : 'data-context-call="openPokeInfo" data-context-args="' + p.id + '"'));

  const shinyClass = p.shinyActive ? 'shiny' : '';
  const activeClass = isActive ? 'active' : '';
  const faintedClass = isFainted ? 'fainted' : '';

  return '<div class="poke-card ' + activeClass + ' ' + faintedClass + '">' +
    '<div class="poke-card-top">' +
      '<div class="pw-relative">' +
        '<div class="poke-sprite-container large ' + shinyClass + '" ' + spriteClick + ' ' + spriteRightClick + ' title="' + (spriteTitle || t('sprite_click_context_title')) + '">' +
          '<div class="poke-sprite">' + spriteImg(p.id, p.emoji, {size: 96, shiny: p.shinyActive}) + '</div>' +
        '</div>' +
        itemBadgeHtml +
      '</div>' +
      '<div class="poke-info">' +
        '<div class="poke-name">' +
          '<span>' + (p.shinyActive ? '<span class="pw-shiny-star">★</span>' : '') + (typeof getPokeName === 'function' ? getPokeName(p.id) : p.name) + '</span>' +
          '<span class="poke-level">Nv.' + p.level + '</span>' +
        '</div>' +
        '<div class="hp-bar-container">' +
          '<div class="hp-bar">' +
            '<div class="hp-fill ' + hpClass + '" data-pct="' + Math.floor(pct*100) + '"></div>' +
          '</div>' +
          '<div class="hp-text">' + p.currentHP + '/' + p.maxHP + ' PV</div>' +
        '</div>' +
        xpHtml +
      '</div>' +
    '</div>' +
    (statusBadges ? '<div class="poke-status">' + statusBadges + '</div>' : '') +
    movesHtml +
  '</div>';
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
function trainerVisualHtml(){
 if(!battle || !battle.isChamp) return '';
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
 if(!name && !role) return '';
 const sprite = typeof trainerSpriteImg === 'function' ? trainerSpriteImg(spriteKey || role || 'trainer', 58) : `<span>${String(name||role||'?').slice(0,2).toUpperCase()}</span>`;
 return `<div class="trainer-visual-card role-${String(role||'trainer').toLowerCase()}"><div class="trainer-sprite-placeholder">${sprite}</div><div><b>${name}</b><span>${trainerRoleLabel(role)}</span><div class="trainer-style-row">${(style||[]).slice(0,4).map(x=>`<em>${trainerStyleLabel(x)}</em>`).join('')}</div></div></div>`;
}

function renderBattleTeamRow() {
  if(typeof syncTeamSlotHeldItems === 'function') syncTeamSlotHeldItems();
  const row = document.getElementById('battle-team-row');
  if (!row) return;

  const e = battle.enemyPoke;
  const p = getActivePlayerPoke();

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
    let weatherColor = '';
    var weatherBadges = typeof STATUS_BADGES !== 'undefined' ? STATUS_BADGES : null;
    var enWeatherBadges = typeof EN_STATUS_BADGES !== 'undefined' ? EN_STATUS_BADGES : null;
    var currentLang = (typeof t==='function' && t('_lang_code') !== '_lang_code') ? t('_lang_code') : ((typeof G !== 'undefined' && G && G.lang) || 'fr');
    var wDict = currentLang === 'en' ? enWeatherBadges : weatherBadges;
    if(battle.weather === 'rain' && wDict && wDict.rainy) { weatherLabel = wDict.rainy; }
    else if(battle.weather === 'sunny' && wDict && wDict.sunny) { weatherLabel = wDict.sunny; }
    else if(battle.weather === 'sandstorm' && wDict && wDict.sand) { weatherLabel = wDict.sand; }
    else if(battle.weather === 'hail' && wDict && wDict.hail) { weatherLabel = wDict.hail; }
    var tDict = currentLang === 'en' ? enWeatherBadges : weatherBadges;
    if(battle.terrain === 'electric' && tDict && tDict.eterrain) { terrainLabel = tDict.eterrain; }
    else if(battle.terrain === 'grassy' && tDict && tDict.gterrain) { terrainLabel = tDict.gterrain; }
    else if(battle.terrain === 'misty' && tDict && tDict.mterrain) { terrainLabel = tDict.mterrain; }
    else if(battle.terrain === 'psychic' && tDict && tDict.pterrain) { terrainLabel = tDict.pterrain; }
    
    var turnsAbbrev = (typeof t === 'function' ? t('turns_abbrev') : 't.');
    let infoBlocks = [];
    if(battle.weather && battle.weather !== 'none') infoBlocks.push('<div data-style="display:inline-flex;align-items:center;gap:4px;">' + weatherLabel + ' <span data-style="font-size:10px;color:var(--light2);">(' + battle.weatherTurns + ' ' + turnsAbbrev + ')</span></div>');
    if(battle.terrain && battle.terrain !== 'none') infoBlocks.push('<div data-style="display:inline-flex;align-items:center;gap:4px;">' + terrainLabel + ' <span data-style="font-size:10px;color:var(--light2);">(' + battle.terrainTurns + ' ' + turnsAbbrev + ')</span></div>');
    
    var zoneTitle = (typeof t === 'function' ? t('active_zone_effects') : 'Effets de zone actifs');
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

  row.innerHTML = html;
}


function renderEnemyMoveBars() {
  
}


function renderBattleLoot() {
  const container = document.getElementById('battle-loot-inline');
  if (!container) return;

  if (battle && battle.isChamp) {
    container.innerHTML = '';
    return;
  }

  const catches = battle.sessionCatches || [];
  const itemEntries = Object.entries(battle.sessionItems || {}).filter(([, qty]) => Number(qty) > 0);

  if (!catches.length && !itemEntries.length) {
    container.innerHTML = '<div class="pw-text-sm pw-light1">' + (t('no_loot_yet') || 'Aucun butin récolté pour le moment.') + '</div>';
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

  container.innerHTML = parts.join('');
}


// --- Migrated to ES module, globals exposed ---
if (typeof legacyClickAttributes !== 'undefined' && typeof window !== 'undefined') window.legacyClickAttributes = legacyClickAttributes;
if (typeof legacyContextAttributes !== 'undefined' && typeof window !== 'undefined') window.legacyContextAttributes = legacyContextAttributes;
if (typeof generatePokeCardHTML !== 'undefined' && typeof window !== 'undefined') window.generatePokeCardHTML = generatePokeCardHTML;
if (typeof renderBattleTeamRow !== 'undefined' && typeof window !== 'undefined') window.renderBattleTeamRow = renderBattleTeamRow;
if (typeof renderEnemyMoveBars !== 'undefined' && typeof window !== 'undefined') window.renderEnemyMoveBars = renderEnemyMoveBars;
if (typeof renderBattleLoot !== 'undefined' && typeof window !== 'undefined') window.renderBattleLoot = renderBattleLoot;

