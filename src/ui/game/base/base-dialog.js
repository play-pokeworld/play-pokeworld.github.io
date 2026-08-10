// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// ============================================================================
// Phase 51 — SECRET BASE DIALOGS (NPC + PC)
// ----------------------------------------------------------------------------
// Two dialogs built from user requests:
//   · "you should get a menu when clicking the NPC because you never see
//     whether you can rebattle them or not" → baseDialogNpc(): portrait +
//     encounter line + choices (fight / decline)
//   · "the PC: be able to click it and show a panel that will be filled
//     later, empty for now" → baseDialogPc(): proper frame, header,
//     content zone reserved for future functions.
//
// Both reuse the generic #poke-modal (same shell as the NPC editor and
// the preset editor): no new container to declare in index.html, and
// closing follows the game's conventions.
// ============================================================================
// Wave 43 — lazy cross-module links (P7 regression fix):
// zero static imports (chunks + VM harness isolates frozen); each alias resolves
// AT CALL TIME — engine registry first, then the global surface (VM harness).
const __pwV43Link = (n) => ((typeof PokeActions !== 'undefined' && PokeActions && typeof PokeActions.get === 'function') ? PokeActions.get(n) : null)
  || (typeof globalThis !== 'undefined' ? globalThis[n] : null) || null;
function baseEditorGet(...args) { const f = __pwV43Link('baseEditorGet'); return f ? f(...args) : undefined; }
function baseEditorLaunchNpcBattle(...args) { const f = __pwV43Link('baseEditorLaunchNpcBattle'); return f ? f(...args) : undefined; }
function baseGetState(...args) { const f = __pwV43Link('baseGetState'); return f ? f(...args) : undefined; }
function baseNpcSpriteUrl(...args) { const f = __pwV43Link('baseNpcSpriteUrl'); return f ? f(...args) : undefined; }

// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
}

const _baseDialog = { kind: null, battle: null };

function _bdEsc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function _bdT(k, p) {
  return (typeof tr === 'function') ? tr(k, p) : ((typeof t === 'function') ? t(k) : k);
}
function _bdPortraitUrl(sprite) {
  // Wave 22 (ECS DS): portraits are class-based (.pw-base-portrait is-N,
  // DS2822) — the adapter only resolves the URL, the views build the <img>.
  return (typeof __pwV43Link('baseNpcSpriteUrl') === 'function')
    ? baseNpcSpriteUrl(sprite)
    : ('src/assets/images/trainers/profil/' + (sprite || 'trainer-0') + '.png');
}
function _bdViews() {
  return (typeof window !== 'undefined' && window.PokeUI && window.PokeUI.views) ? window.PokeUI.views : null;
}

function _bdOpen(html) {
  const box = (typeof ensurePokeModal === 'function') ? ensurePokeModal() : { modal: document.getElementById('poke-modal'), inner: document.getElementById('poke-modal-inner') };
  const modal = box.modal;
  const inner = box.inner;
  if (!modal || !inner) return false;
  _pwSetHtmlSafe(inner, html);
  if (typeof window.pwApplyWindowChrome === 'function') window.pwApplyWindowChrome(inner); // wave 30: canonical window chrome
  window._pwPokeSheet = null;
  if (typeof window.pwModalInfo === 'function') window.pwModalInfo(false);
  // Wave 29: clear the STALE management-shell state (the backdrop/Escape
  // closes leave "management-inner" stuck on the shell — a management menu
  // opened before the PC dialog then forced the 16px management padding
  // onto the editor, shrinking its content box by 12px).
  inner.classList.remove('management-inner');
  modal.classList.add('preset-editor-modal');
  modal.classList.add('open');
  try { inner.scrollTop = 0; } catch (_) { /* noop */ }
  return true;
}

function closeBaseDialog() {
  _baseDialog.kind = null;
  _baseDialog.battle = null;
  const modal = document.getElementById('poke-modal');
  if (modal) { modal.classList.remove('open'); modal.classList.remove('preset-editor-modal'); }
  return true;
}

// —────────────────────────────────────────────────────────────────────────
// res = result of baseVisitInteract (type 'npc_battle' | 'npc_talk' |
// 'npc_idle'). The encounter line is always displayed: this is what was
// missing — the battle used to start without reading it.
function baseDialogNpc(res) {
  if (!res || !res.npc) return false;
  const npc = res.npc;
  const canFight = res.type === 'npc_battle' && !!res.battle;
  _baseDialog.kind = 'npc';
  _baseDialog.battle = canFight ? res : null;

  const line = canFight
    ? (npc.msgs && npc.msgs.pre) || _bdT('base.dlg.npc_default')
    : (res.type === 'npc_talked' ? _bdT('base.edit.battle_done', { name: npc.name })
      : _bdT('base.edit.npc_no_team', { name: npc.name }));

  // Wave 22 (ECS DS): rendered from zero by BaseNpcDialogView — this
  // adapter only shapes the (localized) model. Team chips stay trusted
  // DS component HTML (spriteImg). Contracts kept: title/close
  // data-call="closeBaseDialog", fight data-call="baseDialogNpcFight",
  // .base-dlg-body / .base-dlg-speech / .preset-chip.
  const views = _bdViews();
  if (!views || typeof views.BaseNpcDialogView !== 'function') throw new Error('[ui] PokeUI views not loaded (BaseNpcDialogView)');
  const chipOf = (p) => {
    const spr = (typeof spriteImg === 'function')
      ? spriteImg(p.id, null, { size: 28, shiny: !!p.shiny }) : '';
    const nm = (typeof getPokeName === 'function') ? getPokeName(p.id) : ('#' + p.id);
    return `<span class="preset-chip" title="${_bdEsc(nm + ' Nv.' + p.level)}">${spr}</span>`;
  };
  const model = {
    titleIconUrl: _bdPortraitUrl(npc.sprite),
    name: npc.name,
    subText: _bdT('base.dlg.npc_sub'),
    subKind: 'light1',
    portraitUrl: _bdPortraitUrl(npc.sprite),
    speech: line,
    teamChipsHtml: (npc.team || []).map(chipOf),
    primary: canFight ? { label: _bdT('base.dlg.fight'), call: 'baseDialogNpcFight', callArgs: '' } : null,
    secondaryLabel: _bdT(canFight ? 'base.dlg.decline' : 'base.dlg.close'),
  };
  return _bdOpen(views.BaseNpcDialogView.toHTML(model));
}

// Accepting the duel: close the dialog, then launch the bounded battle.
function baseDialogNpcFight() {
  const spec = _baseDialog.battle;
  closeBaseDialog();
  if (!spec) return false;
  if (typeof notify === 'function') {
    notify(_bdT('base.edit.battle_challenge', { name: spec.npc.name }), 'var(--blue)');
  }
  if (typeof __pwV43Link('baseEditorLaunchNpcBattle') === 'function') baseEditorLaunchNpcBattle(spec);
  return true;
}

// Phase 52 — battle-end panel.
// User feedback: "I don't get a battle-end panel, I should see the
// NPC's victory/defeat quote". Before, the NPC's reply only went to the
// battle log — which closes with the duel, so it was invisible. We
// therefore reopen a dialog identical to the encounter one, with the
// portrait, the verdict and the right quote, plus the battle record.
// info = { npc, won, name, sprite, quote }
function baseDialogNpcResult(info) {
  if (!info) return false;
  const npc = info.npc || null;
  const name = info.name || (npc && npc.name) || '';
  const sprite = info.sprite || (npc && npc.sprite) || null;
  const won = !!info.won;   // did the VISITOR win?
  _baseDialog.kind = 'npc_result';
  // Rematch is possible only if we still hold the reference of the NPC and its
  // team (a visited base, read-only, keeps both well).
  const canRematch = !!(npc && Array.isArray(npc.team) && npc.team.length);
  _baseDialog.battle = canRematch
    ? { npc, battle: { kind: 'base_npc', trainerName: npc.name, intro: npc.msgs && npc.msgs.pre,
      win: npc.msgs && npc.msgs.win, lose: npc.msgs && npc.msgs.lose,
      team: npc.team.map((p) => ({ ...p })) } }
    : null;

  const quote = info.quote || '';
  const verdict = _bdT(won ? 'base.dlg.res_won' : 'base.dlg.res_lost', { name });

  // Wave 22 (ECS DS): same BaseNpcDialogView as the encounter — the model
  // carries the verdict tint + the rematch/close actions (contracts kept).
  const views = _bdViews();
  if (!views || typeof views.BaseNpcDialogView !== 'function') throw new Error('[ui] PokeUI views not loaded (BaseNpcDialogView)');
  const model = {
    titleIconUrl: _bdPortraitUrl(sprite),
    name: name,
    subText: verdict,
    subKind: won ? 'green' : 'red',
    portraitUrl: _bdPortraitUrl(sprite),
    speech: quote || _bdT(won ? 'base.dlg.res_quote_won' : 'base.dlg.res_quote_lost'),
    teamChipsHtml: [],
    primary: canRematch ? { label: _bdT('base.dlg.rematch'), call: 'baseDialogNpcFight', callArgs: '' } : null,
    secondaryLabel: _bdT('base.dlg.close'),
  };
  return _bdOpen(views.BaseNpcDialogView.toHTML(model));
}

function ensureSecretBaseFlags() {
  const g = (typeof G !== 'undefined' && G) ? G : null;
  if (!g) return { count: 0, collectedIds: {}, lastRankNotified: 'normal' };
  if (!g.secretBaseFlags || typeof g.secretBaseFlags !== 'object') {
    g.secretBaseFlags = { count: 0, collectedIds: {}, lastRankNotified: 'normal' };
  }
  if (typeof g.secretBaseFlags.count !== 'number') g.secretBaseFlags.count = 0;
  if (!g.secretBaseFlags.collectedIds || typeof g.secretBaseFlags.collectedIds !== 'object') {
    g.secretBaseFlags.collectedIds = {};
  }
  return g.secretBaseFlags;
}

// Phase 56 — ORAS flags: moderate, progressive bonuses.
//  - NO shiny bonus (shiny farming stays a natural progression).
//  - Money / XP capped and progressive.
//  - Mine: moderate energy bonus.
//  - Gold/Platinum: route drop bonus + cosmetic title.
export const ORAS_FLAG_RANKS = [
  {
    id: 'normal', name: 'Drapeau Normal', nameEn: 'Normal Flag',
    req: 0, nextReq: 10,
    desc: 'Rang de base. Explorez les bases secrètes pour collecter des drapeaux.',
    descEn: 'Base rank. Explore secret bases to collect flags.',
    color: '#a0a29f',
    moneyMult: 1.0, xpMult: 1.0, shinyBonus: 0, mineBonus: 0, dropBonus: 0, eggBonus: 0
  },
  {
    id: 'bronze', name: 'Drapeau Bronze', nameEn: 'Bronze Flag',
    req: 10, nextReq: 50,
    desc: '+3 % d\'Argent (butin de combat & quêtes).',
    descEn: '+3% Money (battle loot & quests).',
    color: '#cd7f32',
    moneyMult: 1.03, xpMult: 1.0, shinyBonus: 0, mineBonus: 0, dropBonus: 0, eggBonus: 0
  },
  {
    id: 'silver', name: 'Drapeau Argent', nameEn: 'Silver Flag',
    req: 50, nextReq: 150,
    desc: '+3 % Argent, +3 % XP combat, +3 % Énergie Mine max.',
    descEn: '+3% Money, +3% battle XP, +3% max Mine Energy.',
    color: '#c0c0c0',
    moneyMult: 1.03, xpMult: 1.03, shinyBonus: 0, mineBonus: 3, dropBonus: 0, eggBonus: 0
  },
  {
    id: 'gold', name: 'Drapeau Or', nameEn: 'Gold Flag',
    req: 150, nextReq: 400,
    desc: '+5 % Argent, +5 % XP, +5 % Énergie Mine, +1 % butin de route (total 2 %).',
    descEn: '+5% Money, +5% XP, +5% Mine Energy, +1% route drops (2% total).',
    color: '#ffd700',
    moneyMult: 1.05, xpMult: 1.05, shinyBonus: 0, mineBonus: 5, dropBonus: 1, eggBonus: 0
  },
  {
    id: 'platinum', name: 'Drapeau Platine', nameEn: 'Platinum Flag',
    req: 400, nextReq: 0,
    desc: '+8 % Argent/XP, +8 % Énergie Mine, +2 % butin de route (total 3 % max) & titre Maître des Bases.',
    descEn: '+8% Money/XP, +8% Mine Energy, +2% route drops (3% max) & Secret Base Master title.',
    color: '#e5e4e2',
    moneyMult: 1.08, xpMult: 1.08, shinyBonus: 0, mineBonus: 8, dropBonus: 2, eggBonus: 0
  }
];

function getSecretBaseFlagRank() {
  const flags = ensureSecretBaseFlags();
  const count = flags.count || 0;
  let rank = ORAS_FLAG_RANKS[0];
  for (const r of ORAS_FLAG_RANKS) {
    if (count >= r.req) rank = r;
  }
  return rank || ORAS_FLAG_RANKS[0];
}

function getSecretBaseRankLabel(rank) {
  const r = rank || getSecretBaseFlagRank() || ORAS_FLAG_RANKS[0];
  const en = (typeof G !== 'undefined' && G && G.lang === 'en');
  return (en && r.nameEn) ? r.nameEn : (r.name || 'Drapeau Normal');
}

function getSecretBaseRankDesc(rank) {
  const r = rank || getSecretBaseFlagRank() || ORAS_FLAG_RANKS[0];
  const en = (typeof G !== 'undefined' && G && G.lang === 'en');
  return (en && r.descEn) ? r.descEn : (r.desc || '');
}

function getSecretBaseBonuses() {
  const rank = getSecretBaseFlagRank() || ORAS_FLAG_RANKS[0];
  return {
    rankId: rank.id || 'normal',
    rankName: getSecretBaseRankLabel(rank),
    rankColor: rank.color || '#a0a29f',
    moneyMult: Number.isFinite(rank.moneyMult) ? rank.moneyMult : 1.0,
    xpMult: Number.isFinite(rank.xpMult) ? rank.xpMult : 1.0,
    // shinyBonus always 0 after reequilibrage (conserve for compat saves/UI)
    shinyBonus: 0,
    mineBonus: Number.isFinite(rank.mineBonus) ? rank.mineBonus : 0,
    dropBonus: Number.isFinite(rank.dropBonus) ? rank.dropBonus : 0,
    eggBonus: Number.isFinite(rank.eggBonus) ? rank.eggBonus : 0,
    desc: getSecretBaseRankDesc(rank)
  };
}

/** Applique the multiplicateur of argent of the drapeaux ORAS has has gain brut. */
function applySecretBaseMoneyBonus(amount) {
  const n = Math.max(0, Math.floor(Number(amount) || 0));
  if (!n) return 0;
  const mult = (typeof getSecretBaseBonuses === 'function')
    ? (Number(getSecretBaseBonuses().moneyMult) || 1)
    : 1;
  return Math.max(0, Math.floor(n * mult));
}

function collectSecretBaseFlag(baseId) {
  const flags = ensureSecretBaseFlags();
  const safeId = String(baseId || 'default').replace(/[^a-z0-9_-]+/gi, '_');
  const now = Date.now();
  const lastTime = Number(flags.collectedIds[safeId] || 0);
  // Anti-farm : 1 flag / base / 24 h
  if (now - lastTime < 24 * 3600 * 1000) {
    const remainMs = 24 * 3600 * 1000 - (now - lastTime);
    const remainH = Math.max(1, Math.ceil(remainMs / 3600000));
    if (typeof notify === 'function') {
      const en = G && G.lang === 'en';
      notify(
        en
          ? `🚩 Flag already taken today. Come back in ${remainH}h.`
          : `🚩 Drapeau déjà capturé aujourd'hui. Revenez dans ${remainH} h.`,
        'var(--accent)'
      );
    }
    return false;
  }
  flags.collectedIds[safeId] = now;
  const oldRank = getSecretBaseFlagRank();
  flags.count = (flags.count || 0) + 1;
  // uniqueBases = number of distinct visited bases (UI info)
  flags.uniqueBases = Object.keys(flags.collectedIds).length;
  const newRank = getSecretBaseFlagRank();
  if (newRank.id !== oldRank.id) {
    flags.lastRankNotified = newRank.id;
    if (typeof notify === 'function') {
      notify(
        `🎉 ${getSecretBaseRankLabel(newRank)} — ${flags.count} 🚩 ! ${getSecretBaseRankDesc(newRank)}`,
        'var(--yellow, #ffd54f)'
      );
    }
  } else if (typeof notify === 'function') {
    const en = G && G.lang === 'en';
    notify(
      en
        ? `🚩 +1 Flag! (Total: ${flags.count} — ${getSecretBaseRankLabel(newRank)})`
        : `🚩 +1 Drapeau capturé ! (Total : ${flags.count} — ${getSecretBaseRankLabel(newRank)})`,
      'var(--green)'
    );
  }
  if (typeof saveGame === 'function') saveGame(false);
  if (typeof baseDialogPc === 'function') baseDialogPc();
  return true;
}

// ——— PC : panel ORAS of capture of drapeaux and rangs ——————
function getBasePcMessage(st) {
  try {
    const s = st || (typeof __pwV43Link('baseGetState') === 'function' ? baseGetState() : null);
    return (s && s.pcMessage) ? String(s.pcMessage).slice(0, 200) : '';
  } catch(_) { return ''; }
}
function setBasePcMessage(msg) {
  try {
    const st = (typeof __pwV43Link('baseGetState') === 'function') ? baseGetState() : null;
    if (!st) return false;
    st.pcMessage = String(msg || '').slice(0, 200);
    if (typeof saveGame === 'function') saveGame(false);
    if (typeof notify === 'function') notify(t('base.pc.msg_saved'), 'var(--green)');
    return true;
  } catch(_) { return false; }
}
function saveBasePcMessage() {
  const input = document.getElementById('base-pc-msg-input');
  const msg = input ? input.value : '';
  setBasePcMessage(msg);
  if (typeof baseDialogPc === 'function') baseDialogPc();
}

function baseDialogPc(res) {
  _baseDialog.kind = 'pc';
  const ed = (typeof __pwV43Link('baseEditorGet') === 'function') ? baseEditorGet() : null;
  const isEditMode = !!(ed && ed.mode === 'edit');
  const isOwnVisit = !!(ed && ed.visitOwn);
  const own = isEditMode || isOwnVisit;
  const ownSt = (typeof __pwV43Link('baseGetState') === 'function') ? baseGetState() : null;
  const visitSt = ed && ed.visit && ed.visit.st ? ed.visit.st : null;
  const displaySt = own ? ownSt : (visitSt || ownSt);
  const pcMsg = getBasePcMessage(displaySt);
  const flags = ensureSecretBaseFlags();
  const rank = getSecretBaseFlagRank();
  const bonuses = getSecretBaseBonuses();
  const count = flags.count || 0;
  const nextReq = rank.nextReq;
  const prevReq = rank.req || 0;
  const progressPct = nextReq > 0
    ? Math.min(100, Math.round(((count - prevReq) / Math.max(1, nextReq - prevReq)) * 100))
    : 100;
  const en = (typeof G !== 'undefined' && G && G.lang === 'en');

  const baseId = ed
    ? (ed.visitSig || ((ed.visitName || 'guest') + '_' + (ed.visitLocId || (G && G.location))))
    : 'default_base';
  const safeBaseId = String(baseId).replace(/[^a-z0-9_-]+/gi, '_');
  const lastTime = Number(flags.collectedIds[safeBaseId] || 0);
  const onCooldown = !own && (Date.now() - lastTime < 24 * 3600 * 1000);
  const canCollect = !own && !onCooldown;
  let cooldownLabel = '';
  if (onCooldown) {
    const remainH = Math.max(1, Math.ceil((24 * 3600 * 1000 - (Date.now() - lastTime)) / 3600000));
    cooldownLabel = en
      ? `Flag already taken today. Back in ${remainH}h.`
      : `Drapeau déjà capturé aujourd'hui. Revenez dans ${remainH} h.`;
  }

  const bonusLines = [];
  if (bonuses.moneyMult > 1) {
    bonusLines.push(en
      ? `• Money +${Math.round((bonuses.moneyMult - 1) * 100)}%`
      : `• Argent +${Math.round((bonuses.moneyMult - 1) * 100)} %`);
  }
  if (bonuses.xpMult > 1) {
    bonusLines.push(en
      ? `• Battle XP +${Math.round((bonuses.xpMult - 1) * 100)}%`
      : `• XP combat +${Math.round((bonuses.xpMult - 1) * 100)} %`);
  }
  if (bonuses.mineBonus > 0) {
    bonusLines.push(en
      ? `• Mine energy +${bonuses.mineBonus}%`
      : `• Énergie Mine +${bonuses.mineBonus} %`);
  }
  if (bonuses.dropBonus > 0) {
    bonusLines.push(en
      ? `• Route drops +${bonuses.dropBonus}%`
      : `• Butin de route +${bonuses.dropBonus} %`);
  }
  if (rank.id === 'platinum') {
    bonusLines.push(en ? '• Title: Secret Base Master' : '• Titre : Maître des Bases Secrètes');
  }
  if (!bonusLines.length) {
    bonusLines.push(en ? '• No active bonuses yet' : '• Aucun bonus actif pour l\'instant');
  }
  // Shiny explicitement absent
  bonusLines.push(en
    ? '• No shiny bonus (preserves long-term hunting)'
    : '• Aucun bonus shiny (préserve la chasse long terme)');

  // Wave 22 (ECS DS): rendered from zero by BasePcDialogView — this
  // adapter only shapes the (localized) model. Contracts kept:
  // #base-pc-panel, #base-pc-msg-input (maxlength 200), save
  // data-call="saveBasePcMessage", collect data-call="collectSecretBaseFlag"
  // data-call-args="'id'" (QUOTED). The gradient rank progress bar and the
  // inline red-gradient collect button are replaced by DS2822 tokens; the
  // GREYED-OUT cooldown button becomes an informative line (same rule as
  // the quest cards / wave-21 lock line — dead buttons are not rendered).
  const views = _bdViews();
  if (!views || typeof views.BasePcDialogView !== 'function') throw new Error('[ui] PokeUI views not loaded (BasePcDialogView)');

  const model = {
    title: _bdT('base.dlg.pc_title'),
    subText: _bdT(own ? 'base.dlg.pc_own' : 'base.dlg.pc_guest'),
    stats: (res && res.record) ? {
      visitsLabel: _bdT('base.dlg.pc_visits'), visits: res.record.visits | 0,
      winsLabel: _bdT('base.dlg.pc_wins'), wins: res.record.w | 0,
      lossesLabel: _bdT('base.dlg.pc_losses'), losses: res.record.l | 0,
    } : null,
    flag: {
      rankId: rank.id || 'normal',
      rankLabel: getSecretBaseRankLabel(rank),
      countLabel: 'Total :',
      count: count,
      flagsWord: en ? 'flags' : 'drapeaux',
      uniqueBases: flags.uniqueBases || 0,
      basesWord: 'bases',
      ownBadge: own ? (en ? 'My Secret Base' : 'Ma Base Secrète') : null,
      pct: progressPct,
      next: nextReq > 0
        ? { kind: 'next', label: en ? 'Next rank at' : 'Prochain rang à', req: nextReq, countText: `(${count}/${nextReq})` }
        : { kind: 'supreme', text: en ? 'Supreme ORAS rank reached!' : 'Rang Suprême ORAS atteint !' },
      bonusesTitle: en ? 'Active bonuses' : 'Bonus actifs',
      bonusLines: bonusLines,
      collect: canCollect
        ? { label: en ? '🚩 Take Base Flag (+1)' : '🚩 Prendre le drapeau de la base (+1)', callArgs: `'${safeBaseId}'` }
        : null,
      cooldownText: onCooldown
        ? (cooldownLabel || (en ? 'Flag already taken today.' : 'Drapeau déjà capturé aujourd\u2019hui.'))
        : null,
    },
    pc: isEditMode ? {
      kind: 'edit',
      title: en ? 'PC Message for visitors' : 'Message PC pour visiteurs',
      hint: en ? 'This message will be shown to players who take your flag.' : 'Ce message sera affiché aux joueurs qui prennent votre drapeau.',
      placeholder: en ? 'Welcome to my base! Good luck!' : 'Bienvenue dans ma base ! Bonne visite !',
      value: pcMsg,
      saveLabel: en ? 'Save message' : 'Enregistrer message',
    } : (pcMsg ? {
      kind: 'view',
      title: en ? "Owner's PC Message" : 'Message du propriétaire',
      text: pcMsg,
    } : null),
    closeLabel: _bdT('base.dlg.close'),
  };
  return _bdOpen(views.BasePcDialogView.toHTML(model));
}

if (typeof PokeActions !== 'undefined') { PokeActions.register('baseDialogNpc', baseDialogNpc); } else if (typeof globalThis !== 'undefined') { globalThis.baseDialogNpc = baseDialogNpc; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseDialogNpcResult', baseDialogNpcResult); } else if (typeof globalThis !== 'undefined') { globalThis.baseDialogNpcResult = baseDialogNpcResult; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseDialogNpcFight', baseDialogNpcFight); } else if (typeof globalThis !== 'undefined') { globalThis.baseDialogNpcFight = baseDialogNpcFight; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseDialogPc', baseDialogPc); } else if (typeof globalThis !== 'undefined') { globalThis.baseDialogPc = baseDialogPc; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('closeBaseDialog', closeBaseDialog); } else if (typeof globalThis !== 'undefined') { globalThis.closeBaseDialog = closeBaseDialog; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('ensureSecretBaseFlags', ensureSecretBaseFlags); } else if (typeof globalThis !== 'undefined') { globalThis.ensureSecretBaseFlags = ensureSecretBaseFlags; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('getSecretBaseFlagRank', getSecretBaseFlagRank); } else if (typeof globalThis !== 'undefined') { globalThis.getSecretBaseFlagRank = getSecretBaseFlagRank; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('getSecretBaseBonuses', getSecretBaseBonuses); } else if (typeof globalThis !== 'undefined') { globalThis.getSecretBaseBonuses = getSecretBaseBonuses; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('collectSecretBaseFlag', collectSecretBaseFlag); } else if (typeof globalThis !== 'undefined') { globalThis.collectSecretBaseFlag = collectSecretBaseFlag; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('getSecretBaseRankLabel', getSecretBaseRankLabel); } else if (typeof globalThis !== 'undefined') { globalThis.getSecretBaseRankLabel = getSecretBaseRankLabel; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('getSecretBaseRankDesc', getSecretBaseRankDesc); } else if (typeof globalThis !== 'undefined') { globalThis.getSecretBaseRankDesc = getSecretBaseRankDesc; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('applySecretBaseMoneyBonus', applySecretBaseMoneyBonus); } else if (typeof globalThis !== 'undefined') { globalThis.applySecretBaseMoneyBonus = applySecretBaseMoneyBonus; }
if (typeof globalThis !== 'undefined') globalThis.ORAS_FLAG_RANKS = ORAS_FLAG_RANKS;
if (typeof PokeActions !== 'undefined') { PokeActions.register('getBasePcMessage', getBasePcMessage); } else if (typeof globalThis !== 'undefined') { globalThis.getBasePcMessage = getBasePcMessage; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('setBasePcMessage', setBasePcMessage); } else if (typeof globalThis !== 'undefined') { globalThis.setBasePcMessage = setBasePcMessage; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('saveBasePcMessage', saveBasePcMessage); } else if (typeof globalThis !== 'undefined') { globalThis.saveBasePcMessage = saveBasePcMessage; }

// Wave 43 — grouped export of the registered names (kept for ESM purity;
// inter-module calls go through the lazy __pwV43Link) — bodies unchanged.
export {
  baseDialogNpc,
  baseDialogNpcResult,
  baseDialogNpcFight,
  baseDialogPc,
  closeBaseDialog,
  ensureSecretBaseFlags,
  getSecretBaseFlagRank,
  getSecretBaseBonuses,
  collectSecretBaseFlag,
  getSecretBaseRankLabel,
  getSecretBaseRankDesc,
  applySecretBaseMoneyBonus,
  getBasePcMessage,
  setBasePcMessage,
  saveBasePcMessage,
};
