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
    onRightClickSprite = null,
    onLeftClickSprite = null,
    onLeftClickItem = null,
    showStatus = false,
  } = options;

  const pct = p.currentHP / p.maxHP;
  const hpClass = pct > 0.5 ? 'high' : pct > 0.2 ? 'medium' : 'low';
  const nextIdx = isEnemy
    ? ((battle.eMoveIdx || 0) % Math.max(1, (p.moves || []).length))
    : ((battle.pMoveIdx || 0) % Math.max(1, (p.moves || []).length));
  const cdPct = isEnemy
    ? ((battle.eCdMax) ? Math.max(0, 100 - (battle.eCd / battle.eCdMax * 100)) : 0)
    : ((battle.pCdMax) ? Math.max(0, 100 - (battle.pCd / battle.pCdMax * 100)) : 0);
  const itm = p.heldItem ? ITEMS[p.heldItem] : null;
  const b = getHeldBuff(p);

  
  const getArrows = (val) => {
    if (val > 1.8) return '▲▲▲';
    if (val > 1.3) return '▲▲';
    if (val > 1.0) return '▲';
    if (val < 0.5) return '▼▼▼';
    if (val < 0.75) return '▼▼';
    if (val < 1.0) return '▼';
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

  
  const itemBadgeHtml = itm
    ? '<div class="poke-item-badge" data-item-key="' + p.heldItem + '" ' + legacyClickAttributes(onLeftClickItem) + ' data-context-call="openItemInfo" data-context-args="\'' + p.heldItem + '\'" title="' + t('change_or_info_title') + '">' + itemSpriteHtml(p.heldItem, 20) + '</div>'
    : '<div class="poke-item-badge empty" ' + legacyClickAttributes(onLeftClickItem) + ' title="'+t('equip_click_title')+'">+</div>';

  
  let movesHtml = '';
  if (showMoves) {
    movesHtml = '<div class="poke-moves">';
    for (let mi = 0; mi < 4; mi++) {
      const m = p.moves && p.moves[mi] ? p.moves[mi] : null;
      if (m && MOVES[m.id]) {
        const mv = MOVES[m.id];
        const isNext = mi === nextIdx;
        const chargeColor = TYPE_COLORS[mv.type] || '#94886B';
        if (movesAsBars) {
          movesHtml += '<div class="poke-move' + (isNext ? ' ready' : '') + ' charging extracted-template-style-173"' +
            ' data-context-call="openMoveInfo" data-context-args="\'' + m.id + '\'"' +
            ' title="' + t('context_info_touch') + '">' +
            '<span class="move-name">' + getMoveName(m.id) + '</span>' +
            '<span class="move-type type-' + mv.type.toLowerCase() + '">' + mv.type + '</span>' +
            '</div>';
        } else {
          movesHtml += '<div class="poke-move"' +
            ' data-context-call="openMoveInfo" data-context-args="\'' + m.id + '\'"' +
            ' title="' + t('context_info_touch') + '">' +
            '<span class="move-name">' + getMoveName(m.id) + '</span>' +
            '<span class="move-type type-' + mv.type.toLowerCase() + '">' + mv.type + '</span>' +
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

  
  const spriteClick = onLeftClickSprite
    ? legacyClickAttributes(onLeftClickSprite)
    : (isEnemy ? '' : (isActive ? '' : 'data-action="legacy-call" data-call="switchBattlePoke" data-call-args="' + i + '"'));

  const spriteRightClick = onRightClickSprite
    ? legacyContextAttributes(onRightClickSprite)
    : (isEnemy ? 'data-context-call="openBattleEnemyPokeModal"' : 'data-context-call="openPokeInfo" data-context-args="' + p.id + '"');

  const shinyClass = p.shinyActive ? 'shiny' : '';
  const activeClass = isActive ? 'active' : '';
  const faintedClass = isFainted ? 'fainted' : '';

  return '<div class="poke-card ' + activeClass + ' ' + faintedClass + '">' +
    '<div class="poke-card-top">' +
      '<div class="extracted-template-style-176">' +
        '<div class="poke-sprite-container large ' + shinyClass + '" ' + spriteClick + ' ' + spriteRightClick + ' title="'+t('sprite_click_context_title')+'">' +
          '<div class="poke-sprite">' + spriteImg(p.id, p.emoji, {size: 96, shiny: p.shinyActive}) + '</div>' +
        '</div>' +
        itemBadgeHtml +
      '</div>' +
      '<div class="poke-info">' +
        '<div class="poke-name">' +
          '<span>' + (p.shinyActive ? '<span class="extracted-template-style-163">★</span>' : '') + p.name + '</span>' +
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


function renderBattleTeamRow() {
  const row = document.getElementById('battle-team-row');
  if (!row) return;

  const e = battle.enemyPoke;
  const p = getActivePlayerPoke();

  let html = '';

  
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
    container.innerHTML = '<div class="extracted-template-style-103">Aucun butin pour le moment</div>';
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