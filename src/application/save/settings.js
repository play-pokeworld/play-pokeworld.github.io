// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// V7-R1 · retours joueurs #8 — accès au mode debug (code / console).
import { isDebugUnlocked, applyDebugAccess, submitDebugCode } from './debug-access.js';
// Storage service (engine boot layer): resolved once, shared through the
// global object — concatenated VM harnesses and all chunks share ONE binding.
if (typeof globalThis !== 'undefined' && !globalThis.safeStorage) {
  globalThis.safeStorage =
    (typeof window !== 'undefined' && window.safeStorage) ||
    (typeof PokeWorldCore !== 'undefined' && PokeWorldCore.storage) ||
    null;
}

// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) {
    if (typeof pwSetHtml === 'function') pwSetHtml(el, html);
    else el.innerHTML = html;
  };
}

// UI overhaul: the settings modal body is rendered from zero by the ECS
// design system (SettingsModalView). This adapter only shapes the model —
// the classic contracts kept by the view are listed in
// src/ui/views/SettingsModalView.js.
function captureAnimationsOn() {
  try {
    const v = G && G.settings && G.settings.captureAnimations;
    return v !== false;
  } catch (_) {
    return true;
  }
}
function buildSettingsModel() {
  const curLang = typeof currentLang === 'function' ? currentLang() : (G && G.lang) || 'fr';
  const curTheme = safeStorage.get('pokeworld_theme') || 'dark';
  return {
    currentLang: curLang,
    currentTheme: curTheme,
    lang: {
      heading: t('lang_title'),
      choices: [
        { label: 'Français', lang: 'fr' },
        { label: 'English', lang: 'en' },
      ],
    },
    theme: {
      heading: t('theme_title'),
      swatches: [
        { label: t('theme_dark'), theme: 'dark' },
        { label: t('theme_light'), theme: 'light' },
        { label: t('theme_gameboy'), theme: 'gameboy' },
        { label: t('theme_fire'), theme: 'fire' },
        { label: t('theme_ocean'), theme: 'ocean' },
        { label: t('theme_forest'), theme: 'forest' },
        { label: t('theme_sakura'), theme: 'sakura' },
        { label: t('theme_midnight'), theme: 'midnight' },
        { label: t('theme_desert'), theme: 'desert' },
        { label: t('theme_contrast'), theme: 'contrast' },
      ],
    },
    // P0 — réglages de combat (animation de capture désactivable).
    combat: {
      heading: t('settings_combat_title'),
      animationsLabel: t('settings_capture_animations'),
      animationsOn: captureAnimationsOn(),
      // P3 · ANI-01 — interrupteur UNIQUE des retours visuels (nombres
      // flottants, secousses, pulsations, barres interpolées).
      uiFxLabel: t('settings_ui_animations'),
      uiFxOn: typeof uiAnimationsOn === 'function' ? uiAnimationsOn() : true,
    },
    // V7-R2 · SND-01 — Son : deux bus (effets / musique), volume + coupure,
    // mémorisés hors sauvegarde (src/core/audio.js).
    // V7-R3c · SND-07 — trois bus (musique / interface / cris), sans texte
    // d'aide : le guide (rubrique « Réglages & son ») explique le reste.
    sound: (function () {
      const ap = typeof globalThis.audioPrefs === 'function' ? globalThis.audioPrefs() : null;
      const vol = (k, dflt) => Math.round((ap && typeof ap[k] === 'number' ? ap[k] : dflt) * 100);
      // V7-R3d · R3d-01 — interrupteur à état lisible (Activé / Coupé) + icône par bus.
      const icon = (name) => (globalThis.getIcon ? globalThis.getIcon(name, 16) : '');
      return {
        heading: t('settings_sound_title'),
        volumeLabel: t('settings_volume'),
        onLabel: t('settings_audio_on'),
        offLabel: t('settings_audio_off'),
        buses: [
          {
            id: 'music',
            label: t('settings_music'),
            iconHtml: icon('music'),
            on: ap ? ap.musicOn : true,
            vol: vol('musicVol', 0.4),
          },
          {
            id: 'sfx',
            label: t('settings_sfx'),
            iconHtml: icon('sound'),
            on: ap ? ap.sfxOn : true,
            vol: vol('sfxVol', 0.8),
          },
          {
            id: 'cries',
            label: t('settings_cries'),
            iconHtml: icon('cry'),
            on: ap ? ap.criesOn !== false : true,
            vol: vol('criesVol', 0.6),
          },
        ],
      };
    })(),
    save: {
      heading: t('save_title'),
      saveLabel: t('save_btn'),
      loadLabel: t('load_btn'),
      exportLabel: t('export_btn'),
      importLabel: t('import_btn'),
      deleteLabel: t('delete_save_btn'),
      deleteWarning: t('delete_save_warning'),
      confirmLabel: t('confirm_delete_btn'),
      cancelLabel: t('cancel_btn'),
    },
    // V7-R1 · retours joueurs #4 — lien communautaire (URL : data/game-config.js).
    community: {
      heading: t('settings_community_title'),
      hint: t('settings_discord_hint'),
      discordLabel: t('discord_join_btn'),
      discordUrl: typeof DISCORD_URL === 'string' ? DISCORD_URL : '',
    },
    // V7-R1 · retours joueurs #8 — mode debug sur code (application/save/debug-access.js).
    advanced: {
      heading: t('settings_advanced_title'),
      codeLabel: t('settings_debug_code_label'),
      codePlaceholder: t('settings_debug_code_placeholder'),
      submitLabel: t('settings_debug_code_submit'),
      debugOn: isDebugUnlocked(),
      debugOnLabel: t('settings_debug_on_label'),
      hideLabel: t('settings_debug_hide_btn'),
    },
    // V7 · OBS-01 — error report (G.diag.errors, last 50).
    diag: (function () {
      const n = typeof getDiagErrors === 'function' ? getDiagErrors().length : 0;
      const max = typeof DIAG_MAX_ERRORS !== 'undefined' ? DIAG_MAX_ERRORS : 50;
      return {
        heading: t('diag_title'),
        count: n,
        countLabel: tr('diag_errors_count', { n, max }),
        copyLabel: t('diag_copy_report'),
        clearLabel: t('diag_clear'),
      };
    })(),
  };
}
// V7 · OBS-01 — Settings → Diagnostic → « Effacer ».
function clearDiagErrorsAndRefresh() {
  try {
    if (typeof clearDiagErrors === 'function') clearDiagErrors();
  } catch (_) {}
  try {
    saveGame();
  } catch (_) {}
  try {
    openSettings();
  } catch (_) {}
}
function toggleCaptureAnimations() {
  if (!G.settings || typeof G.settings !== 'object') G.settings = {};
  G.settings.captureAnimations = !captureAnimationsOn();
  try {
    saveGame();
  } catch (_) {}
  try {
    openSettings();
  } catch (_) {}
}
// V7-R2 · SND-01 — Réglages → Son.
function toggleAudioBus(bus) {
  if (typeof globalThis.audioToggle === 'function') globalThis.audioToggle(bus);
  try {
    openSettings();
  } catch (_) {}
}
// V7-R3c · SND-07 — curseur 0–100 (branché par data-input-call, les attributs
// oninput inline étant neutralisés par le moteur) ; aperçu sonore sur le bus réglé.
function setAudioVolume(bus, value) {
  const pctValue = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  if (typeof globalThis.audioSetVolume === 'function')
    globalThis.audioSetVolume(bus, pctValue, { percent: true });
  const out = document.getElementById('audio-' + bus + '-value');
  if (out) out.textContent = pctValue + ' %';
  // V7-R3d · R3d-01 — remplissage du curseur (partie colorée jusqu'au pouce).
  const range = document.getElementById('audio-' + bus + '-volume');
  if (range && range.style) range.style.setProperty('--pw-fill', pctValue + '%');
  if (bus === 'sfx' && typeof globalThis.audioPlaySfx === 'function')
    globalThis.audioPlaySfx('notify');
  if (bus === 'cries' && typeof globalThis.audioPlayCry === 'function') {
    const g = globalThis.G;
    const first = g && Array.isArray(g.team) && g.team[0] ? g.team[0].id : 25;
    globalThis.audioPlayCry(first);
  }
}
function openSettings() {
  const body = document.getElementById('settings-body');
  const views =
    typeof window !== 'undefined' && window.PokeUI && window.PokeUI.views
      ? window.PokeUI.views
      : null;
  if (body && views && views.SettingsModalView)
    _pwSetHtmlSafe(body, views.SettingsModalView.toHTML(buildSettingsModel()));
  else if (!views || !views.SettingsModalView)
    throw new Error('[ui] PokeUI views not loaded (SettingsModalView)');
  document.getElementById('settings-modal').classList.add('open');
  document.getElementById('delete-row').style.display = 'flex';
  document.getElementById('delete-confirm-row').style.display = 'none';
  const curLang = typeof currentLang === 'function' ? currentLang() : G?.lang || 'fr';
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === curLang);
  });
  document.querySelectorAll('.theme-swatch').forEach((s) => {
    s.classList.toggle(
      'active',
      s.dataset.themeBtn === (safeStorage.get('pokeworld_theme') || 'dark')
    );
  });
  if (typeof updateSaveProfileControls === 'function') updateSaveProfileControls();
  // V7-R1 · #8 — « Entrée » dans le champ Code vaut « Valider ».
  const codeInput = document.getElementById('debug-code-input');
  if (codeInput && !codeInput.dataset.pwEnterBound) {
    codeInput.dataset.pwEnterBound = '1';
    codeInput.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        submitDebugCode();
      }
    });
  }
  // Wave 30 (user): build stamp at the bottom of the modal — any screenshot
  // of the settings now PROVES which build is actually running (stale local
  // copies were the hidden root of several "already fixed" reports).
  if (body && !document.getElementById('pw-build-stamp')) {
    const stamp = document.createElement('div');
    stamp.id = 'pw-build-stamp';
    stamp.className = 'pw-build-stamp';
    stamp.textContent =
      (typeof t === 'function' ? t('settings_version_label') : 'Version') +
      ' ' +
      (window.PW_VERSION || window.PW_BUILD || '?');
    body.appendChild(stamp);
  }
}
function closeSettings() {
  document.getElementById('settings-modal').classList.remove('open');
}
function setTheme(theme) {
  if (theme === 'dark') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
  safeStorage.set('pokeworld_theme', theme);
  document
    .querySelectorAll('.theme-swatch')
    .forEach((s) => s.classList.toggle('active', s.dataset.themeBtn === theme));
}
function applySavedTheme() {
  const theme = safeStorage.get('pokeworld_theme');
  if (theme && theme !== 'dark') document.documentElement.setAttribute('data-theme', theme);
  // V7-R1 · #8 — même chemin de démarrage : le widget debug ne s'affiche que
  // si le joueur l'a déverrouillé (code dans les réglages ou console).
  try {
    applyDebugAccess();
  } catch (_) {}
}
function toggleDebugMenu() {
  const dr = document.getElementById('debug-drawer');
  if (!dr) return;
  dr.style.display = getComputedStyle(dr).display === 'none' ? 'flex' : 'none';
}
function debugGiveMoney() {
  // Décision joueur : +50 000 de CHAQUE devise (₽, JD, PQ, 💎, PC Atoll).
  G.money += 50000;
  try {
    if (typeof gainDungeonTokens === 'function') gainDungeonTokens(50000);
    if (typeof gainQuestPoints === 'function') gainQuestPoints(50000);
    if (typeof gainDiamonds === 'function') gainDiamonds(50000);
    if (G && G.atoll && typeof G.atoll.tokens === 'number') G.atoll.tokens += 50000;
  } catch (_) {}
  updateHeader();
  notify(t('legacy_message_n_50_000_ajout_s'), 'var(--light2)');
}
function debugGiveCandies() {
  addToInventory('rarecandy', 10);
  notify(t('legacy_message_n_10_super_bonbons_ajout_s'), 'var(--accent)');
  showTab('inventory');
}
function debugUnlockBadges() {
  G.badges = ['brock', 'misty', 'surge', 'erika', 'koga', 'sabrina', 'blaine', 'giovanni'];
  updateHeader();
  renderMap();
  notify(t('legacy_message_n_8_badges_d_bloqu_s'), 'var(--blue)');
}
let debugX10Enabled = false;

function toggleBattleSpeedX10() {
  debugX10Enabled = !debugX10Enabled;
  const x10btn = document.querySelector('.speed-x10');
  if (x10btn) x10btn.style.display = debugX10Enabled ? 'inline-block' : 'none';
  const x1btn = document.querySelector('.speed-x1');
  if (x1btn) x1btn.style.display = debugX10Enabled ? 'inline-block' : 'none';
  const toggle = document.getElementById('speed-toggle');
  if (toggle) toggle.style.display = debugX10Enabled ? 'flex' : 'none';
  const body = document.body;
  if (debugX10Enabled) body.classList.add('debug-active');
  else body.classList.remove('debug-active');

  const stateEl = document.getElementById('debug-x10-state');
  const toggleBtn = document.getElementById('debug-x10-toggle');
  if (stateEl) stateEl.textContent = debugX10Enabled ? 'ON' : 'OFF';
  if (toggleBtn) {
    toggleBtn.style.background = debugX10Enabled ? '#94886B' : '#555';
  }
  notify(
    debugX10Enabled ? t('debug_x10_on') : t('debug_x10_off'),
    debugX10Enabled ? 'var(--green)' : 'var(--light1)'
  );
}

function debugFillMine() {
  if (G.mine) G.mine.energy = 100;
  notify(t('legacy_message_n_nergie_de_mine_restaur_e_100'), 'var(--green)');
}

function debugTimeSkipAfk30Minutes() {
  if (typeof debugTimeSkip30Minutes === 'function') debugTimeSkip30Minutes();
  else notify(t('debug_timeskip_unavailable'), 'var(--red)');
}

function debugGiveAllItems() {
  // Décision joueur : une copie de CHAQUE objet (balls → système Poké Balls).
  try {
    const b = typeof ensurePokeballs === 'function' ? ensurePokeballs() : null;
    for (const key in ITEMS) {
      const itm = ITEMS[key];
      if (!itm) continue;
      if (itm.type === 'ball') {
        if (b) b[key] = Math.max(1, (b[key] || 0) + 1);
      } else {
        G.inventory[key] = Math.max(1, (G.inventory[key] || 0) + 1);
      }
    }
  } catch (_) {}
  try {
    saveGame();
  } catch (_) {}
  updateHeader();
  notify(t('debug_all_items'), 'var(--green)');
}

function debugShowAllItems() {
  // Décision joueur : force le dictionnaire à afficher TOUS les objets.
  G._debugShowAllItems = true;
  try {
    if (typeof openFullscreenPanel === 'function') openFullscreenPanel('dictionary');
  } catch (_) {
    try {
      if (typeof renderDictionary === 'function')
        renderDictionary(document.getElementById('fs-panel-content'));
    } catch (_) {}
  }
  notify(t('debug_all_items_shown'), 'var(--blue)');
}

// --- Migrated to ES module, globals exposed ---
if (typeof openSettings !== 'undefined') {
  if (typeof window !== 'undefined') window.openSettings = openSettings;
  if (typeof globalThis !== 'undefined') globalThis.openSettings = openSettings;
}
if (typeof closeSettings !== 'undefined') {
  if (typeof window !== 'undefined') window.closeSettings = closeSettings;
  if (typeof globalThis !== 'undefined') globalThis.closeSettings = closeSettings;
}
if (typeof setTheme !== 'undefined') {
  if (typeof window !== 'undefined') window.setTheme = setTheme;
  if (typeof globalThis !== 'undefined') globalThis.setTheme = setTheme;
}
if (typeof applySavedTheme !== 'undefined') {
  if (typeof window !== 'undefined') window.applySavedTheme = applySavedTheme;
  if (typeof globalThis !== 'undefined') globalThis.applySavedTheme = applySavedTheme;
}
if (typeof toggleDebugMenu !== 'undefined') {
  if (typeof window !== 'undefined') window.toggleDebugMenu = toggleDebugMenu;
  if (typeof globalThis !== 'undefined') globalThis.toggleDebugMenu = toggleDebugMenu;
}
if (typeof debugGiveMoney !== 'undefined') {
  if (typeof window !== 'undefined') window.debugGiveMoney = debugGiveMoney;
  if (typeof globalThis !== 'undefined') globalThis.debugGiveMoney = debugGiveMoney;
}
if (typeof debugGiveCandies !== 'undefined') {
  if (typeof window !== 'undefined') window.debugGiveCandies = debugGiveCandies;
  if (typeof globalThis !== 'undefined') globalThis.debugGiveCandies = debugGiveCandies;
}
if (typeof debugUnlockBadges !== 'undefined') {
  if (typeof window !== 'undefined') window.debugUnlockBadges = debugUnlockBadges;
  if (typeof globalThis !== 'undefined') globalThis.debugUnlockBadges = debugUnlockBadges;
}
if (typeof toggleBattleSpeedX10 !== 'undefined') {
  if (typeof window !== 'undefined') window.toggleBattleSpeedX10 = toggleBattleSpeedX10;
  if (typeof globalThis !== 'undefined') globalThis.toggleBattleSpeedX10 = toggleBattleSpeedX10;
}
if (typeof debugFillMine !== 'undefined') {
  if (typeof window !== 'undefined') window.debugFillMine = debugFillMine;
  if (typeof globalThis !== 'undefined') globalThis.debugFillMine = debugFillMine;
}
if (typeof debugTimeSkipAfk30Minutes !== 'undefined') {
  if (typeof window !== 'undefined') window.debugTimeSkipAfk30Minutes = debugTimeSkipAfk30Minutes;
  if (typeof globalThis !== 'undefined')
    globalThis.debugTimeSkipAfk30Minutes = debugTimeSkipAfk30Minutes;
}
if (typeof debugGiveAllItems !== 'undefined') {
  if (typeof window !== 'undefined') window.debugGiveAllItems = debugGiveAllItems;
  if (typeof globalThis !== 'undefined') globalThis.debugGiveAllItems = debugGiveAllItems;
}
if (typeof debugShowAllItems !== 'undefined') {
  if (typeof window !== 'undefined') window.debugShowAllItems = debugShowAllItems;
  if (typeof globalThis !== 'undefined') globalThis.debugShowAllItems = debugShowAllItems;
}
if (typeof toggleCaptureAnimations !== 'undefined') {
  if (typeof window !== 'undefined') window.toggleCaptureAnimations = toggleCaptureAnimations;
  if (typeof globalThis !== 'undefined')
    globalThis.toggleCaptureAnimations = toggleCaptureAnimations;
}
// V7-R2 · SND-01 — Réglages → Son (surface classique pour legacy-call / oninput).
if (typeof window !== 'undefined')
  Object.assign(window, { toggleAudioBus, setAudioVolume, buildSettingsModel });
if (typeof globalThis !== 'undefined')
  Object.assign(globalThis, { toggleAudioBus, setAudioVolume });
if (typeof clearDiagErrorsAndRefresh !== 'undefined') {
  if (typeof window !== 'undefined') window.clearDiagErrorsAndRefresh = clearDiagErrorsAndRefresh;
  if (typeof globalThis !== 'undefined')
    globalThis.clearDiagErrorsAndRefresh = clearDiagErrorsAndRefresh;
}
if (typeof captureAnimationsOn !== 'undefined') {
  if (typeof window !== 'undefined') window.captureAnimationsOn = captureAnimationsOn;
  if (typeof globalThis !== 'undefined') globalThis.captureAnimationsOn = captureAnimationsOn;
}

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  openSettings,
  closeSettings,
  setTheme,
  applySavedTheme,
  toggleDebugMenu,
  debugGiveMoney,
  debugGiveCandies,
  debugUnlockBadges,
  toggleBattleSpeedX10,
  debugFillMine,
  debugTimeSkipAfk30Minutes,
  debugGiveAllItems,
  debugShowAllItems,
  toggleCaptureAnimations,
  captureAnimationsOn,
  clearDiagErrorsAndRefresh,
  toggleAudioBus,
  setAudioVolume,
};

// Wave 42 — engine-registry absorption: these dispatched actions
// register in the registry (registry-first dispatcher = engine
// indirection instead of the window fallback); the window surface is kept for
// classic cross-module consumers (documented duplicate, T2-B).
if (typeof PokeActions !== 'undefined' && PokeActions) {
  try {
    PokeActions.register('openSettings', openSettings);
  } catch (_) {}
}
if (typeof PokeActions !== 'undefined' && PokeActions) {
  try {
    PokeActions.register('clearDiagErrorsAndRefresh', clearDiagErrorsAndRefresh);
  } catch (_) {}
}
if (typeof PokeActions !== 'undefined' && PokeActions) {
  try {
    PokeActions.register('closeSettings', closeSettings);
  } catch (_) {}
}
if (typeof PokeActions !== 'undefined' && PokeActions) {
  try {
    PokeActions.register('setTheme', setTheme);
  } catch (_) {}
}
if (typeof PokeActions !== 'undefined' && PokeActions) {
  try {
    PokeActions.register('debugFillMine', debugFillMine);
  } catch (_) {}
}
if (typeof PokeActions !== 'undefined' && PokeActions) {
  try {
    PokeActions.register('debugGiveAllItems', debugGiveAllItems);
  } catch (_) {}
}
if (typeof PokeActions !== 'undefined' && PokeActions) {
  try {
    PokeActions.register('debugShowAllItems', debugShowAllItems);
  } catch (_) {}
}
if (typeof PokeActions !== 'undefined' && PokeActions) {
  try {
    PokeActions.register('debugGiveCandies', debugGiveCandies);
  } catch (_) {}
}
if (typeof PokeActions !== 'undefined' && PokeActions) {
  try {
    PokeActions.register('debugGiveMoney', debugGiveMoney);
  } catch (_) {}
}
if (typeof PokeActions !== 'undefined' && PokeActions) {
  try {
    PokeActions.register('debugTimeSkipAfk30Minutes', debugTimeSkipAfk30Minutes);
  } catch (_) {}
}
if (typeof PokeActions !== 'undefined' && PokeActions) {
  try {
    PokeActions.register('debugUnlockBadges', debugUnlockBadges);
  } catch (_) {}
}
if (typeof PokeActions !== 'undefined' && PokeActions) {
  try {
    PokeActions.register('toggleBattleSpeedX10', toggleBattleSpeedX10);
  } catch (_) {}
}
