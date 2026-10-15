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
    `<button class="hbtn usm-subtab-btn${_activeFamilyFilter === 'all' ? ' active' : ''}" data-action="legacy-call" data-call="setAchievementFamilyFilter" data-call-args="'all'">${lang === 'en' ? 'All' : 'Tous'}</button>`,
  ];
  for (const fk of famKeys) {
    const f = ACHIEVEMENT_FAMILIES[fk];
    const isAct = _activeFamilyFilter === fk;
    const fName = lang === 'en' ? f.name_en : f.name_fr;
    filterChips.push(
      `<button class="hbtn usm-subtab-btn${isAct ? ' active' : ''}" data-action="legacy-call" data-call="setAchievementFamilyFilter" data-call-args="'${f.id}'">${getIconHtml(f.icon, 14)} ${esc(fName)}</button>`
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
          <div class="pw-ach-status">${statusBadge}</div>
        </div>

        <div class="pw-ach-progress-row">
          <div class="pw-ach-progress-bar-bg">
            <div class="pw-ach-progress-bar-fill" style="width: ${prog.progressPct}%;"></div>
          </div>
          <div class="pw-ach-progress-text">${prog.metricValue} / ${prog.nextTarget} (${prog.progressPct}%)</div>
        </div>

        <div class="pw-ach-card-footer">
          <div class="pw-ach-tiers-dots">${tierBadges}</div>
          ${bonusText ? `<div class="pw-ach-bonus-pill">${esc(bonusText)}</div>` : ''}
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

// Exposure
if (typeof globalThis !== 'undefined') {
  globalThis.renderAchievementsPanel = renderAchievementsPanel;
  globalThis.setAchievementFamilyFilter = setAchievementFamilyFilter;
}

if (typeof PokeActions !== 'undefined' && PokeActions) {
  try {
    PokeActions.register('setAchievementFamilyFilter', setAchievementFamilyFilter);
  } catch (_) {}
}
