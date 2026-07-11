// ============================================================
// BATTLE TEAM UI - Template unifié PokéChill
// generatePokeCardHTML() utilisé pour TOUS les Pokémon (joueur + ennemi)
// ============================================================

// Helper: Génère le HTML d'une carte Pokémon (réutilisable combat/équipe)
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

  // Buff/debuff arrows - use correct mods based on which side
  const getArrows = (val) => {
    if (val > 1.8) return '▲▲▲';
    if (val > 1.3) return '▲▲';
    if (val > 1.0) return '▲';
    if (val < 0.5) return '▼▼▼';
    if (val < 0.75) return '▼▼';
    if (val < 1.0) return '▼';
    return '';
  };

  // Use the CORRECT mods for each side (enemy uses enemyMods, player uses playerMods)
  const sideMods = isEnemy ? battle.enemyMods : battle.playerMods;
  const pAtkMod = (sideMods?.atk || 1) * (1 + (b.atk || 0));
  const pDefMod = (sideMods?.def || 1) * (1 + (b.def || 0));
  const pSpeMod = (sideMods?.spe || 1) * (1 + (b.spe || 0));

  const atkArrow = getArrows(pAtkMod);
  const defArrow = getArrows(pDefMod);
  const speArrow = getArrows(pSpeMod);

  // Status badges (only in battle context)
  let statusBadges = '';
  if (options.showStatus) {
    if (p.status) {
      statusBadges += '<span class="status-badge ' + p.status + '">' + statusLabel(p.status) + '</span>';
    }
    if (atkArrow) statusBadges += '<span class="buff-badge ' + (atkArrow.includes('\u25B2') ? 'atk-up' : 'atk-down') + '">ATK ' + atkArrow + '</span>';
    if (defArrow) statusBadges += '<span class="buff-badge ' + (defArrow.includes('\u25B2') ? 'def-up' : 'def-down') + '">DEF ' + defArrow + '</span>';
    if (speArrow) statusBadges += '<span class="buff-badge ' + (speArrow.includes('\u25B2') ? 'spe-up' : 'spe-down') + '">VIT ' + speArrow + '</span>';
  }

  // Item badge (top-left of sprite) - uses sprite image
  const itemBadgeHtml = itm
    ? '<div class="poke-item-badge" data-item-key="' + p.heldItem + '" ' + (onLeftClickItem ? 'onclick="' + onLeftClickItem + '"' : '') + ' oncontextmenu="event.preventDefault();openItemInfo(\'' + p.heldItem + '\');return false;" title="Clic: changer | Clic droit: infos">' + itemSpriteHtml(p.heldItem, 20) + '</div>'
    : '<div class="poke-item-badge empty" ' + (onLeftClickItem ? 'onclick="' + onLeftClickItem + '"' : '') + ' title="Clic: équiper">+</div>';

  // Moves HTML - ALWAYS 4 slots (filled or empty)
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
          movesHtml += '<div class="poke-move' + (isNext ? ' ready' : '') + ' charging" style="--charge-pct:' + (isNext ? cdPct : 0) + '%;--charge-color:' + chargeColor + '66;"' +
            ' oncontextmenu="event.preventDefault();openMoveInfo(\'' + m.id + '\');return false;"' +
            ' title="Clic droit : infos">' +
            '<span class="move-name">' + getMoveName(m.id) + '</span>' +
            '<span class="move-type" style="background:' + (TYPE_COLORS[mv.type] || '#555') + '">' + mv.type + '</span>' +
            '</div>';
        } else {
          movesHtml += '<div class="poke-move"' +
            ' oncontextmenu="event.preventDefault();openMoveInfo(\'' + m.id + '\');return false;"' +
            ' title="Clic droit : infos">' +
            '<span class="move-name">' + getMoveName(m.id) + '</span>' +
            '<span class="move-type" style="background:' + (TYPE_COLORS[mv.type] || '#555') + '">' + mv.type + '</span>' +
            '</div>';
        }
      } else {
        movesHtml += '<div class="poke-move empty">—</div>';
      }
    }
    movesHtml += '</div>';
  }

  // XP bar (only for team, never for enemy)
  let xpHtml = '';
  if (showXP && !isEnemy) {
    const curBase = xpForLevel(p.level);
    const xpInLevel = Math.max(0, (p.xp || 0) - curBase);
    const xpReqLevel = Math.max(1, (p.xpNext || 1) - curBase);
    const xpPct = Math.min(100, (xpInLevel / xpReqLevel) * 100);
    xpHtml = '<div class="xp-bar-container"><div class="xp-bar"><div class="xp-fill" style="width:' + xpPct + '%;"></div></div></div>';
  }

  // Click handlers
  const spriteClick = onLeftClickSprite
    ? 'onclick="' + onLeftClickSprite + '"'
    : (isEnemy ? '' : (isActive ? '' : 'onclick="switchBattlePoke(' + i + ')"'));

  const spriteRightClick = onRightClickSprite
    ? 'oncontextmenu="event.preventDefault();' + onRightClickSprite + ';return false;"'
    : 'oncontextmenu="event.preventDefault();openPokeInfo(' + p.id + ');return false;"';

  const shinyClass = p.shinyActive ? 'shiny' : '';
  const activeClass = isActive ? 'active' : '';
  const faintedClass = isFainted ? 'fainted' : '';

  return '<div class="poke-card ' + activeClass + ' ' + faintedClass + '">' +
    '<div class="poke-card-top">' +
      '<div style="position:relative;">' +
        '<div class="poke-sprite-container large ' + shinyClass + '" ' + spriteClick + ' ' + spriteRightClick + ' title="Clic gauche: équipe | Clic droit: infos">' +
          '<div class="poke-sprite">' + spriteImg(p.id, p.emoji, {size: 96, shiny: p.shinyActive}) + '</div>' +
        '</div>' +
        itemBadgeHtml +
      '</div>' +
      '<div class="poke-info">' +
        '<div class="poke-name">' +
          '<span>' + (p.shinyActive ? '<span style="color:var(--light2);margin-right:4px;">★</span>' : '') + p.name + '</span>' +
          '<span class="poke-level">Nv.' + p.level + '</span>' +
        '</div>' +
        '<div class="hp-bar-container">' +
          '<div class="hp-bar">' +
            '<div class="hp-fill ' + hpClass + '" style="width:' + Math.max(0, pct * 100) + '%;"></div>' +
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

// Render la scène de combat complète
function renderBattleTeamRow() {
  const row = document.getElementById('battle-team-row');
  if (!row) return;

  const e = battle.enemyPoke;
  const p = getActivePlayerPoke();

  let html = '';

  // 1. POKÉMON ADVERSE - utilise le MÊME template que le joueur (sans XP bar)
  if (e) {
    html += generatePokeCardHTML(e, -1, {
      isActive: false,
      isEnemy: true,
      isFainted: e.currentHP <= 0,
      showMoves: true,
      showXP: false,
      showStatus: true,
      movesAsBars: true,
      onRightClickSprite: 'openPokeInfo(' + e.id + ')',
    });
  }

  // 2. ÉQUIPE JOUEUR - chaque Pokémon avec XP bar
  if (battle && battle.isTraining && battle.trainee) {
    html += generatePokeCardHTML(battle.trainee, 0, {
      isActive: true,
      showMoves: true,
      showXP: true,
      showStatus: true,
      movesAsBars: true,
      onRightClickSprite: 'openPokeInfo(' + battle.trainee.id + ')',
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
        onRightClickSprite: 'openPokeInfo(' + tp.id + ')',
        onLeftClickSprite: isActive ? '' : 'switchBattlePoke(' + i + ')',
      });
    }
  }

  row.innerHTML = html;
}

// Render les barres d'attaques ennemies (obsolète - maintenant dans generatePokeCardHTML)
function renderEnemyMoveBars() {
  // Plus utilisé - les attaques ennemies sont rendues dans renderBattleTeamRow
}

// Rendu du loot en combat
function renderBattleLoot() {
  const container = document.getElementById('battle-loot-inline');
  if (!container) return;

  if (!battle.sessionCatches || battle.sessionCatches.length === 0) {
    container.innerHTML = '<div style="color:var(--light1);font-size: 13px;">Aucun butin pour le moment</div>';
    return;
  }

  const lootCounts = {};
  battle.sessionCatches.forEach(c => {
    const key = c.id + '_' + (c.shiny ? 'shiny' : 'normal');
    if (!lootCounts[key]) {
      lootCounts[key] = Object.assign({}, c, {count: 0});
    }
    lootCounts[key].count++;
  });

  container.innerHTML = Object.values(lootCounts).map(item => {
    return '<div class="loot-item" title="' + item.name + (item.shiny ? ' (Shiny)' : '') + '">' +
      spriteImg(item.id, item.emoji, {shiny: item.shiny, size: 40}) +
      (item.count > 1 ? '<span class="loot-count">\u00d7' + item.count + '</span>' : '') +
    '</div>';
  }).join('');
}
