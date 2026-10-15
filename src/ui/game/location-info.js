import { pwLateLink } from '../../core/late-link.js';
// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// Wave 43 — lazy cross-module links (P7 regression fix):
// zero static imports (chunks + VM harness isolates frozen); each alias resolves
// AT CALL TIME — engine registry first, then the global surface (VM harness).
// V7 · DBT-05 — résolveur unique (core/late-link.js) ; alias résolus à l'appel.
function baseGetState(...args) {
  const f = pwLateLink('baseGetState');
  return f ? f(...args) : undefined;
}
function baseWindowGetRouteAlcoves(...args) {
  const f = pwLateLink('baseWindowGetRouteAlcoves');
  return f ? f(...args) : undefined;
}
function baseWindowRouteOfCurrentBase(...args) {
  const f = pwLateLink('baseWindowRouteOfCurrentBase');
  return f ? f(...args) : undefined;
}
/**
 * Location info panel — classic adapter (model builder ONLY, rebuilt
 * from zero)
 *
 * The whole visual tree is owned by the ECS design system
 * (ui/views/LocationInfoView.js + ui/components/map-dressing.js). This
 * adapter collects the location state, localizes every label and keeps
 * the legacy contracts (rotation ticker spans, loc-caught-badge state
 * classes, legacy-call routing names/args).
 */
// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) {
    if (typeof pwSetHtml === 'function') pwSetHtml(el, html);
    else el.innerHTML = html;
  };
}

function locationInfoModel() {
  const loc = getLocObj(G.location);
  const champId = loc.champ;
  const champ = champId ? (typeof getChampDef === 'function' ? getChampDef(champId) : null) : null;
  const champDefeated = champId && G.defeatedChamps[champId];
  const uiIcon = (name, fallback = '') =>
    typeof getIcon === 'function' ? getIcon(name, 18) : fallback;
  const regionKey =
    typeof regionOfLoc === 'function' ? regionOfLoc(G.location) : G.region || 'kanto';
  const hasShop = !!(loc.shopId && SHOPS[loc.shopId]);
  const wildCount = (loc.wild || []).length;
  const npcCount = (typeof NPCS !== 'undefined' ? NPCS[G.location] || [] : []).length;

  const model = { actions: [], timerChips: [] };
  model.overview = {
    title: getLocName(G.location),
    metas: [
      typeof getRegionDisplayName === 'function' ? getRegionDisplayName(regionKey) : regionKey,
      loc.type || '',
      wildCount
        ? wildCount + ' ' + (t('wild_poke') || 'rencontres')
        : t('no_wild_pokemon_here') || 'aucune rencontre',
      npcCount + ' NPC',
      hasShop ? t('tab_shop') || 'Boutique' : null,
    ].filter(Boolean),
  };
  // FIX (2026-08): the "Bilan du lieu" box counts what you beat / caught HERE,
  // so it only means something where you can actually explore and meet wild
  // Pokémon. Towns have no Explore button -> the box would always read 0 / 0.
  // Single source of truth, shared with the Explore action below, so the two
  // can never drift apart.
  const canExplore = loc.type !== 'town';
  const locRec =
    canExplore && typeof getLocRecordStats === 'function' ? getLocRecordStats(G.location) : null;
  if (locRec) {
    model.playStats = {
      title: t('loc_stats_title') || 'Bilan',
      beatenLabel: t('loc_stat_beaten') || 'Vaincus',
      capturedLabel: t('loc_stat_captured') || 'Capturés',
      beaten: locRec.beaten,
      captured: locRec.captured,
    };
  }

  // ── Lore quote ─────────────────────────────────────────────────────────
  const lore = getLore(G.location);
  if (lore && lore.text) model.lore = { speaker: lore.speaker, text: lore.text };

  function getNpcButtonStatus(G, locId, npc, ni, npcName) {
    const isRewardNpc =
      npcName === 'Président Fan Club' ||
      npcName === 'Fan Club President' ||
      npcName === 'Léo' ||
      npcName === 'Bill' ||
      npcName === 'Employé de la Sylphe' ||
      npcName === 'Silph Employee' ||
      npcName === 'M. Psyché' ||
      npcName === 'Mr. Psychic' ||
      npcName === 'Pharmacien Didier' ||
      npcName === 'Pharmacist Didier';
    const key = locId + '_' + ni;

    if (npc.quest && typeof SIDE_QUESTS !== 'undefined' && SIDE_QUESTS[npc.quest]) {
      const active = (G.activeQuests || []).some((i) => i.qid === npc.quest && i.cat === 'side');
      const done = G.completedQuests && G.completedQuests['side_' + npc.quest];
      if (active) return { badge: '⏳ ', cls: 'pw-loc-npc-btn pw-npc-quest-active' };
      if (done) return { badge: '✓ ', cls: 'pw-loc-npc-btn pw-npc-done' };
      return { badge: '❗ ', cls: 'pw-loc-npc-btn pw-npc-quest-offer' };
    }
    if (npc.mainTalk != null) {
      const active = (G.activeQuests || []).some(
        (i) => i.cat === 'main' && i.qid === npc.mainTalk && !i.done
      );
      const done = G.completedQuests && G.completedQuests[npc.mainTalk];
      if (active) return { badge: '❗ ', cls: 'pw-loc-npc-btn pw-npc-quest-offer' };
      if (done) return { badge: '✓ ', cls: 'pw-loc-npc-btn pw-npc-done' };
    }
    if (isRewardNpc) {
      const claimed = G.npcRewardsClaimed && G.npcRewardsClaimed[key];
      if (claimed) return { badge: '✓ ', cls: 'pw-loc-npc-btn pw-npc-done' };
      return { badge: '❗ ', cls: 'pw-loc-npc-btn pw-npc-quest-offer' };
    }
    const talked = G.npcTalked && G.npcTalked[key];
    if (talked) return { badge: '✓ ', cls: 'pw-loc-npc-btn pw-npc-talked' };
    return { badge: '💬 ', cls: 'pw-loc-npc-btn pw-npc-untalked' };
  }

  // ── Action buttons (locked entries = informational rows, user rule) ────
  const locNpcs = typeof NPCS !== 'undefined' ? NPCS[G.location] || [] : [];
  locNpcs.forEach((npc, ni) => {
    const npcName = getNpc(G.location, ni).name || 'NPC ' + (ni + 1);
    const st = getNpcButtonStatus(G, G.location, npc, ni, npcName);
    model.actions.push({
      kind: 'button',
      cls: st.cls,
      iconHtml: uiIcon('npc', '•'),
      label: st.badge + npcName,
      call: 'openNpc',
      callArgs: "'" + G.location + "'," + ni,
    });
  });
  // PASSE 32 — donjons : état de l'expédition en cours dans CE lieu.
  const dgRun = typeof dungeonRunSummary === 'function' ? dungeonRunSummary() : null;
  const dgHere = !!(dgRun && dgRun.loc === G.location);
  if (canExplore) {
    // P0 — donjon : le bouton affiche le tarif avec le SPRITE de la monnaie.
    let exploreLabel = t('explore_btn');
    let exploreLabelHtml = null;
    if (loc.type === 'dungeon' && typeof dungeonToll === 'function') {
      const toll = dungeonToll(loc.badgeReq || 0);
      // PASSE 32 — le péage n'est dû qu'à l'OUVERTURE de l'expédition : une fois
      // la descente en cours, les combats du donjon sont gratuits.
      if (dgHere) {
        exploreLabelHtml = null;
        exploreLabel = tr('dungeon_fight_btn', { floor: String(dgRun.floor) });
      } else if (toll > 0) {
        // PASSE 39 — les forêts n'ont qu'UN niveau : pas de « (N paliers) ».
        const dgDepth =
          typeof dungeonDepthFor === 'function'
            ? dungeonDepthFor(loc.badgeReq || 0, G.location)
            : 1;
        exploreLabelHtml =
          (dgDepth > 1
            ? tr('dungeon_enter_btn', { depth: String(dgDepth) })
            : tr('dungeon_enter_btn_single')) +
          ' — <img src="src/assets/images/currency/dungeonToken.svg" alt="" style="width:14px;height:14px;vertical-align:-2px;"> ' +
          formatNumber(toll);
      }
    }
    // V7-R1b — en expédition, « Combattre au palier N » doit ENGAGER : il
    // passe par dungeonFight() (marche jusqu'au combat le plus proche de la
    // grille, PASSE 39f) et non par exploreArea(), muet sans case engagée —
    // c'était l'un des verrous après un rechargement de page.
    model.actions.push({
      kind: 'button',
      cls: dgHere ? 'pw-loc-dungeon-btn' : null,
      iconHtml: uiIcon('explore', '•'),
      label: exploreLabel,
      labelHtml: exploreLabelHtml,
      call: dgHere ? 'dungeonFight' : 'exploreArea',
      callArgs: '',
    });
  }
  // PASSE 33 — le suivi d'expédition (palier, quota, sac, descendre/remonter)
  // a été DÉPLACÉ dans la fenêtre de COMBAT (#battle-dungeon-bar) : « le fait
  // que l'affichage soit dans la fenêtre lieu et non dans celle de combat est
  // un problème ». La fenêtre LIEU ne garde donc que l'entrée en donjon ; le
  // pilotage de l'expédition se fait entièrement depuis le bandeau de combat.
  // `model.dungeonRun` n'est plus alimenté (le rendu associé devient inerte).
  if (typeof getPuzzlesForLocation === 'function') {
    const puzzlesHere = getPuzzlesForLocation(G.location) || [];
    if (puzzlesHere.length) {
      const done = puzzlesHere.filter(
        (p) => typeof isPuzzleCompleted === 'function' && isPuzzleCompleted(p.id)
      ).length;
      const label =
        typeof t === 'function' && t('puzzle_explore_btn') !== 'puzzle_explore_btn'
          ? t('puzzle_explore_btn')
          : G.lang === 'en'
            ? 'Puzzle explorations'
            : 'Explorations à énigmes';
      model.actions.push({
        kind: 'button',
        cls: 'pw-loc-quest-btn',
        iconHtml: '🧩',
        label: label + ' (' + done + '/' + puzzlesHere.length + ')',
        call: 'openPuzzleListForLocation',
        callArgs: "'" + G.location + "'",
      });
    }
  }
  const localDefeatQuest =
    typeof getActiveLocalDefeatQuestForLocation === 'function'
      ? getActiveLocalDefeatQuestForLocation(G.location)
      : null;
  const hasRegularWildBattle = !!(loc.wild && loc.wild.length);
  if (localDefeatQuest && !hasRegularWildBattle) {
    const qtxt = getQuestText(localDefeatQuest.inst.cat || 'main', localDefeatQuest.def.id);
    model.actions.push({
      kind: 'button',
      cls: 'pw-loc-quest-btn',
      iconHtml: uiIcon('battle', '•'),
      label: t('quest_battle_btn') + (qtxt.title ? ' — ' + qtxt.title : ''),
      call: 'startQuestDefeatBattle',
      callArgs: "'" + G.location + "'",
    });
  }
  if (loc.shopId && SHOPS[loc.shopId]) {
    if (loc.shopId === 'indigo' && !G.championTitle) {
      model.actions.push({
        kind: 'info',
        iconHtml: uiIcon('shop', '•'),
        label: t('tab_shop') + ' (' + t('locked') + ')',
      });
    } else {
      model.actions.push({
        kind: 'button',
        iconHtml: uiIcon('shop', '•'),
        label: t('tab_shop'),
        call: 'openFullscreenPanel',
        callArgs: "'shop'",
      });
    }
  }
  if (champId) {
    const champBadgeReq = champ ? champ.badgeReq || 0 : 0;
    const haveRegionBadges =
      typeof regionBadgeCount === 'function'
        ? regionBadgeCount(regionOfLoc(G.location))
        : (G.badges || []).length;
    const champLocked = champBadgeReq > haveRegionBadges;
    const isLeague =
      (typeof isLeagueChampionId === 'function' && isLeagueChampionId(champId)) ||
      champId === 'elite4' ||
      champId === 'johto_elite4';
    const champName = getChampName(champId);
    if (champLocked) {
      const lockedLabel = isLeague
        ? tr('league_locked_label', { champion: champName, badges: champBadgeReq })
        : tr('arena_locked_label', { champion: champName, badges: champBadgeReq });
      model.actions.push({ kind: 'info', iconHtml: uiIcon('battle', '•'), label: lockedLabel });
    } else if (champDefeated) {
      const rematchLabel = isLeague
        ? tr('league_rematch_label', { champion: champName })
        : tr('arena_rematch_label', { champion: champName });
      model.actions.push({
        kind: 'button',
        cls: 'pw-loc-gym-btn',
        iconHtml: uiIcon('rematch', '•'),
        label: rematchLabel,
        call: 'startChampBattle',
        callArgs: "'" + champId + "'",
      });
    } else {
      const challengeLabel = isLeague
        ? tr('league_challenge_label', { champion: champName })
        : tr('arena_challenge_label', { champion: champName });
      model.actions.push({
        kind: 'button',
        cls: 'pw-loc-gym-btn',
        iconHtml: uiIcon('battle', '•'),
        label: challengeLabel,
        call: 'startChampBattle',
        callArgs: "'" + champId + "'",
      });
    }
  }

  // ── Zone unlock progress (self-contained bar in the DS component) ───────
  if (loc.type !== 'town' && (loc.minWins || 0) > 0 && loc.wild && loc.wild.length) {
    const linkedIds =
      typeof getLinkedRouteIds === 'function' ? getLinkedRouteIds(G.location) : [G.location];
    const curWins = linkedIds.reduce((sum, id) => sum + ((G.wildWinsByLoc || {})[id] || 0), 0);
    const need = loc.minWins;
    const nextZoneIds =
      typeof zonesUnlockedByClearing === 'function' ? zonesUnlockedByClearing(G.location) : [];
    const nextZones = nextZoneIds.map((id) => getLocName(id));
    if (curWins < need && nextZones.length) {
      const pct = clamp(Math.floor((curWins / need) * 100), 0, 100);
      const zoneTxt = nextZones.length ? nextZones.slice(0, 2).join(', ') : t('next_zone');
      model.unlockTip = {
        text: curWins + ' / ' + need + ' ' + t('battles') + ' — ' + t('to_unlock') + ' ' + zoneTxt,
        pct,
      };
    }
  }

  // ── Roaming legendary rotation chip ─────────────────────────────────────
  const roamingId = getRoamingLegendaryForRoute(G.location);
  if (roamingId) {
    if (typeof startRotationTicker === 'function') startRotationTicker(); // 12 h rotation timer (phase 22)
    const roamTime =
      typeof formatRotationCountdown === 'function' && typeof getRotationTimeLeftMs === 'function'
        ? formatRotationCountdown(getRotationTimeLeftMs())
        : '';
    model.timerChips.push({
      labelHtml:
        '<b>' +
        t('roaming_legendary_rotation') +
        '</b> ' +
        getPokeName(roamingId) +
        ' ' +
        t('can_appear_here'),
      timerKind: 'roam',
      timerText: tr('roaming_rotation_timer', { time: roamTime }),
    });
  }

  // ── Mirage Island show/hide timer (same 12 h UTC window) ───────────────
  if (G.location === 'mirage_island' || (loc.conn || []).includes('mirage_island')) {
    if (typeof startRotationTicker === 'function') startRotationTicker();
    const mirTime =
      typeof formatRotationCountdown === 'function' && typeof getRotationTimeLeftMs === 'function'
        ? formatRotationCountdown(getRotationTimeLeftMs())
        : '';
    const mirWindow =
      typeof getRotationWindow === 'function'
        ? getRotationWindow()
        : Math.floor(Date.now() / (12 * 3600 * 1000));
    const mirVisible = mirWindow % 2 === 0;
    model.timerChips.push({
      labelHtml:
        '<b>\ud83c\udf2b\ufe0f</b> ' +
        (mirVisible ? t('mirage_island_present') : t('mirage_island_absent')),
      timerKind: 'mirage',
      timerText: tr('mirage_rotation_timer', { time: mirTime }),
    });
  }

  // ── Wild encounters grid ────────────────────────────────────────────────
  if (loc.wild && loc.wild.length) {
    const comp = locCompletion(G.location);
    const shinyCount = comp ? comp.ids.filter((id) => isSpeciesShiny(id)).length : 0;
    const entries = [];
    for (const w of loc.wild) {
      const [id, lo, hi, rarity] = w;
      const r = rarity || 'common';
      const pd = PD[id];
      if (!pd) continue;
      const seen = G.pokedex[id];
      const owned = speciesOwned(id);
      const shinyOwned = isSpeciesShiny(id);
      entries.push({
        owned,
        seen: !!seen,
        shinyOwned,
        name: getPokeName(id),
        spriteHtml: spriteImg(id, '', { size: 56, shiny: shinyOwned }),
        levelText: 'Nv.' + lo + '-' + hi,
        // V7 · TXT-01 — les pourcentages viennent de BUCKET_ODDS (règle d'apparition), jamais du texte.
        rarityText:
          r === 'rare'
            ? tr('rarity_rare', { pct: _pwBucketPct('rare') })
            : r === 'uncommon'
              ? tr('rarity_uncom', { pct: _pwBucketPct('uncommon') })
              : tr('rarity_com', { pct: _pwBucketPct('common') }),
      });
    }
    if (roamingId) {
      const seen = G.pokedex[roamingId];
      const owned = speciesOwned(roamingId);
      const shinyOwned = isSpeciesShiny(roamingId);
      entries.push({
        owned,
        seen: !!seen,
        shinyOwned,
        roaming: true,
        accentCls: 'pw-accent-bold',
        name: getPokeName(roamingId),
        spriteHtml: spriteImg(roamingId, '', { size: 56, shiny: shinyOwned }),
        // ROAM-01 / TXT-01: level and rate come from the encounter rule constants.
        levelText: t('level_abbrev') + (typeof ROAMING_LEVEL === 'number' ? ROAMING_LEVEL : 75),
        rarityText: tr('roaming_short', {
          pct: Math.round((typeof ROAMING_CHANCE === 'number' ? ROAMING_CHANCE : 0.01) * 1000) / 10,
        }),
      });
    }
    model.wild = {
      meta: {
        label: t('wild_poke'),
        progress: comp ? comp.caught + '/' + comp.total : '',
        shinyTag: shinyCount > 0 ? 'Shiny : ' + shinyCount + '/' + comp.total : null,
      },
      entries,
    };
  }

  // ── Route drops + Hoenn secret-base alcoves ─────────────────────────────
  if (loc.type !== 'town') {
    const drops = ROUTE_DROPS[G.location];
    if (drops && drops.length) {
      model.drops = {
        title: t('drop_items_lbl'),
        chips: drops.map((d) => {
          const itm = ITEMS[d];
          // Wave 28 (user): same display as the wild Pokémon — the canonical
          // .pw-poke-circle-wrap disc (56px sprite, 72px frame) with the name
          // below. The old 24px inline chip was unreadably small.
          const icon = itm ? itemIcon(d, 56) : null;
          return {
            discHtml: icon
              ? '<span class="pw-poke-circle-wrap" style="width:56px;height:56px;"><span class="pw-poke-circle-bg"></span>' +
                icon +
                '</span>'
              : '?',
            iconHtml: icon || '?',
            name: getItemName(d),
          };
        }),
      };
    }
    const routeAlcoves =
      typeof pwLateLink('baseWindowGetRouteAlcoves') === 'function'
        ? baseWindowGetRouteAlcoves(G.location)
        : [];
    if (G && G.region === 'hoenn' && routeAlcoves.length && !!G.unlockedSecretBaseHoenn) {
      const bEn = G.lang === 'en';
      const bSt = typeof pwLateLink('baseGetState') === 'function' ? baseGetState() : null;
      const hasBase = !!(bSt && bSt.layoutId);
      const baseHere =
        typeof pwLateLink('baseWindowRouteOfCurrentBase') === 'function'
          ? baseWindowRouteOfCurrentBase()
          : null;
      const isHere = hasBase && baseHere === G.location;
      const curLayout = bSt ? bSt.layoutId : null;
      const layLbl = (id) => {
        const v = typeof t === 'function' ? t('base.win.layout.' + id) : id;
        return v && v !== 'base.win.layout.' + id ? v : id;
      };
      model.alcoves = {
        title:
          (bEn ? 'Secret Base alcoves — ' : 'Alcôves de Base Secrète — ') +
          getLocName(G.location) +
          (isHere ? ' ✓' : ''),
        subText: !hasBase
          ? bEn
            ? 'You don\u2019t have a Secret Base yet — visit an alcove, then settle in!'
            : 'Vous n\u2019avez pas encore de Base Secrète — visitez une alcôve, puis installez-vous !'
          : isHere
            ? (bEn
                ? 'Your Secret Base is established here'
                : 'Votre Base Secrète est établie ici') +
              ' (' +
              layLbl(curLayout) +
              ').'
            : // Wave 35 (user): spatial orientation — where IS my base from here.
              (bEn
                ? 'Your Secret Base is established elsewhere'
                : 'Votre Base Secrète est établie ailleurs') +
              (baseHere ? ' (' + getLocName(baseHere) + ')' : '') +
              (bEn ? ' — travel there to visit it.' : ' — rendez-vous sur place pour la visiter.'),
        subCls: isHere && hasBase ? 'pw-text-positive' : 'pw-light1',
        rows: routeAlcoves.map((aid) => {
          const isCur = isHere && curLayout === aid;
          return {
            label: layLbl(aid),
            current: isCur,
            currentLabel: bEn ? 'Your base' : 'Votre base',
            // Wave 35 (user): direct entry from the location hosting the base —
            // until now the current row was plain text with NO way in.
            enterLabel: bEn ? 'Enter my base' : 'Entrer dans ma base',
            visitLabel: bEn ? 'Visit' : 'Visiter',
            establishLabel: bEn ? 'Settle here' : 'S\u2019installer ici',
            visitArgs: "'" + G.location + "','" + aid + "'",
            establishArgs: "'" + G.location + "','" + aid + "'",
          };
        }),
      };
    }
  }

  // ── Boutiques de formes (V7 · FORM-01) — pilotées par FORM_SHOPS (lieu,
  // titre i18n, icône) : aucun libellé ni lieu en dur.
  if (G && typeof FORM_SHOPS !== 'undefined' && FORM_SHOPS) {
    for (const panelKey of Object.keys(FORM_SHOPS)) {
      const shop = FORM_SHOPS[panelKey];
      if (!shop || shop.location !== G.location) continue;
      model.actions.push({
        kind: 'button',
        iconHtml: shop.icon || '',
        label: t(shop.titleKey),
        call: 'openFullscreenPanel',
        callArgs: "'" + panelKey + "'",
      });
    }
  }
  return model;
}
// V7 · TXT-01 — part d'un seau de rareté en % entier (BUCKET_ODDS : 4 / 20 / 76).
function _pwBucketPct(bucket) {
  const odds =
    typeof BUCKET_ODDS !== 'undefined' && BUCKET_ODDS ? BUCKET_ODDS : { rare: 0.04, uncommon: 0.2 };
  const share =
    bucket === 'rare'
      ? odds.rare
      : bucket === 'uncommon'
        ? odds.uncommon
        : 1 - odds.rare - odds.uncommon;
  return Math.round(share * 100);
}
function renderLocInfo(el) {
  try {
    if (typeof PokeTrace !== 'undefined' && PokeTrace) PokeTrace.count('render', 'ui:loc-info');
  } catch (_) {}
  const loc = getLocObj(G.location);
  if (!loc) return;
  // Window title side effect (kept contract).
  const locTitleEl = document.getElementById('loc-win-title');
  if (locTitleEl) locTitleEl.textContent = getLocName(G.location) || 'Lieu';
  // Rebuilt display: the ECS design system owns the whole tree.
  const views =
    typeof window !== 'undefined' && window.PokeUI && window.PokeUI.views
      ? window.PokeUI.views
      : null;
  if (!views || !views.LocationInfoView)
    throw new Error('[ui] PokeUI views not loaded (LocationInfoView)');
  _pwSetHtmlSafe(el, views.LocationInfoView.toHTML(locationInfoModel()));
}

function typeLabel(typ) {
  return t('typ_' + typ) || typ;
}

// --- Migrated to ES module, globals exposed ---
if (typeof renderLocInfo !== 'undefined') {
  if (typeof window !== 'undefined') window.renderLocInfo = renderLocInfo;
  if (typeof globalThis !== 'undefined') globalThis.renderLocInfo = renderLocInfo;
}
if (typeof locationInfoModel !== 'undefined') {
  if (typeof window !== 'undefined') window.locationInfoModel = locationInfoModel;
  if (typeof globalThis !== 'undefined') globalThis.locationInfoModel = locationInfoModel;
}
if (typeof typeLabel !== 'undefined') {
  if (typeof window !== 'undefined') window.typeLabel = typeLabel;
  if (typeof globalThis !== 'undefined') globalThis.typeLabel = typeLabel;
}

// ── Form panels (shop/market style) ────────────────────────────────
// V7 · FORM-01/03 — Institut Météo (Morphéo) et Autopia (Deoxys) : les
// boutons, prix, noms et sprites viennent de FORMS / FORM_SHOPS
// (src/data/forms-data.js) — plus aucun libellé ni prix en dur (TXT-01).
// Une forme achetée est un Pokémon à part `{ id: base, form: slot }`, livré
// dans la Boîte PC sous la clé speciesKey ("351-1"). Contrat d'achat :
// buySpecialFormPokemon(baseId, slot, price) — arguments numériques non cités.
function _formShopDef(panelKey) {
  const shops = typeof FORM_SHOPS !== 'undefined' && FORM_SHOPS ? FORM_SHOPS : {};
  const shop = shops[panelKey];
  if (!shop) return null;
  const forms = typeof formsOf === 'function' ? formsOf(shop.baseId) : [];
  return { ...shop, forms: forms.filter((f) => f.source && f.source.shop === panelKey) };
}

function renderSpecialFormsPanel(el, panelKey) {
  const def = _formShopDef(panelKey);
  if (!def || !el) return;
  const filterBar = document.getElementById('fs-panel-filters');
  if (filterBar) {
    filterBar.style.display = 'flex';
    filterBar.style.alignItems = 'center';
    filterBar.style.justifyContent = 'flex-end';
    _pwSetHtmlSafe(
      filterBar,
      `<span class="pw-text-sm pw-light2">${t('money')}: <b class="pw-text-md pw-light2">${formatNumber(G.money)}₽</b></span>`
    );
  }
  // Condition: the base species must be in the PC box (not the team).
  // Until this is the case, the form buttons are not shown —
  // only an explanatory message appears.
  const unlocked = typeof speciesInBox === 'function' ? speciesInBox(def.baseId) : false;
  // Wave 21 (ECS DS): the panel content is rendered from zero by
  // SpecialFormsView — this adapter only shapes (localized) models.
  const views =
    typeof window !== 'undefined' && window.PokeUI && window.PokeUI.views
      ? window.PokeUI.views
      : null;
  if (!views || typeof views.SpecialFormsView !== 'function')
    throw new Error('[ui] PokeUI views not loaded (SpecialFormsView)');
  const model = { title: t(def.titleKey), emptyLabel: '', rows: [] };
  if (!unlocked) {
    model.emptyLabel = tr('forms_shop_locked', { name: getPokeName(def.baseId) });
    _pwSetHtmlSafe(el, views.SpecialFormsView.toHTML(model));
    return;
  }
  const lang = (G && G.lang) || 'fr';
  model.rows = def.forms.map((f) => {
    const key = `${f.base}-${f.slot}`;
    const owned = typeof speciesOwned === 'function' ? speciesOwned(key) : false;
    const isShiny = typeof isSpeciesShiny === 'function' ? isSpeciesShiny(key) : false;
    const price = Number(f.source && f.source.price) || 0;
    return {
      spriteHtml: spriteImg(key, '', { size: 72, shiny: isShiny }),
      nameLabel: typeof formName === 'function' ? formName(f, lang) : f.name_fr || f.name_en,
      owned: owned,
      ownedText: `${t('bought')} — ${t('forms_shop_owned')}`,
      descText: t('forms_shop_desc'),
      sideText: owned ? '✓' : formatNumber(price) + '₽',
      callArgs: f.base + ',' + f.slot + ',' + price,
    };
  });
  _pwSetHtmlSafe(el, views.SpecialFormsView.toHTML(model));
}
function renderCastformFormsPanel(el) {
  renderSpecialFormsPanel(el, 'castform_forms');
}
function renderDeoxysFormsPanel(el) {
  renderSpecialFormsPanel(el, 'deoxys_forms');
}

if (typeof window !== 'undefined') {
  if (typeof globalThis !== 'undefined')
    globalThis.renderSpecialFormsPanel = renderSpecialFormsPanel;
  if (typeof globalThis !== 'undefined')
    globalThis.renderCastformFormsPanel = renderCastformFormsPanel;
  if (typeof globalThis !== 'undefined') globalThis.renderDeoxysFormsPanel = renderDeoxysFormsPanel;
}

function buySpecialFormPokemon(baseId, slot, price) {
  // Compat : l'ancien contrat (id 387–392, prix) est encore accepté.
  if (price == null && typeof LEGACY_FORM_IDS !== 'undefined' && LEGACY_FORM_IDS[Number(baseId)]) {
    const k =
      typeof parseSpeciesKey === 'function'
        ? parseSpeciesKey(LEGACY_FORM_IDS[Number(baseId)])
        : null;
    price = slot;
    baseId = k ? k.id : baseId;
    slot = k ? k.form : 0;
  }
  baseId = Number(baseId);
  slot = Number(slot) || 0;
  price = Number(price) || 0;
  const def = typeof getFormDef === 'function' ? getFormDef(baseId, slot) : null;
  if (!def || !G || typeof G.money !== 'number') return;
  // Le prix de référence est celui de la donnée (jamais celui du bouton).
  price = Number(def.source && def.source.price) || price;
  if (G.money < price) {
    if (typeof notify === 'function') notify(t('n.pas_assez_dargent'), 'var(--red)');
    return;
  }
  const key = `${baseId}-${slot}`;
  // Déjà possédée (même forme) : pas de doublon, pas de débit — +1 IV à 10 % (cohérent fossiles).
  if (typeof speciesOwnedInstance === 'function' && speciesOwnedInstance(key)) {
    const existing =
      typeof findExistingPokemonBySpecies === 'function' ? findExistingPokemonBySpecies(key) : null;
    const ivKey =
      existing && Math.random() < 0.1 && typeof giveIvBonusToExisting === 'function'
        ? giveIvBonusToExisting(existing)
        : null;
    if (typeof notify === 'function') {
      notify(
        ivKey
          ? tr('forms_shop_dupe_iv', { name: existing.name, stat: String(ivKey).toUpperCase() })
          : tr('forms_shop_dupe', { name: getPokeName(baseId, slot) }),
        'var(--light1)'
      );
    }
    return;
  }
  G.money -= price;
  if (typeof updateHeader === 'function') updateHeader();
  const isShiny = typeof rollShiny === 'function' ? rollShiny(baseId) : false;
  const p =
    typeof createPoke === 'function' ? createPoke(baseId, 1, isShiny, { form: slot }) : null;
  if (!p) return;
  if (isShiny) {
    p.shinyUnlocked = true;
    p.shinyActive = true;
    p.shiny = true;
    if (typeof unlockShinyForSpecies === 'function') unlockShinyForSpecies(key);
  }
  const boxId = typeof generateUniqueBoxId === 'function' ? generateUniqueBoxId(key) : key;
  G.collection[boxId] = p;
  if (typeof markDexCaught === 'function') markDexCaught(p, isShiny);
  if (typeof saveGame === 'function') saveGame();
  try {
    if (typeof renderUnifiedGrid === 'function') renderUnifiedGrid();
  } catch (_) {}
  try {
    if (typeof renderTeamWindow === 'function') renderTeamWindow();
  } catch (_) {}

  if (typeof notify === 'function')
    notify(tr('forms_shop_bought', { name: p.name, price: formatNumber(price) }), 'var(--green)');
  // Refresh the open forms panel (marks "already obtained")
  try {
    const fsContent = document.getElementById('fs-panel-content');
    const cur = typeof window !== 'undefined' ? window._fsCurrentPanel : null;
    if (
      fsContent &&
      (cur === 'castform_forms' || cur === 'deoxys_forms') &&
      typeof renderSpecialFormsPanel === 'function'
    ) {
      renderSpecialFormsPanel(fsContent, cur);
    }
  } catch (_) {}
}
if (typeof window !== 'undefined') {
  if (typeof globalThis !== 'undefined') globalThis.buySpecialFormPokemon = buySpecialFormPokemon;
}

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  renderLocInfo,
  locationInfoModel,
  typeLabel,
  renderSpecialFormsPanel,
  renderCastformFormsPanel,
  renderDeoxysFormsPanel,
  buySpecialFormPokemon,
};
