// Repli si util.js (pwSetHtml) n'est pas chargé — tests unitaires ciblés.
var _pwSetHtmlSafe =
  _pwSetHtmlSafe ||
  function (el, html) {
    if (typeof pwSetHtml === 'function') pwSetHtml(el, html);
    else el.innerHTML = html;
  };

function renderHatcheryManagementTabs(active) {
  return `<div class="management-tabs ui-management-tabs">
  ${
    typeof uiTabButtonHtml === 'function'
      ? uiTabButtonHtml({
          label: t('management_upgrades'),
          icon: typeof getIcon === 'function' ? getIcon('save', 14) : '',
          call: 'openHatcheryManagementMenu',
          args: `'upgrades'`,
          active: active === 'upgrades',
        })
      : `<button class="hbtn ${active === 'upgrades' ? 'active' : ''}" data-action="legacy-call" data-call="openHatcheryManagementMenu" data-call-args="'upgrades'">${t('management_upgrades')}</button>`
  }
  ${
    typeof uiTabButtonHtml === 'function'
      ? uiTabButtonHtml({
          label: t('management_automation'),
          icon: typeof getIcon === 'function' ? getIcon('settings', 14) : '',
          call: 'openHatcheryManagementMenu',
          args: `'automation'`,
          active: active === 'automation',
        })
      : `<button class="hbtn ${active === 'automation' ? 'active' : ''}" data-action="legacy-call" data-call="openHatcheryManagementMenu" data-call-args="'automation'">${t('management_automation')}</button>`
  }
  ${
    typeof uiTabButtonHtml === 'function'
      ? uiTabButtonHtml({
          label: t('hatchery_managers_title'),
          icon: typeof getIcon === 'function' ? getIcon('team', 14) : '',
          call: 'openHatcheryManagementMenu',
          args: `'trainers'`,
          active: active === 'trainers',
        })
      : `<button class="hbtn ${active === 'trainers' ? 'active' : ''}" data-action="legacy-call" data-call="openHatcheryManagementMenu" data-call-args="'trainers'">${t('hatchery_managers_title')}</button>`
  }
 </div>`;
}

function hatcheryAutomationCard(key, icon, descKey) {
  if (!G.automation)
    G.automation = { autoHatch: false, autoSeedHatchery: false, autoExplore: false };
  const purchased =
    typeof isAutomationPurchased === 'function' ? isAutomationPurchased(key) : true;
  if (!purchased) {
    return `<div class="automation-locked-card"><span>${icon} ${t('automation_' + key)}</span><b>${t('automation_locked_upgrade')}</b></div>`;
  }
  const enabled = !!G.automation[key];
  return `<button class="hbtn automation-toggle-btn ${enabled ? 'is-on' : 'is-off'}" data-action="legacy-call" data-call="toggleAutomationButton" data-call-args="'${key}'">
  <span>${icon} ${t('automation_' + key)}</span><b>${enabled ? t('automation_enabled') : t('automation_disabled')}</b>
 </button>`;
}

function hatcheryAutomationUnlockCard(key, icon) {
  const purchased =
    typeof isAutomationPurchased === 'function' ? isAutomationPurchased(key) : true;
  const cost =
    typeof AUTOMATION_UPGRADE_COSTS !== 'undefined' && AUTOMATION_UPGRADE_COSTS[key]
      ? AUTOMATION_UPGRADE_COSTS[key]
      : 1000000;
  return `<div class="upgrade-card ${purchased ? 'is-owned' : ''}"><div><b>${icon} ${t('automation_' + key)}</b><span>${purchased ? t('automation_owned') : tr('automation_buy_button', { price: cost.toLocaleString() })}</span></div>${purchased ? '' : `<button class="hbtn purchase-btn" data-action="legacy-call" data-call="buyAutomationUpgrade" data-call-args="'${key}'">${t('buy_btn')}</button>`}</div>`;
}

function renderHatcheryAutomationSlotCard(i) {
  ensureHatcheryAutomation();
  const cfg = G.hatcheryAutomation.slots[i];
  if (!cfg) return '';
  const mode = cfg.mode || 'exp';
  const modeColor = mode === 'exp' ? 'var(--green)' : 'var(--purple)';
  const modeLabel = mode === 'exp' ? (typeof t==='function'?t('hatchery_daycare_label'):'Daycare') : (typeof t==='function'?t('hatchery_breeding_label'):'Breeding');
  const modeDesc =
    mode === 'exp' ? (typeof t==='function'?t('hatchery_exp_desc'):'Passive EXP (Lv. < 100 only)') : (typeof t==='function'?t('hatchery_breeding_desc'):'Egg / +1 IV (Lv. 100 only)');
  const slotEnabled = !!cfg.enabled;
  const q = cfg.queue || [];
  // Changement de mode en attente (incubation → garderie, appliqué à l'éclosion)
  const pendingMode = (Array.isArray(G.hatcheryPendingModes) && G.hatcheryPendingModes[i]) || null;
  const pendingBadge = pendingMode
    ? `<span data-style="font-size:10px;color:var(--gold, #ffd700);border:1px solid rgba(255,215,0,0.35);border-radius:3px;padding:1px 6px;margin-left:6px;" title="${t('hatchery_mode_pending_title')||''}">→ ${pendingMode === 'exp' ? (typeof t==='function'?t('hatchery_mode_daycare'):'Garderie') : (typeof t==='function'?t('hatchery_mode_incubation'):'Incubation')} (${t('hatchery_mode_pending_short')||'fin incubation'})</span>`
    : '';
  // Priorité de remplissage (slots d'incubation uniquement) : Pokémon ↔ Fossile.
  // Couleurs distinctes des modes (vert garderie / violet incubation) :
  // Pokémon = bleu, Fossile = bronze — pas de confusion possible.
  // NB : la couleur vient des classes CSS dédiées (.hatchery-priority-toggle) —
  // un data-style serait masqué par la règle générique .hbtn:not(...) (passe 14).
  const priority = hatcherySlotPriority(i);
  const priorityBtn = (mode === 'breed')
    ? `<div data-style="display:flex;align-items:center;gap:6px;">
        <span>${t('hatchery_priority_label')||'Priorité :'}</span>
        <button class="hbtn hatchery-priority-toggle ${priority === 'fossil' ? 'is-fossil' : 'is-pokemon'}" data-action="legacy-call-stop" data-call="toggleHatcherySlotPriority" data-call-args="${i}">${priority === 'fossil' ? (t('hatchery_priority_fossil')||'Fossile') : (t('hatchery_priority_pokemon')||'Pokémon')}</button>
      </div>`
    : '';

  return `<div class="upgrade-card" data-style="border-left:5px solid ${modeColor};padding:14px;margin-bottom:15px;background:rgba(255,255,255,0.02);border-radius:6px;width:100%;box-sizing:border-box;display:flex;flex-direction:column;gap:10px;">
    
    <!-- Ligne 1: En-tête -->
    <div data-style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,255,255,0.05);padding-bottom:6px;width:100%;box-sizing:border-box;">
      <h4 data-style="margin:0;color:var(--light1);font-size:14px;font-weight:bold;">Slot #${i + 1} · <span data-style="color:${modeColor};">${modeLabel}</span>${pendingBadge}</h4>
    </div>
    
    <!-- Ligne 2: Description et Sélecteur de Mode -->
    <div data-style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;font-size:11px;width:100%;box-sizing:border-box;">
      <span data-style="color:var(--light2);">${modeDesc}</span>
      <div data-style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        ${priorityBtn}
        <div data-style="display:flex;align-items:center;gap:6px;">
        <span>${t('hatchery_mode_label')}</span>
        ${isLocUnlocked('jroute29') ? `<button class="hbtn hatchery-mode-toggle ${mode === 'exp' ? 'is-exp' : 'is-breed'}" data-action="legacy-call-stop" data-call="toggleHatcherySlotMode" data-call-args="${i}">${mode === 'exp' ? t('hatchery_mode_daycare') : t('hatchery_mode_incubation')}</button>` : `<span data-style="font-size:10px;color:var(--light2);">${t('johto_required')||'🔒 Johto requis'}</span>`}
        </div>
      </div>
    </div>

    <!-- Ligne 3: Filtres de Tri (Unique à ce Slot) -->
    <div data-style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:10px;background:rgba(0,0,0,0.1);padding:10px;border-radius:4px;font-size:11px;margin-top:4px;width:100%;box-sizing:border-box;">
      <label data-style="display:flex;flex-direction:column;gap:4px;">
        <span>${t('hatchery_filter_shiny')}</span>
        <select data-change-call="setHatcherySlotAutomationOption" data-change-args="${i}, 'filterShiny', this.value" data-style="width:100%;min-height:36px;border:1px solid rgba(236,222,183,0.16);border-radius:10px;background:rgba(0,0,0,0.24);color:var(--light2);padding:6px 10px;font-size:12px;font-family:inherit;box-sizing:border-box;cursor:pointer;">
          <option value="all" ${cfg.filterShiny === 'all' ? 'selected' : ''}>${t('hatchery_filter_all')}</option>
          <option value="non_shiny" ${cfg.filterShiny === 'non_shiny' ? 'selected' : ''}>${t('hatchery_filter_non_shiny')}</option>
          <option value="shiny" ${cfg.filterShiny === 'shiny' ? 'selected' : ''}>Shiny</option>
        </select>
      </label>
      
      <label data-style="display:flex;flex-direction:column;gap:4px;">
        <span>${t('hatchery_filter_iv')}</span>
        <select data-change-call="setHatcherySlotAutomationOption" data-change-args="${i}, 'filterIv', this.value" data-style="width:100%;min-height:36px;border:1px solid rgba(236,222,183,0.16);border-radius:10px;background:rgba(0,0,0,0.24);color:var(--light2);padding:6px 10px;font-size:12px;font-family:inherit;box-sizing:border-box;cursor:pointer;">
          <option value="all" ${cfg.filterIv === 'all' ? 'selected' : ''}>${typeof t==='function'?t('hatchery_filter_all'):'All'}</option>
          <option value="complete" ${cfg.filterIv === 'complete' ? 'selected' : ''}>${typeof t==='function'?t('hatchery_filter_max_iv'):'Max (36)'}</option>
          <option value="incomplete" ${cfg.filterIv === 'incomplete' ? 'selected' : ''}>&lt; ${typeof t==='function'?t('hatchery_filter_max_short'):'Max'}</option>
        </select>
      </label>
      
      <label data-style="display:flex;flex-direction:column;gap:4px;">
        <span>${t('hatchery_sort_order')}</span>
        <select data-change-call="setHatcherySlotAutomationOption" data-change-args="${i}, 'sort', this.value" data-style="width:100%;min-height:36px;border:1px solid rgba(236,222,183,0.16);border-radius:10px;background:rgba(0,0,0,0.24);color:var(--light2);padding:6px 10px;font-size:12px;font-family:inherit;box-sizing:border-box;cursor:pointer;">
          <option value="iv_desc" ${cfg.sort === 'iv_desc' ? 'selected' : ''}>${t('hatchery_sort_iv_desc')}</option>
          <option value="iv_asc" ${cfg.sort === 'iv_asc' ? 'selected' : ''}>${t('hatchery_sort_iv_asc')}</option>
          <option value="level_desc" ${cfg.sort === 'level_desc' ? 'selected' : ''}>${t('hatchery_sort_lvl_desc')}</option>
          <option value="level_asc" ${cfg.sort === 'level_asc' ? 'selected' : ''}>${t('hatchery_sort_lvl_asc')}</option>
          <option value="dex" ${cfg.sort === 'dex' ? 'selected' : ''}>${t('hatchery_sort_dex')}</option>
        </select>
      </label>
    </div>
    
    <!-- Ligne 4: File d'attente (Placée DESSOUS) -->
    <div class="queue-panel" data-style="background:rgba(0,0,0,0.15);padding:10px;border-radius:4px;font-size:11px;display:flex;flex-direction:column;gap:6px;width:100%;box-sizing:border-box;">
      <div data-style="display:flex;justify-content:space-between;align-items:center;font-weight:bold;color:var(--light2);">
        <span>${t('hatchery_queue_title')}</span>
        <span data-style="font-size:11px;background:rgba(0,0,0,0.2);padding:2px 6px;border-radius:3px;">${q.length}/${getHatcheryQueueLimit()}</span>
      </div>
      
      <!-- Grow list naturally - no max-height or scrollbars/sliders! -->
      <div class="queue-list" data-style="background:rgba(0,0,0,0.15);padding:6px;border-radius:3px;display:flex;flex-direction:column;gap:4px;width:100%;box-sizing:border-box;">
        ${renderHatcheryQueuePreview(i)}
      </div>
      
      <div data-style="display:flex;gap:8px;padding-top:4px;width:100%;box-sizing:border-box;">
        <button class="hbtn queue-build-btn" data-action="legacy-call-stop" data-call="openUnifiedSelectorModal" data-call-args="'hatchery_queue_${i}'" data-style="padding:4px 8px;font-size:11px;flex:1;background:var(--blue);">
          ${typeof t==='function'?t('hatchery_add_queue'):'+ Add a Box Pokémon'}
        </button>
        <button class="hbtn" data-action="legacy-call-stop" data-call="clearHatcheryQueue" data-call-args="${i}" data-style="padding:4px 8px;font-size:11px;background:rgba(255,255,255,0.05);">
          ${typeof t==='function'?t('hatchery_clear_queue'):'Clear queue'}
        </button>
      </div>
    </div>
  </div>`;
}

var _hatcheryMgmtLastPage = null; // suivi de page pour la conservation du scroll
function openHatcheryManagementMenu(page = 'upgrades') {
  const inner = document.getElementById('poke-modal-inner');
  const modal = document.getElementById('poke-modal');
  if (!inner || !modal) return;
  // Anti « retour en haut » (passes 15+16) : le squelette du menu (titre,
  // onglets, conteneur .management-content) est PERSISTANT — seuls le contenu
  // et l'onglet actif sont réécrits. Le navigateur conserve alors
  // nativement le scroll sur la même page ; on ne force le retour en haut
  // que lors d'un VRAI changement d'onglet (pwResetScrollNow, qui invalide
  // aussi toute restauration différée planifiée par pwSetHtml).
  const _keepScroll = (_hatcheryMgmtLastPage === page);
  _hatcheryMgmtLastPage = page;
  modal.classList.remove('poke-detail-front');
  inner.classList.remove('poke-detail-inner');
  inner.classList.add('management-inner');
  const maxSlots = clamp(G.hatcheryMaxSlots || 1, 1, 4);
  const upgradeCost =
    typeof getHatcherySlotUpgradeCost === 'function' ? getHatcherySlotUpgradeCost() : null;
  const queueCost =
    typeof getHatcheryQueueUpgradeCost === 'function' ? getHatcheryQueueUpgradeCost() : null;
  const slotsBought = maxSlots >= 4;

  let slotsHtml = '';
  if (page === 'automation') {
    for (let i = 0; i < maxSlots; i++) {
      slotsHtml += renderHatcheryAutomationSlotCard(i);
    }
  }

  const body =
    page === 'trainers'
      ? `${typeof renderStaffList === 'function' ? renderStaffList('hatchery') : ''}`
      : page === 'automation'
        ? `<div class="automation-dashboard hatchery-auto-layout" data-style="max-width:1050px;width:100%;box-sizing:border-box;display:flex;flex-direction:column;gap:12px;">
      <div class="automation-toggle-row" data-style="margin-bottom:5px;width:100%;box-sizing:border-box;">
        ${hatcheryAutomationCard('autoHatch', getIcon('hatchery', 14), 'automation_autoHatch_desc')}
        ${hatcheryAutomationCard('autoSeedHatchery', getIcon('box', 14), 'automation_autoSeedHatchery_desc')}
      </div>
      <div data-style="display:flex;flex-direction:column;gap:15px;width:100%;box-sizing:border-box;">
        ${slotsHtml}
      </div>
     </div>`
        : `<div class="upgrade-grid">
      <div class="upgrade-card ${slotsBought ? 'is-owned' : ''}"><div><b>${t('hatchery_slots_title')}</b><span>${maxSlots}/4</span></div>${slotsBought ? `<b>${t('automation_owned')}</b>` : `<button class="hbtn purchase-btn" data-action="legacy-call" data-call="upgradeHatcherySlots" data-call-args="${upgradeCost}">${upgradeCost.toLocaleString()}₽</button>`}</div>
      <div class="upgrade-card ${queueCost ? '' : 'is-owned'}"><div><b>${t('queue_size_title')}</b><span>${tr('queue_capacity', { count: 0, max: getHatcheryQueueLimit() })}</span></div>${queueCost ? `<button class="hbtn purchase-btn" data-action="legacy-call" data-call="upgradeHatcheryQueueSize" data-call-args="">${queueCost.toLocaleString()}₽</button>` : `<b>${t('automation_owned')}</b>`}</div>
      ${hatcheryAutomationUnlockCard('autoHatch', getIcon('hatchery', 14))}
      ${hatcheryAutomationUnlockCard('autoSeedHatchery', getIcon('box', 14))}
     </div>`;
  // Squelette persistant : on ne le reconstruit que si le modal n'affiche
  // pas déjà CE panneau (sinon le conteneur scrollable serait recréé et le
  // scroll repartirait en haut — bug remonté en passe 16).
  let shell = inner.querySelector && inner.querySelector('.management-shell.management-hatchery');
  let contentEl = shell ? shell.querySelector('.management-content') : null;
  if (!contentEl) {
    inner.innerHTML = `<div class="modal-title management-title"><div>${typeof getIcon === 'function' ? getIcon('settings', 14) : ''} ${t('hatchery_management_title')}</div><span class="modal-close" data-action="close-poke-modal">✕</span></div>
 <div class="management-shell management-hatchery">
  <div class="management-tabs-host"></div>
  <div class="management-content" data-style="max-height:480px;overflow-y:auto;padding-right:5px;width:100%;box-sizing:border-box;"></div>
 </div>`;
    contentEl = inner.querySelector('.management-content');
  }
  const tabsHost = inner.querySelector('.management-tabs-host');
  if (tabsHost) tabsHost.innerHTML = renderHatcheryManagementTabs(page);
  const _pos = _keepScroll && contentEl ? (contentEl.scrollTop || 0) : 0;
  contentEl.innerHTML = body;
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
  // Remplissage automatique UNIQUEMENT si l'amélioration est activée
  // (processHatcheryQueue sans force respecte G.automation.autoSeedHatchery).
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

  let headerHtml = `<div class="hatchery-upgrade-row"><button class="hbtn" data-action="legacy-call" data-call="openHatcheryUpgradeMenu" data-call-args="">${typeof getIcon === 'function' ? getIcon('settings', 14) : ''} ${t('hatchery_management_button')}</button></div>`;

  const maxSlots = clamp(G.hatcheryMaxSlots || 1, 1, 4);
  if (!G.hatchery) G.hatchery = [null];
  while (G.hatchery.length < maxSlots) G.hatchery.push(null);
  let html = headerHtml + `<div class="pw-col">`;
  for (let i = 0; i < maxSlots; i++) {
    const slot = G.hatchery[i];
    if (!slot) {
      const mode = (G.hatcheryModes && G.hatcheryModes[i]) || 'exp';
      const modeColor = mode === 'exp' ? 'var(--green)' : 'var(--purple)';
      const modeLabel = mode === 'exp' ? (typeof t==='function'?t('hatchery_daycare_short'):'Daycare') : (typeof t==='function'?t('hatchery_breeding_short'):'Breed.');
      html += `<button class="hbtn extracted-bridge-style-029" data-style="border-left:4px solid ${modeColor};text-align:left;display:flex;justify-content:space-between;align-items:center;" data-action="legacy-call" data-call="openUnifiedSelectorModal" data-call-args="'hatchery_queue_${i}'">
        <span>${tr('hatchery_place_slot', { slot: i + 1 })}</span>
        <b data-style="color:${modeColor};font-size:11px;">(${modeLabel})</b>
      </button>`;
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
      const done = steps >= req;

      let lvlPct = 0;
      let lvlText = '';
      if (p) {
        const curBase = typeof xpForLevel === 'function' ? xpForLevel(p.level) : 0;
        const xpInLevel = Math.max(0, (p.xp || 0) - curBase);
        const xpReqLevel = Math.max(1, (p.xpNext || 1) - curBase);
        lvlText = ` (${xpInLevel} / ${xpReqLevel} EXP)`;
        lvlPct = clamp(Math.floor((xpInLevel / xpReqLevel) * 100), 0, 100);
      }

      const mode = (G.hatcheryModes && G.hatcheryModes[i]) || slot.mode || 'exp';
      const showExp = !isFossil && (!isLocUnlocked('jroute29') || mode === 'exp');
      const pct = showExp ? lvlPct : clamp(Math.floor((steps / req) * 100), 0, 100);
      const statusText = showExp
        ? `${t('hatchery_passive_daycare')} Niv. ${p.level}${lvlText}`
        : done
          ? t('ready')
          : `${t('hatchery_incubation_label')} ${steps} / ${req} KO`;

      let actionButtonsHtml = '';
      if (!isLocUnlocked('jroute29')) {
        if (!isFossil) {
          actionButtonsHtml = `<button class="hbtn hatchery-hatch-btn" data-action="legacy-call" data-call="withdrawPokemonFromDaycare" data-call-args="${i}">${typeof t==='function'?t('hatchery_withdraw'):'Withdraw'}</button>`;
        }
      } else {
        if (!isFossil) {
          if (mode === 'exp') {
            actionButtonsHtml = `<button class="hbtn hatchery-hatch-btn" data-action="legacy-call" data-call="withdrawPokemonFromDaycare" data-call-args="${i}">${typeof t==='function'?t('hatchery_withdraw'):'Withdraw'}</button>`;
          } else if (done) {
            actionButtonsHtml = `<button class="hbtn hatchery-hatch-btn" data-action="legacy-call" data-call="hatchEgg" data-call-args="${i}"> ${t('hatch')}</button>`;
          }
        } else if (done) {
          actionButtonsHtml = `<button class="hbtn hatchery-hatch-btn" data-action="legacy-call" data-call="hatchEgg" data-call-args="${i}"> ${t('hatch')}</button>`;
        }
      }

      const modeColor = mode === 'exp' ? 'var(--green)' : 'var(--purple)';
      html += `<div class="hatchery-slot-card ${done ? 'is-done' : ''} ${isFossil ? 'is-fossil' : ''}" data-style="border-left:4px solid ${modeColor};">
   <div class="hatchery-slot-main" data-action="legacy-call" data-call="openUnifiedSelectorModal" data-call-args="'box_view'">
    <div class="hatchery-slot-media">
     ${isFossil ? itemIcon(fossilDisplayKey, 44) : spriteImg(displayId, displayEmoji, { size: 64, shiny: displayShiny })}
    </div>
    <div class="hatchery-slot-info">
     <div class="hatchery-slot-name">${iconEmoji} ${displayName} <span>Slot #${i + 1}</span></div>
     <div class="hatchery-slot-status">${statusText}</div>
     <div class="hatchery-slot-progress"><div class="hatchery-progress ${done ? 'is-done' : isFossil ? 'is-fossil' : 'is-normal'}" data-pct="${pct}"></div></div>
    </div>
   </div>
   <div data-style="margin-top:4px;display:flex;justify-content:flex-end;">${actionButtonsHtml}</div>
  </div>`;
    }
  }
  html += `</div>`;
  _pwSetHtmlSafe(el, html); // scroll conservé (page + panneau), passe 16
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

  // Quantités affichées = exemplaires LIBRES (stock − réservations dans les
  // files de la pension) — un fossile réservé ne doit pas sembler disponible.
  const _fossilReserved =
    typeof getHatcheryFossilReservations === 'function' ? getHatcheryFossilReservations() : {};
  html += `<div class="pw-fossil-grid">`;
  fossils.forEach((f) => {
    const displayKey =
      f.displayKey ||
      (typeof getFossilDisplayKey === 'function' ? getFossilDisplayKey(f.key) : f.key);
    const item = ITEMS[displayKey] || ITEMS[f.key] || {};
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
if (typeof openHatcheryManagementMenu !== 'undefined' && typeof window !== 'undefined')
  window.openHatcheryManagementMenu = openHatcheryManagementMenu;
if (typeof openHatcheryUpgradeMenu !== 'undefined' && typeof window !== 'undefined')
  window.openHatcheryUpgradeMenu = openHatcheryUpgradeMenu;
if (typeof renderHatcheryWindow !== 'undefined' && typeof window !== 'undefined')
  window.renderHatcheryWindow = renderHatcheryWindow;
if (typeof renderFossilLab !== 'undefined' && typeof window !== 'undefined')
  window.renderFossilLab = renderFossilLab;
if (typeof renderFossilLabCompact !== 'undefined' && typeof window !== 'undefined')
  window.renderFossilLabCompact = renderFossilLabCompact;
if (typeof renderHatcheryAutomationSlotCard !== 'undefined' && typeof window !== 'undefined')
  window.renderHatcheryAutomationSlotCard = renderHatcheryAutomationSlotCard;

