// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
}

/**
 * Day-care management model (tabs + content blocks) consumed by
 * ui/views/ManagementMenuView. Labels stay localized via t()/tr() at call
 * time so a language switch re-renders correctly. Everything is ECS
 * design-system now (wave 11): tabs, upgrade cards, automation toggles,
 * the per-slot automation cards AND the staff list — no staged classic
 * fragments left here.
 */
function hatcheryManagementModel(page) {
  const icon = (n) => (typeof getIcon === 'function' ? getIcon(n, 14) : '');
  const call = 'openHatcheryManagementMenu';
  const tabs = [
    { id: 'upgrades', label: t('management_upgrades'), iconHtml: icon('save'), call, args: `'upgrades'`, active: page === 'upgrades' },
    { id: 'automation', label: t('management_automation'), iconHtml: icon('settings'), call, args: `'automation'`, active: page === 'automation' },
    { id: 'trainers', label: t('hatchery_managers_title'), iconHtml: icon('team'), call, args: `'trainers'`, active: page === 'trainers' },
  ];
  const blocks = [];
  if (page === 'trainers') {
    // automation.js may be absent in targeted unit-test sandboxes — the
    // block then renders nothing (same as the old guarded fragment).
    blocks.push({ kind: 'staff', class: 'management-staff-block', staff: typeof staffListModel === 'function' ? staffListModel('hatchery') : null });
  } else if (page === 'automation') {
    if (!G.automation) G.automation = { autoHatch: false, autoSeedHatchery: false, autoExplore: false };
    const purchased = (key) => (typeof isAutomationPurchased === 'function' ? isAutomationPurchased(key) : true);
    blocks.push({
      kind: 'toggles',
      cards: [
        { iconHtml: icon('hatchery'), label: t('automation_autoHatch'), purchased: purchased('autoHatch'), enabled: !!G.automation.autoHatch, call: 'toggleAutomationButton', args: `'autoHatch'`, onLabel: t('automation_enabled'), offLabel: t('automation_disabled'), lockedLabel: t('automation_locked_upgrade') },
        { iconHtml: icon('box'), label: t('automation_autoSeedHatchery'), purchased: purchased('autoSeedHatchery'), enabled: !!G.automation.autoSeedHatchery, call: 'toggleAutomationButton', args: `'autoSeedHatchery'`, onLabel: t('automation_enabled'), offLabel: t('automation_disabled'), lockedLabel: t('automation_locked_upgrade') },
      ],
    });
    const maxSlotsAuto = clamp(G.hatcheryMaxSlots || 1, 1, 4);
    const slotCards = [];
    for (let i = 0; i < maxSlotsAuto; i++) { const c = hatcherySlotCardModel(i); if (c) slotCards.push(c); }
    blocks.push({ kind: 'slots', variant: 'hatchery', class: 'management-slot-stack', cards: slotCards });
  } else {
    const maxSlots = clamp(G.hatcheryMaxSlots || 1, 1, 4);
    const upgradeCost = typeof getHatcherySlotUpgradeCost === 'function' ? getHatcherySlotUpgradeCost() : null;
    const queueCost = typeof getHatcheryQueueUpgradeCost === 'function' ? getHatcheryQueueUpgradeCost() : null;
    const queueLimit = typeof getHatcheryQueueLimit === 'function' ? getHatcheryQueueLimit() : 0;
    const autoCost = (key) => (typeof AUTOMATION_UPGRADE_COSTS !== 'undefined' && AUTOMATION_UPGRADE_COSTS[key]
      ? AUTOMATION_UPGRADE_COSTS[key]
      : 1000000);
    const autoCard = (key, iconName) => {
      const bought = typeof isAutomationPurchased === 'function' ? isAutomationPurchased(key) : true;
      return bought
        ? { title: t('automation_' + key), titleIconHtml: icon(iconName), value: t('automation_owned'), state: 'owned', stateLabel: t('automation_owned') }
        : { title: t('automation_' + key), titleIconHtml: icon(iconName), value: tr('automation_buy_button', { price: autoCost(key).toLocaleString() }), state: 'buy', call: 'buyAutomationUpgrade', args: `'${key}'`, buyLabel: t('buy_btn') };
    };
    blocks.push({
      kind: 'upgrades',
      cards: [
        maxSlots >= 4 || upgradeCost == null
          ? { title: t('hatchery_slots_title'), value: `${maxSlots}/4`, state: 'owned', stateLabel: t('automation_owned') }
          : { title: t('hatchery_slots_title'), value: `${maxSlots}/4`, state: 'buy', call: 'upgradeHatcherySlots', args: String(upgradeCost), buyLabel: `${upgradeCost.toLocaleString()}₽` },
        queueCost
          ? { title: t('queue_size_title'), value: tr('queue_capacity', { count: 0, max: queueLimit }), state: 'buy', call: 'upgradeHatcheryQueueSize', args: '', buyLabel: `${queueCost.toLocaleString()}₽` }
          : { title: t('queue_size_title'), value: tr('queue_capacity', { count: 0, max: queueLimit }), state: 'owned', stateLabel: t('automation_owned') },
        autoCard('autoHatch', 'hatchery'),
        autoCard('autoSeedHatchery', 'box'),
      ],
    });
  }
  return { machine: 'hatchery', title: t('hatchery_management_title'), titleIconHtml: icon('settings'), tabs, activeTab: page, blocks };
}

// The day-care automation slot card as a structured model — labels stay
// localized here, ALL rendering/layout now lives in the DS component
// (hatcherySlotCardVNode + DS2811 classes; the data-style era is over).
function hatcherySlotCardModel(i) {
  ensureHatcheryAutomation();
  const cfg = G.hatcheryAutomation.slots[i];
  if (!cfg) return null;
  const mode = cfg.mode || 'exp';
  const modeLabel = mode === 'exp' ? (typeof t==='function'?t('hatchery_daycare_label'):'Daycare') : (typeof t==='function'?t('hatchery_breeding_label'):'Breeding');
  const modeDesc =
    mode === 'exp' ? (typeof t==='function'?t('hatchery_exp_desc'):'Passive EXP (Lv. < 100 only)') : (typeof t==='function'?t('hatchery_breeding_desc'):'Egg / +1 IV (Lv. 100 only)');
  const q = cfg.queue || [];
  // Pending mode change (incubation → day care, applied on hatching)
  const pendingMode = (Array.isArray(G.hatcheryPendingModes) && G.hatcheryPendingModes[i]) || null;
  const pendingBadge = pendingMode
    ? {
      text: `→ ${pendingMode === 'exp' ? (typeof t==='function'?t('hatchery_mode_daycare'):'Garderie') : (typeof t==='function'?t('hatchery_mode_incubation'):'Incubation')} (${t('hatchery_mode_pending_short')||'fin incubation'})`,
      title: t('hatchery_mode_pending_title') || '',
    }
    : null;
  // Fill priority (incubation slots only): Pokemon ↔ Fossil.
  // Distinct mode colors (green daycare / purple incubation, blue Fossil
  // toggle / bronze) come from the dedicated DS classes (.hatchery-mode-
  // toggle / .hatchery-priority-toggle), flattened by DS2811.
  const priority = hatcherySlotPriority(i);
  const priorityCtl = (mode === 'breed')
    ? {
      label: t('hatchery_priority_label') || 'Priorité :',
      current: priority === 'fossil' ? 'fossil' : 'pokemon',
      currentLabel: priority === 'fossil' ? (t('hatchery_priority_fossil')||'Fossile') : (t('hatchery_priority_pokemon')||'Pokémon'),
      call: 'toggleHatcherySlotPriority', args: String(i),
    }
    : null;
  const modeBtn = isLocUnlocked('jroute29')
    ? { label: mode === 'exp' ? t('hatchery_mode_daycare') : t('hatchery_mode_incubation'), mode, call: 'toggleHatcherySlotMode', args: String(i) }
    : { lockedLabel: t('johto_required') || '🔒 Johto requis' };
  return {
    title: `Slot #${i + 1}`,
    mode, modeLabel, desc: modeDesc, pendingBadge,
    priority: priorityCtl,
    modeLabelCtl: { label: t('hatchery_mode_label') },
    modeBtn,
    rules: [
      { label: t('hatchery_filter_shiny'), changeCall: 'setHatcherySlotAutomationOption', changeArgs: `${i}, 'filterShiny', this.value`, options: [
        { value: 'all', label: t('hatchery_filter_all'), selected: cfg.filterShiny === 'all' },
        { value: 'non_shiny', label: t('hatchery_filter_non_shiny'), selected: cfg.filterShiny === 'non_shiny' },
        { value: 'shiny', label: 'Shiny', selected: cfg.filterShiny === 'shiny' },
      ]},
      { label: t('hatchery_filter_iv'), changeCall: 'setHatcherySlotAutomationOption', changeArgs: `${i}, 'filterIv', this.value`, options: [
        { value: 'all', label: typeof t==='function'?t('hatchery_filter_all'):'All', selected: cfg.filterIv === 'all' },
        { value: 'complete', label: typeof t==='function'?t('hatchery_filter_max_iv'):'Max (36)', selected: cfg.filterIv === 'complete' },
        // '<' is plain text — the vdom escapes it to &lt; itself.
        { value: 'incomplete', label: `< ${typeof t==='function'?t('hatchery_filter_max_short'):'Max'}`, selected: cfg.filterIv === 'incomplete' },
      ]},
      { label: (typeof t==='function'?t('filter_fav'):'Favoris'), changeCall: 'setHatcherySlotAutomationOption', changeArgs: `${i}, 'filterFav', this.value`, options: [
        { value: 'all', label: (typeof t==='function'?t('hatchery_filter_all'):'All'), selected: cfg.filterFav === 'all' || !cfg.filterFav },
        { value: 'fav_only', label: '⭐ Favoris', selected: cfg.filterFav === 'fav_only' },
        { value: 'no_fav', label: 'Sans ⭐', selected: cfg.filterFav === 'no_fav' },
      ]},
      { label: (typeof t==='function'?t('filter_region'):'Région'), changeCall: 'setHatcherySlotAutomationOption', changeArgs: `${i}, 'filterRegion', this.value`, options: [
        { value: 'all', label: (typeof t==='function'?t('hatchery_filter_all'):'All'), selected: cfg.filterRegion === 'all' || !cfg.filterRegion },
        { value: 'kanto', label: 'Kanto', selected: cfg.filterRegion === 'kanto' },
        { value: 'johto', label: 'Johto', selected: cfg.filterRegion === 'johto' },
        { value: 'hoenn', label: 'Hoenn', selected: cfg.filterRegion === 'hoenn' },
      ]},
      { label: (typeof t==='function'?t('filter_rank'):'Rang / IV'), changeCall: 'setHatcherySlotAutomationOption', changeArgs: `${i}, 'filterRank', this.value`, options: [
        { value: 'all', label: (typeof t==='function'?t('hatchery_filter_all'):'All'), selected: cfg.filterRank === 'all' || !cfg.filterRank },
        { value: 'S_or_better', label: 'Rang S+', selected: cfg.filterRank === 'S_or_better' },
        { value: 'A_or_worse', label: 'Rang A-', selected: cfg.filterRank === 'A_or_worse' },
      ]},
      { label: (typeof t==='function'?t('filter_type'):'Type'), changeCall: 'setHatcherySlotAutomationOption', changeArgs: `${i}, 'filterType', this.value`, options: [
        { value: 'all', label: (typeof t==='function'?t('hatchery_filter_all'):'All'), selected: cfg.filterType === 'all' || !cfg.filterType },
        { value: 'fire', label: 'Feu', selected: cfg.filterType === 'fire' },
        { value: 'water', label: 'Eau', selected: cfg.filterType === 'water' },
        { value: 'grass', label: 'Plante', selected: cfg.filterType === 'grass' },
        { value: 'electric', label: 'Électrik', selected: cfg.filterType === 'electric' },
        { value: 'normal', label: 'Normal', selected: cfg.filterType === 'normal' },
        { value: 'fighting', label: 'Combat', selected: cfg.filterType === 'fighting' },
        { value: 'flying', label: 'Vol', selected: cfg.filterType === 'flying' },
        { value: 'poison', label: 'Poison', selected: cfg.filterType === 'poison' },
        { value: 'ground', label: 'Sol', selected: cfg.filterType === 'ground' },
        { value: 'rock', label: 'Roche', selected: cfg.filterType === 'rock' },
        { value: 'bug', label: 'Insecte', selected: cfg.filterType === 'bug' },
        { value: 'ghost', label: 'Spectre', selected: cfg.filterType === 'ghost' },
        { value: 'steel', label: 'Acier', selected: cfg.filterType === 'steel' },
        { value: 'psychic', label: 'Psy', selected: cfg.filterType === 'psychic' },
        { value: 'ice', label: 'Glace', selected: cfg.filterType === 'ice' },
        { value: 'dragon', label: 'Dragon', selected: cfg.filterType === 'dragon' },
        { value: 'dark', label: 'Ténèbres', selected: cfg.filterType === 'dark' },
        { value: 'fairy', label: 'Fée', selected: cfg.filterType === 'fairy' },
      ]},
      { label: t('hatchery_sort_order'), changeCall: 'setHatcherySlotAutomationOption', changeArgs: `${i}, 'sort', this.value`, options: [
        { value: 'iv_desc', label: t('hatchery_sort_iv_desc'), selected: cfg.sort === 'iv_desc' },
        { value: 'iv_asc', label: t('hatchery_sort_iv_asc'), selected: cfg.sort === 'iv_asc' },
        { value: 'level_desc', label: t('hatchery_sort_lvl_desc'), selected: cfg.sort === 'level_desc' },
        { value: 'level_asc', label: t('hatchery_sort_lvl_asc'), selected: cfg.sort === 'level_asc' },
        { value: 'dex', label: t('hatchery_sort_dex'), selected: cfg.sort === 'dex' },
      ]},
    ],
    queue: {
      title: t('hatchery_queue_title'),
      capacity: `${q.length}/${getHatcheryQueueLimit()}`,
      listHtml: renderHatcheryQueuePreview(i),
      stop: true,
      add: { label: typeof t==='function'?t('hatchery_add_queue'):'+ Add a Box Pokémon', call: 'openUnifiedSelectorModal', args: `'hatchery_queue_${i}'` },
      clear: { label: typeof t==='function'?t('hatchery_clear_queue'):'Clear queue', call: 'clearHatcheryQueue', args: String(i) },
    },
  };
}
function renderHatcheryAutomationSlotCard(i) {
  const comp = (typeof window !== 'undefined' && window.PokeUI && window.PokeUI.components) || null;
  if(!comp || typeof comp.managementBlocksHTML !== 'function') throw new Error('[ui] PokeUI components not loaded (management)');
  const model = hatcherySlotCardModel(i);
  return comp.managementBlocksHTML(model ? [{ kind: 'slots', variant: 'hatchery', cards: [model] }] : []);
}

let _hatcheryMgmtLastPage = null; // suivi of page for the conservation of the scroll
function openHatcheryManagementMenu(page = 'upgrades') {
  const inner = document.getElementById('poke-modal-inner');
  const modal = document.getElementById('poke-modal');
  if (!inner || !modal) return;
  // Anti "jump to top" (passes 15+16): the menu skeleton (title,
  // tabs, .management-content container) is PERSISTENT — only the content
  // and the active tab are rewritten. The browser then natively keeps the
  // scroll on the same page; we only force back-to-top on a REAL tab
  // change (pwResetScrollNow, which also cancels any delayed restoration
  // scheduled by pwSetHtml). The shell itself is the ECS ManagementMenuView.
  const _keepScroll = (_hatcheryMgmtLastPage === page);
  _hatcheryMgmtLastPage = page;
  modal.classList.remove('poke-detail-front');
  inner.classList.remove('poke-detail-inner');
  inner.classList.add('management-inner');
  const views = (typeof window !== 'undefined' && window.PokeUI && window.PokeUI.views) ? window.PokeUI.views : null;
  if (!views || typeof views.ManagementMenuView !== 'function') throw new Error('[ui] PokeUI views not loaded (ManagementMenuView)');
  const model = hatcheryManagementModel(page);
  // Persistent skeleton: it is only rebuilt when the modal does not
  // already show this panel (otherwise the scrollable container would be
  // recreated and its scroll lost, phase 16).
  const shell = inner.querySelector && inner.querySelector('.management-shell.management-hatchery');
  let contentEl = shell ? shell.querySelector('.management-content') : null;
  if (!contentEl) {
    _pwSetHtmlSafe(inner, views.ManagementMenuView.toHTML(model));
    contentEl = inner.querySelector('.management-content');
  }
  const tabsHost = inner.querySelector('.management-tabs-host');
  if (tabsHost) _pwSetHtmlSafe(tabsHost, views.ManagementMenuView.tabsHTML(model));
  const _pos = _keepScroll && contentEl ? (contentEl.scrollTop || 0) : 0;
  const body = views.ManagementMenuView.contentHTML(model);
  _pwSetHtmlSafe(contentEl, body);
  if (_keepScroll) { try { contentEl.scrollTop = _pos; } catch (_) {} }
  else if (typeof pwResetScrollNow === 'function') pwResetScrollNow(contentEl);
  else { try { contentEl.scrollTop = 0; } catch (_) {} }
  if(typeof window!=='undefined' && typeof window.pwModalInfo==='function') window.pwModalInfo(false);
  modal.classList.add('open');
}
function openHatcheryUpgradeMenu() {
  openHatcheryManagementMenu('upgrades');
}

function renderHatcheryWindow() {
  // Auto-fill only if the upgrade is enabled
  // (non-forced processHatcheryQueue respects G.automation.autoSeedHatchery).
  if (typeof processHatcheryQueue === 'function') { try { processHatcheryQueue(); } catch(_){} }
  const el = document.getElementById('hatchery-window-body');
  if (!el) return;
  const unlocked = G.badges.includes('koga') || G.badges.length >= 4 || isLocUnlocked('fuchsia');
  if (!unlocked) {
    _pwSetHtmlSafe(el, `<div class="pw-hatchery-empty">
 <div class="pw-hatchery-empty-icon"></div>
 <b>${typeof t==='function'?t('hatchery_locked_title'):'Daycare locked'}</b><br>
 ${typeof t==='function'?t('hatchery_locked_desc'):'The Daycare opens its doors in Fuchsia City, after defeating Koga.'}
 </div>`);
    return;
  }

  // Rebuilt display: the hatchery window is rendered by the ECS design
  // system (HatcheryWindowView over the parametrized MachineWindow
  // component) — zero legacy markup below this line; every visual decision
  // (mode colors, progress bar, offer cards) lives in design-system.css.
  const maxSlots = clamp(G.hatcheryMaxSlots || 1, 1, 4);
  if (!G.hatchery) G.hatchery = [null];
  while (G.hatchery.length < maxSlots) G.hatchery.push(null);
  const slots = [];
  for (let i = 0; i < maxSlots; i++) {
    const slot = G.hatchery[i];
    if (!slot) {
      const mode = (G.hatcheryModes && G.hatcheryModes[i]) || 'exp';
      const modeLabel = mode === 'exp' ? (typeof t==='function'?t('hatchery_daycare_short'):'Daycare') : (typeof t==='function'?t('hatchery_breeding_short'):'Breed.');
      slots.push({
        offerClass: `pw-hatchery-offer ${mode === 'exp' ? 'pw-hatchery-offer--exp' : 'pw-hatchery-offer--breed'}`,
        offer: { label: tr('hatchery_place_slot', { slot: i + 1 }),
          rightHtml: `<b class="pw-hatchery-offer-mode">(${modeLabel})</b>`,
          call: 'openUnifiedSelectorModal', callArgs: `'hatchery_queue_${i}'` },
      });
    } else {
      const p = slot.poke;
      const isFossil = !!slot.isFossil;
      const displayId = isFossil ? slot.reviveId : p.id;
      const displayEmoji = isFossil ? '' : p.emoji || '';
      const displayShiny = isFossil ? false : p.shinyActive;
      const fossilDisplayKey =
        isFossil && typeof getFossilDisplayKey === 'function'
          ? getFossilDisplayKey(slot.fossilKey)
          : slot.fossilKey;
      const displayName = isFossil ? getItemName(fossilDisplayKey) : getPokeName(p.id);
      const iconEmoji = isFossil ? '' : '';
      const steps = slot.steps || 0;
      const req = slot.stepsReq || 10;

      const mode = (G.hatcheryModes && G.hatcheryModes[i]) || slot.mode || 'exp';
      const showExp = !isFossil && (!isLocUnlocked('jroute29') || mode === 'exp');
      // Phase 30: daycare shows its K.O. counter (10 = 1 level) —
      // no more XP bar. Incubation keeps its historical counter.
      const daycareReq = (showExp && p && typeof getDaycareKosPerLevel === 'function') ? getDaycareKosPerLevel(p) : 10;
      const pct = showExp ? clamp(Math.floor((steps / daycareReq) * 100), 0, 100) : clamp(Math.floor((steps / req) * 100), 0, 100);
      const done = showExp ? false : steps >= req;
      const statusText = showExp
        ? `${t('hatchery_passive_daycare')} Niv. ${p.level} · ${steps} / ${daycareReq} KO`
        : done
          ? t('ready')
          : `${t('hatchery_incubation_label')} ${steps} / ${req} KO`;

      // Slot actions: only USABLE commands are offered (design-system rule
      // — an unusable control is simply not rendered).
      // Same colour language as the rest of the game: "withdraw" is a
      // neutral retrieval (pw-btn-cancel family), "hatch" is the green
      // POSITIVE family (armed in design-system.css DS2805 via its call).
      const slotActions = [];
      const withdrawBtn = { label: (typeof t==='function'?t('hatchery_withdraw'):'Withdraw'), call: 'withdrawPokemonFromDaycare', callArgs: i, classes: 'hatchery-hatch-btn pw-btn-cancel' };
      const hatchBtn = { label: t('hatch'), call: 'hatchEgg', callArgs: i, classes: 'hatchery-hatch-btn' };
      if (!isLocUnlocked('jroute29')) {
        if (!isFossil) slotActions.push(withdrawBtn);
      } else {
        if (!isFossil) {
          if (mode === 'exp') slotActions.push(withdrawBtn);
          else if (done) slotActions.push(hatchBtn);
        } else if (done) {
          slotActions.push(hatchBtn);
        }
      }

      slots.push({
        cardClass: 'hatchery-slot-card',
        classes: `${done ? 'is-done' : ''} ${isFossil ? 'is-fossil' : ''} ${mode === 'exp' ? 'is-exp' : 'is-breed'}`,
        mainClass: 'hatchery-slot-main', mediaClass: 'hatchery-slot-media', infoClass: 'hatchery-slot-info',
        nameClass: 'hatchery-slot-name', statusClass: 'hatchery-slot-status', progressWrapClass: 'hatchery-slot-progress',
        main: {
          action: { call: 'openUnifiedSelectorModal', callArgs: `'box_view'` },
          mediaHtml: isFossil ? itemIcon(fossilDisplayKey, 44) : spriteImg(displayId, displayEmoji, { size: 64, shiny: displayShiny }),
          nameHtml: `${iconEmoji} ${displayName} <span>Slot #${i + 1}</span>`,
          statusText: statusText,
          progress: { pct: pct, barClass: `hatchery-progress ${done ? 'is-done' : isFossil ? 'is-fossil' : 'is-normal'}` },
        },
        actionsRowClass: 'pw-machine-card-actions--end',
        actions: slotActions,
      });
    }
  }
  const views = (typeof window !== 'undefined' && window.PokeUI && window.PokeUI.views) ? window.PokeUI.views : null;
  if (!views || !views.HatcheryWindowView) throw new Error('[ui] PokeUI views not loaded (HatcheryWindowView)');
  _pwSetHtmlSafe(el, views.HatcheryWindowView.toHTML({
    className: 'hatchery-window',
    header: { classes: 'hatchery-upgrade-row', actions: [{ label: t('hatchery_management_button'), iconHtml: (typeof getIcon === 'function' ? getIcon('settings', 14) : ''), call: 'openHatcheryUpgradeMenu', callArgs: '' }] },
    gridClass: 'pw-col',
    slots: slots,
  })); // scroll conserve (page + panel), phase 16
}

function renderFossilLab(el) {
  const fossils = getFossilInventory();
  let html = `<div class="loc-title"> ${t('fossil_lab')}</div>
 <div class="loc-sub extracted-bridge-style-032">${t('fossil_lab_desc')}</div>`;

  if (!fossils.length) {
    html += `<div class="pw-empty-state pw-card-dark">
 <div class="pw-text-md">${typeof getIcon === 'function' ? getIcon('mine', 20) : ''}</div>
 <b>${t('no_fossils_yet')}</b><br>
 <span class="pw-text-sm">${t('fossil_mine_hint')}</span>
 <div class="pw-btn-center"><button class="hbtn extracted-bridge-style-006" data-action="legacy-call" data-call="showTab" data-call-args="'mine'">${typeof getIcon === 'function' ? getIcon('mine', 14) : ''} ${t('go_to_mine')}</button></div>
 </div>`;
    _pwSetHtmlSafe(el, html);
    return;
  }

  // Displayed quantities = FREE copies (stock − reservations in the
  // hatchery queues) — a reserved fossil must not look available.
  const _fossilReserved =
    typeof getHatcheryFossilReservations === 'function' ? getHatcheryFossilReservations() : {};
  html += `<div class="pw-fossil-grid">`;
  fossils.forEach((f) => {
    const displayKey =
      f.displayKey ||
      (typeof getFossilDisplayKey === 'function' ? getFossilDisplayKey(f.key) : f.key);
    const pokeId = f.reviveId;
    const pokeName = getPokeName(pokeId);
    const seen = G.pokedex[pokeId]?.seen;
    const owned = speciesOwned(pokeId);
    const reserved = _fossilReserved[f.key] || 0;
    const avail = Math.max(0, f.qty - reserved);
    const reservedNote = reserved > 0
      ? ` <span class="pw-text-sm pw-light1">(${tr('fossil_queued_count', { count: reserved })})</span>`
      : '';
    html += `<div class="pw-fossil-card">
 <div class="pw-row">
 <div class="pw-text-md">${itemIcon(displayKey, 36)}</div>
 <div class="pw-flex-1">
 <div class="pw-bold">${getItemName(displayKey)}</div>
 <div class="pw-text-sm pw-light1">${t('quantity_abbrev')}: <b class="pw-light2">${avail}</b>${reservedNote}</div>
 </div>
 </div>
 <div class="pw-fossil-preview">
 <div>${spriteImg(pokeId, '', { size: 60 })}</div>
 <div>
 <div class="pw-bold pw-text-sm">${seen ? pokeName : '???'} <span class="pw-text-sm pw-light1">#${pokeId}</span></div>
 <div class="pw-text-sm pw-light1">${t('revives_into')}</div>
 ${owned ? `<div class="pw-text-sm pw-green"> ${t('owned')}</div>` : ''}
 </div>
 </div>
 ${avail > 0
   ? `<button class="hbtn extracted-bridge-style-033" data-action="legacy-call" data-call="reviveFossil" data-call-args="'${f.key}'">${t('revive')}${avail > 1 ? ` (${avail})` : ''}</button>`
   : `<button class="hbtn extracted-bridge-style-033 is-disabled" disabled>${t('fossil_all_queued')}</button>`}
 </div>`;
  });
  html += `</div>`;
  html += `<div class="pw-alert-info">
 ${t('fossil_lab_tip')}
 </div>`;
  _pwSetHtmlSafe(el, html);
}

function renderFossilLabCompact(el) {
  if (typeof renderFossilLab === 'function') renderFossilLab(el);
}

// --- Migrated to ES module, globals exposed ---
if (typeof openHatcheryManagementMenu !== 'undefined') { if (typeof window !== 'undefined') window.openHatcheryManagementMenu = openHatcheryManagementMenu; if (typeof globalThis !== 'undefined') globalThis.openHatcheryManagementMenu = openHatcheryManagementMenu; }
if (typeof openHatcheryUpgradeMenu !== 'undefined') { if (typeof window !== 'undefined') window.openHatcheryUpgradeMenu = openHatcheryUpgradeMenu; if (typeof globalThis !== 'undefined') globalThis.openHatcheryUpgradeMenu = openHatcheryUpgradeMenu; }
if (typeof renderHatcheryWindow !== 'undefined') { if (typeof window !== 'undefined') window.renderHatcheryWindow = renderHatcheryWindow; if (typeof globalThis !== 'undefined') globalThis.renderHatcheryWindow = renderHatcheryWindow; }
if (typeof renderFossilLab !== 'undefined') { if (typeof window !== 'undefined') window.renderFossilLab = renderFossilLab; if (typeof globalThis !== 'undefined') globalThis.renderFossilLab = renderFossilLab; }
if (typeof renderFossilLabCompact !== 'undefined') { if (typeof window !== 'undefined') window.renderFossilLabCompact = renderFossilLabCompact; if (typeof globalThis !== 'undefined') globalThis.renderFossilLabCompact = renderFossilLabCompact; }
if (typeof renderHatcheryAutomationSlotCard !== 'undefined') { if (typeof window !== 'undefined') window.renderHatcheryAutomationSlotCard = renderHatcheryAutomationSlotCard; if (typeof globalThis !== 'undefined') globalThis.renderHatcheryAutomationSlotCard = renderHatcheryAutomationSlotCard; }
if (typeof hatcherySlotCardModel !== 'undefined') { if (typeof window !== 'undefined') window.hatcherySlotCardModel = hatcherySlotCardModel; if (typeof globalThis !== 'undefined') globalThis.hatcherySlotCardModel = hatcherySlotCardModel; }



// --- Exported globals ---

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  openHatcheryManagementMenu,
  openHatcheryUpgradeMenu,
  renderHatcheryWindow,
  renderFossilLab,
  renderFossilLabCompact,
  renderHatcheryAutomationSlotCard,
  hatcherySlotCardModel,
};
