if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) {
    if (typeof globalThis.pwSetHtml === 'function') globalThis.pwSetHtml(el, html);
    else el.innerHTML = html;
  };
}
/**
 * PokéWorld — Achievements Panel (V7 · P4a / ACH-01 & ACH-02).
 *
 * Panneau complet des succès PokéWorld avec filtrage par famille, barres de
 * progression, détail des paliers et récapitulatif des bonus permanents.
 *
 * @module ui/game/achievements-panel
 */

import {
  ACHIEVEMENT_FAMILIES,
  ACHIEVEMENTS,
  getAchievementDef,
  getAchievementsByFamily,
} from '../../data/achievements-data.js';
import {
  ensureAchievementsState,
  getAchievementProgress,
  countUnlockedAchievements,
  getAchievementBonus,
} from '../../application/achievements.js';

let _activeFamilyFilter = 'all';

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getIconHtml(iconName, size = 16) {
  return typeof globalThis.getIcon === 'function' ? globalThis.getIcon(iconName, size) : '';
}

export function setAchievementFamilyFilter(famId) {
  _activeFamilyFilter = famId || 'all';
  const container = document.getElementById('fs-panel-content');
  if (container) renderAchievementsPanel(container);
}

export function renderAchievementsPanel(container) {
  if (!container) return;
  const G = globalThis.G || {};
  ensureAchievementsState(G);

  const lang = G.lang === 'en' ? 'en' : 'fr';
  const { totalTiers, maxTiers, completedCount } = countUnlockedAchievements(G);
  const totalPct = maxTiers > 0 ? Math.round((totalTiers / maxTiers) * 100) : 0;

  // Active bonuses overview
  const moneyBonus = getAchievementBonus('money', 'global', G);
  const xpBonus = getAchievementBonus('xp', 'global', G);
  const lootBonus = getAchievementBonus('loot', 'global', G);
  const catchBonus = getAchievementBonus('capture', 'global', G);
  const shinyBonus = getAchievementBonus('shiny', 'global', G);

  const bonusPills = [];
  if (moneyBonus > 0) bonusPills.push(`+${moneyBonus}% ₽`);
  if (xpBonus > 0) bonusPills.push(`+${xpBonus}% XP`);
  if (lootBonus > 0) bonusPills.push(`+${lootBonus} pt Butin`);
  if (catchBonus > 0) bonusPills.push(`+${catchBonus} pt Capture`);
  if (shinyBonus > 1) bonusPills.push(`×${shinyBonus.toFixed(2)} Shiny`);

  // Filter chips
  const famKeys = Object.keys(ACHIEVEMENT_FAMILIES);
  const filterChips = [
    `<button class="hbtn pw-ach-filter-chip${_activeFamilyFilter === 'all' ? ' active' : ''}" data-action="legacy-call" data-call="setAchievementFamilyFilter" data-call-args="'all'">${lang === 'en' ? 'All' : 'Tous'}</button>`,
  ];
  for (const fk of famKeys) {
    const f = ACHIEVEMENT_FAMILIES[fk];
    const isAct = _activeFamilyFilter === fk;
    const fName = lang === 'en' ? f.name_en : f.name_fr;
    filterChips.push(
      `<button class="hbtn pw-ach-filter-chip${isAct ? ' active' : ''}" data-action="legacy-call" data-call="setAchievementFamilyFilter" data-call-args="'${f.id}'">${getIconHtml(f.icon, 14)} ${esc(fName)}</button>`
    );
  }

  // Achievements list
  const list =
    _activeFamilyFilter === 'all' ? ACHIEVEMENTS : getAchievementsByFamily(_activeFamilyFilter);

  const cardsHtml = list
    .map((ach) => {
      const prog = getAchievementProgress(ach, G);
      const name = lang === 'en' ? ach.name_en : ach.name_fr;
      const desc = lang === 'en' ? ach.desc_en : ach.desc_fr;
      const fDef = ACHIEVEMENT_FAMILIES[ach.family] || {};
      const tierInfo = getAchievementTierInfo(prog.currentTier, ach.tiers.length);

      let bonusText = '';
      if (ach.bonus) {
        const tierForBonus = prog.currentTier >= 0 ? prog.currentTier : 0;
        const val = ach.bonus.values[tierForBonus];
        const template = lang === 'en' ? ach.bonus.label_en : ach.bonus.label_fr;
        bonusText = template.replace('{v}', val);
      }

      const tierBadges = ach.tiers
        .map((tVal, tIdx) => {
          const isUnlocked = prog.currentTier >= tIdx;
          return `<span class="pw-tier-dot ${isUnlocked ? 'unlocked' : 'locked'}" title="Palier ${tIdx + 1} : ${tVal}"></span>`;
        })
        .join('');

      const rankBadge =
        prog.currentTier >= 0
          ? `<span class="pw-rank-chip ${tierInfo.cls}">${lang === 'en' ? tierInfo.labelEn : tierInfo.labelFr}</span>`
          : `<span class="pw-rank-chip rank-none" style="background:rgba(255,255,255,0.06);color:var(--light2);">${lang === 'en' ? 'Locked' : 'Non débloqué'}</span>`;

      const statusBadge = prog.isCompleted
        ? `<span class="pw-badge pw-badge-success">${lang === 'en' ? 'Completed' : 'Terminé'}</span>`
        : prog.currentTier >= 0
          ? `<span class="pw-badge pw-badge-info">P.${prog.currentTier + 1}/${ach.tiers.length}</span>`
          : `<span class="pw-badge pw-badge-muted">${lang === 'en' ? 'In progress' : 'En cours'}</span>`;

      return `
      <div class="pw-card pw-ach-card ${prog.isCompleted ? 'is-completed' : ''}">
        <div class="pw-ach-card-header">
          <div class="pw-ach-card-title-group">
            <span class="pw-ach-icon">${getIconHtml(fDef.icon || 'trophy', 20)}</span>
            <div>
              <div class="pw-ach-title">${esc(name)}</div>
              <div class="pw-ach-desc">${esc(desc)}</div>
            </div>
          </div>
          <div class="pw-ach-status">${rankBadge} ${statusBadge}</div>
        </div>

        <div class="pw-ach-progress-row">
          <div class="pw-ach-progress-bar-bg">
            <div class="pw-ach-progress-bar-fill" style="width: ${prog.progressPct}%;"></div>
          </div>
          <div class="pw-ach-progress-text">${prog.metricValue} / ${prog.nextTarget} (${prog.progressPct}%)</div>
        </div>

        <div class="pw-ach-card-footer" style="display:flex;align-items:center;gap:6px;">
          <div class="pw-ach-tiers-dots">${tierBadges}</div>
          ${bonusText ? `<div class="pw-ach-bonus-pill">${esc(bonusText)}</div>` : ''}
          <button type="button" class="hbtn pw-ach-pin-btn${G.achievements?.pinned === ach.id ? ' active' : ''}" style="margin-left:auto;font-size:10px;padding:2px 8px;" data-action="legacy-call-stop" data-call="togglePinAchievement" data-call-args="'${ach.id}'">${G.achievements?.pinned === ach.id ? '📌 ' + (lang === 'en' ? 'Pinned' : 'Épinglé') : lang === 'en' ? 'Pin' : 'Épingler'}</button>
        </div>
      </div>
    `;
    })
    .join('');

  const html = `
    <div class="pw-ach-container">
      <div class="pw-ach-summary-banner">
        <div class="pw-ach-summary-metric">
          <div class="pw-ach-summary-value">${totalTiers} / ${maxTiers}</div>
          <div class="pw-ach-summary-label">${lang === 'en' ? 'Tiers unlocked' : 'Paliers débloqués'} (${totalPct}%)</div>
        </div>
        <div class="pw-ach-summary-bonuses">
          <div class="pw-ach-bonuses-title">${lang === 'en' ? 'Active Multipliers' : 'Bonus Permanents Actifs'} :</div>
          <div class="pw-ach-bonuses-tags">
            ${bonusPills.length ? bonusPills.map((b) => `<span class="pw-ach-tag">${esc(b)}</span>`).join('') : `<span class="pw-light2">${lang === 'en' ? 'None yet' : 'Aucun pour le moment'}</span>`}
          </div>
        </div>
      </div>

      <div class="pw-ach-filter-bar">
        ${filterChips.join('')}
      </div>

      <div class="pw-ach-grid">
        ${cardsHtml || `<div class="pw-empty-state-md">${lang === 'en' ? 'No achievements found' : 'Aucun succès dans cette catégorie'}</div>`}
      </div>
    </div>
  `;

  if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe === 'function') {
    globalThis._pwSetHtmlSafe(container, html);
  }
}

export function getAchievementTierInfo(tierIdx, maxTiers = 4) {
  const ranks = [
    { cls: 'rank-bronze', labelFr: 'Bronze', labelEn: 'Bronze' },
    { cls: 'rank-silver', labelFr: 'Argent', labelEn: 'Silver' },
    { cls: 'rank-gold', labelFr: 'Or', labelEn: 'Gold' },
    { cls: 'rank-diamond', labelFr: 'Diamant', labelEn: 'Diamond' },
  ];
  if (tierIdx < 0) return { cls: 'rank-none', labelFr: 'Non débloqué', labelEn: 'Locked' };
  const idx = Math.min(tierIdx, ranks.length - 1);
  return ranks[idx] || ranks[0];
}

export function renderAchievementsTrackerWindow() {
  if (typeof document === 'undefined') return;
  const body = document.getElementById('achievements-window-body');
  if (!body) return;
  const G = globalThis.G || {};
  ensureAchievementsState(G);
  const lang = G.lang === 'en' ? 'en' : 'fr';

  let pinnedId = G.achievements?.pinned || 'dex_kanto';
  const pinnedAch = ACHIEVEMENTS.find((a) => a.id === pinnedId) || ACHIEVEMENTS[0];
  if (!pinnedAch) {
    globalThis._pwSetHtmlSafe(
      body,
      `<div style="padding:10px;font-size:11px;color:var(--light1);text-align:center;">${lang === 'en' ? 'No pinned achievement' : 'Aucun succès épinglé'}</div>`
    );
    return;
  }

  const prog = getAchievementProgress(pinnedAch, G);
  const name = lang === 'en' ? pinnedAch.name_en : pinnedAch.name_fr;
  const desc = lang === 'en' ? pinnedAch.desc_en : pinnedAch.desc_fr;
  const fDef = ACHIEVEMENT_FAMILIES[pinnedAch.family] || {};
  const tierInfo = getAchievementTierInfo(prog.currentTier, pinnedAch.tiers.length);

  const html = `
    <div class="pw-ach-tracker-card" data-action="open-fullscreen-panel" data-panel="achievements" role="button" tabindex="0" title="${lang === 'en' ? 'Click to open Achievements' : 'Cliquer pour ouvrir les Succès'}" style="padding:8px 10px;display:flex;flex-direction:column;gap:6px;cursor:pointer;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
        <div style="display:flex;align-items:center;gap:6px;font-weight:bold;font-size:12px;">
          <span>${getIconHtml(fDef.icon || 'star', 16)}</span>
          <span>${esc(name)}</span>
        </div>
        <span class="pw-rank-chip ${tierInfo.cls}" style="font-size:9px;padding:2px 6px;border-radius:4px;font-weight:bold;">${lang === 'en' ? tierInfo.labelEn : tierInfo.labelFr}</span>
      </div>
      <div style="font-size:11px;color:var(--light2);line-height:1.25;margin:2px 0;">${esc(desc)}</div>
      <div class="pw-ach-progress-row" style="margin:2px 0;">
        <div class="pw-ach-progress-bar-bg" style="height:8px;background:rgba(255,255,255,0.12);border-radius:4px;overflow:hidden;flex:1;">
          <div class="pw-ach-progress-bar-fill" style="width:${prog.progressPct}%;height:100%;background:var(--yellow,#f2d94e);border-radius:4px;transition:width .2s ease;"></div>
        </div>
        <div style="font-size:11px;font-weight:bold;color:var(--light1);margin-top:4px;display:flex;justify-content:space-between;align-items:center;">
          <span>${lang === 'en' ? 'Target' : 'Objectif'} : <strong style="color:var(--light2);">${prog.metricValue} / ${prog.nextTarget}</strong></span>
          <span style="color:var(--yellow,#f2d94e);font-size:11px;">${prog.progressPct}%</span>
        </div>
      </div>
    </div>
  `;

  globalThis._pwSetHtmlSafe(body, html);
}

export function togglePinAchievement(achId) {
  const G = globalThis.G || {};
  ensureAchievementsState(G);
  if (G.achievements.pinned === achId) {
    G.achievements.pinned = null;
  } else {
    G.achievements.pinned = achId;
  }
  renderAchievementsTrackerWindow();
  const fsPanel = document.getElementById('fs-panel-content');
  if (fsPanel) renderAchievementsPanel(fsPanel);
}

// Exposure
if (typeof globalThis !== 'undefined') {
  globalThis.renderAchievementsPanel = renderAchievementsPanel;
  globalThis.setAchievementFamilyFilter = setAchievementFamilyFilter;
  globalThis.getAchievementTierInfo = getAchievementTierInfo;
  globalThis.renderAchievementsTrackerWindow = renderAchievementsTrackerWindow;
  globalThis.togglePinAchievement = togglePinAchievement;
}

if (typeof PokeActions !== 'undefined' && PokeActions) {
  try {
    PokeActions.register('setAchievementFamilyFilter', setAchievementFamilyFilter);
    PokeActions.register('togglePinAchievement', togglePinAchievement);
  } catch (_) {}
}
