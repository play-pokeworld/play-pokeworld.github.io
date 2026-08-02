// ============================================================================
// BASE SECRÈTE — BOÎTES DE DIALOGUE DE VISITE (passe 51)
// ----------------------------------------------------------------------------
// Deux retours utilisateur :
//   · « il faudrait un menu quand on clique sur le PNJ car on ne voit jamais
//     sa phrase de rencontre, et on devrait pouvoir choisir de le combattre
//     ou non » → baseDialogNpc() : portrait + réplique d'accueil + choix
//     « Combattre » / « Passer son chemin ».
//   · « le PC : pouvoir cliquer dessus et afficher un panneau dont on se
//     servira plus tard, donc vide pour l'instant » → baseDialogPc() : cadre
//     propre, en-tête, zone de contenu réservée aux futures fonctions.
//
// Les deux réutilisent la modale générique #poke-modal (même gabarit que
// l'éditeur de PNJ et l'éditeur de presets) : aucun nouveau conteneur à
// déclarer dans index.html, et la fermeture suit les conventions du jeu.
// ============================================================================

var _pwSetHtmlSafe = _pwSetHtmlSafe || function (el, html) {
  if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html;
};

const _baseDialog = { kind: null, battle: null };

function _bdEsc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function _bdT(k, p) {
  return (typeof tr === 'function') ? tr(k, p) : ((typeof t === 'function') ? t(k) : k);
}
function _bdPortrait(sprite, px) {
  const url = (typeof baseNpcSpriteUrl === 'function')
    ? baseNpcSpriteUrl(sprite)
    : ('src/assets/images/trainers/profil/' + (sprite || 'trainer-0') + '.png');
  return `<img src="${url}" alt="" data-style="width:auto;height:${px || 64}px;`
    + `image-rendering:pixelated;vertical-align:middle">`;
}

function _bdOpen(html) {
  const box = (typeof ensurePokeModal === 'function') ? ensurePokeModal() : { modal: document.getElementById('poke-modal'), inner: document.getElementById('poke-modal-inner') };
  const modal = box.modal;
  const inner = box.inner;
  if (!modal || !inner) return false;
  _pwSetHtmlSafe(inner, html);
  window._pwPokeSheet = null;
  if (typeof window.pwModalInfo === 'function') window.pwModalInfo(false);
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

// ——— PNJ : réplique d'accueil + choix de combattre ————————————————————————
// res = résultat de baseVisitInteract (type 'npc_battle' | 'npc_talked' |
// 'npc_idle'). On affiche TOUJOURS la phrase de rencontre : c'est ce qui
// manquait, le combat se lançait sans qu'on la lise.
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
  const team = (npc.team || []).map((p) => {
    const spr = (typeof spriteImg === 'function')
      ? spriteImg(p.id, null, { size: 28, shiny: !!p.shiny }) : '';
    const nm = (typeof getPokeName === 'function') ? getPokeName(p.id) : ('#' + p.id);
    return `<span class="preset-chip" title="${_bdEsc(nm + ' Nv.' + p.level)}">${spr}</span>`;
  }).join('');

  return _bdOpen(
    `<div class="modal-title"><div class="pw-row"><span class="pw-info-icon">${_bdPortrait(npc.sprite, 28)}</span>`
    + `<div class="pw-info-head-text"><div class="pw-info-name">${_bdEsc(npc.name)}</div>`
    + `<div class="pw-text-sm pw-light1">${_bdT('base.dlg.npc_sub')}</div></div></div>`
    + `<span class="modal-close" data-action="legacy-call" data-call="closeBaseDialog" data-call-args=""></span></div>`
    + `<div class="base-dlg-body">`
    + `<div class="base-dlg-portrait">${_bdPortrait(npc.sprite, 96)}</div>`
    + `<div class="base-dlg-speech">${_bdEsc(line)}</div>`
    + `</div>`
    + (team ? `<div class="pw-row base-dlg-team">${team}</div>` : '')
    + `<div class="pw-btn-group">`
    + (canFight
      ? `<button class="hbtn" data-action="legacy-call" data-call="baseDialogNpcFight" data-call-args="">${_bdT('base.dlg.fight')}</button>` : '')
    + `<button class="hbtn pw-btn-cancel" data-action="legacy-call" data-call="closeBaseDialog" data-call-args="">`
    + `${_bdT(canFight ? 'base.dlg.decline' : 'base.dlg.close')}</button></div>`);
}

// Accepte le duel : on ferme la boîte PUIS on lance le combat borné.
function baseDialogNpcFight() {
  const spec = _baseDialog.battle;
  closeBaseDialog();
  if (!spec) return false;
  if (typeof notify === 'function') {
    notify(_bdT('base.edit.battle_challenge', { name: spec.npc.name }), 'var(--blue)');
  }
  if (typeof baseEditorLaunchNpcBattle === 'function') baseEditorLaunchNpcBattle(spec);
  return true;
}

// ——— PNJ : PANNEAU DE FIN DE COMBAT (passe 52) ————————————————————————————
// Retour utilisateur : « Je n'ai pas de panneau de fin de combat, il faudrait
// en rajouter un pour voir son message. » La réplique de victoire/défaite du
// PNJ partait uniquement dans le journal de combat — qui se ferme AVEC le
// duel, donc invisible. On rouvre donc une boîte identique à celle de la
// rencontre, avec le portrait, le verdict et la bonne réplique, plus un
// bouton « Revanche » (le PNJ est re-combattable à volonté).
// info = { npc, won, name, sprite, quote }
function baseDialogNpcResult(info) {
  if (!info) return false;
  const npc = info.npc || null;
  const name = info.name || (npc && npc.name) || '';
  const sprite = info.sprite || (npc && npc.sprite) || null;
  const won = !!info.won;   // le VISITEUR a-t-il gagné ?
  _baseDialog.kind = 'npc_result';
  // Revanche possible seulement si on a encore la référence du PNJ ET son
  // équipe (une base visitée en lecture seule garde bien les deux).
  const canRematch = !!(npc && Array.isArray(npc.team) && npc.team.length);
  _baseDialog.battle = canRematch
    ? { npc, battle: { kind: 'base_npc', trainerName: npc.name, intro: npc.msgs && npc.msgs.pre,
      win: npc.msgs && npc.msgs.win, lose: npc.msgs && npc.msgs.lose,
      team: npc.team.map((p) => ({ ...p })) } }
    : null;

  const quote = info.quote || '';
  const verdict = _bdT(won ? 'base.dlg.res_won' : 'base.dlg.res_lost', { name });

  return _bdOpen(
    `<div class="modal-title"><div class="pw-row"><span class="pw-info-icon">${_bdPortrait(sprite, 28)}</span>`
    + `<div class="pw-info-head-text"><div class="pw-info-name">${_bdEsc(name)}</div>`
    + `<div class="pw-text-sm ${won ? 'pw-green' : 'pw-red'}">${verdict}</div></div></div>`
    + `<span class="modal-close" data-action="legacy-call" data-call="closeBaseDialog" data-call-args=""></span></div>`
    + `<div class="base-dlg-body">`
    + `<div class="base-dlg-portrait">${_bdPortrait(sprite, 96)}</div>`
    + `<div class="base-dlg-speech">${_bdEsc(quote || _bdT(won ? 'base.dlg.res_quote_won' : 'base.dlg.res_quote_lost'))}</div>`
    + `</div>`
    + `<div class="pw-btn-group">`
    + (canRematch
      ? `<button class="hbtn" data-action="legacy-call" data-call="baseDialogNpcFight" data-call-args="">${_bdT('base.dlg.rematch')}</button>` : '')
    + `<button class="hbtn pw-btn-cancel" data-action="legacy-call" data-call="closeBaseDialog" data-call-args="">`
    + `${_bdT('base.dlg.close')}</button></div>`);
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

// Rééquilibrage long terme (passe flags ORAS) :
//  - AUCUN bonus shiny (le farming shiny reste une progression naturelle).
//  - Argent / XP plafonnés et progressifs.
//  - Mine : bonus d'énergie modéré.
//  - Or/Platine : bonus de gouttes de route + titre cosmétique.
const ORAS_FLAG_RANKS = [
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
    // shinyBonus toujours 0 après rééquilibrage (conservé pour compat saves/UI)
    shinyBonus: 0,
    mineBonus: Number.isFinite(rank.mineBonus) ? rank.mineBonus : 0,
    dropBonus: Number.isFinite(rank.dropBonus) ? rank.dropBonus : 0,
    eggBonus: Number.isFinite(rank.eggBonus) ? rank.eggBonus : 0,
    desc: getSecretBaseRankDesc(rank)
  };
}

/** Applique le multiplicateur d'argent des drapeaux ORAS à un gain brut. */
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
  // Anti-farm : 1 drapeau / base / 24 h
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
  // uniqueBases = nombre de bases distinctes visitées (info UI)
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

// ——— PC : panneau ORAS de capture de drapeaux et rangs ——————
function getBasePcMessage(st) {
  try {
    const s = st || (typeof baseGetState === 'function' ? baseGetState() : null);
    return (s && s.pcMessage) ? String(s.pcMessage).slice(0, 200) : '';
  } catch(_) { return ''; }
}
function setBasePcMessage(msg) {
  try {
    const st = (typeof baseGetState === 'function') ? baseGetState() : null;
    if (!st) return false;
    st.pcMessage = String(msg || '').slice(0, 200);
    if (typeof saveGame === 'function') saveGame(false);
    if (typeof notify === 'function') notify((typeof t==='function'?t('base.pc.msg_saved'):'Message PC enregistre'), 'var(--green)');
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
  const ed = (typeof baseEditorGet === 'function') ? baseEditorGet() : null;
  const isEditMode = !!(ed && ed.mode === 'edit');
  const isOwnVisit = !!(ed && ed.visitOwn);
  const own = isEditMode || isOwnVisit;
  const ownSt = (typeof baseGetState === 'function') ? baseGetState() : null;
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

  const flagCardHtml = `
    <div class="pw-panel base-flag-card" style="background: rgba(0,0,0,0.35); border: 1px solid var(--pw-border); border-radius: 12px; padding: 14px; margin-top: 8px;">
      <div class="pw-row" style="justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <div>
          <div style="font-weight: 900; font-size: 15px; color: ${rank.color};">🚩 ${getSecretBaseRankLabel(rank)}</div>
          <div style="font-size: 12px; color: #c9bc8a;">${en ? 'Total' : 'Total'} : <b>${count}</b> ${en ? 'flags' : 'drapeaux'}
            ${flags.uniqueBases ? ` · <b>${flags.uniqueBases}</b> ${en ? 'bases' : 'bases'}` : ''}
          </div>
        </div>
        ${own ? `<span class="pw-badge-gold" style="font-size: 11px;">${en ? 'My Secret Base' : 'Ma Base Secrète'}</span>` : ''}
      </div>
      <div style="background: rgba(0,0,0,0.5); border-radius: 6px; height: 10px; overflow: hidden; margin: 8px 0;">
        <div style="background: linear-gradient(90deg, ${rank.color}, #fff6); width: ${progressPct}%; height: 100%; transition: width .3s;"></div>
      </div>
      <div style="font-size: 11.5px; color: #c9bc8a; margin-bottom: 10px;">
        ${nextReq > 0
          ? (en
              ? `Next rank at <b>${nextReq}</b> flags (${count}/${nextReq})`
              : `Prochain rang à <b>${nextReq}</b> drapeaux (${count}/${nextReq})`)
          : `<b>${en ? 'Supreme ORAS rank reached!' : 'Rang Suprême ORAS atteint !'}</b>`}
      </div>
      <div class="base-flag-bonuses" style="font-size: 12px; color: var(--light2); background: rgba(0,0,0,0.25); border-radius: 8px; padding: 10px; margin-bottom: 12px; line-height: 1.55;">
        <div style="font-weight: 800; margin-bottom: 4px; color: ${rank.color};">${en ? 'Active bonuses' : 'Bonus actifs'}</div>
        ${bonusLines.map((l) => `<div>${l}</div>`).join('')}
      </div>
      ${own ? '' : (canCollect ? `
        <button class="hbtn" style="width: 100%; background: linear-gradient(135deg, #e53935, #c62828) !important; color: #fff !important; font-weight: 900; padding: 10px;" data-action="legacy-call" data-call="collectSecretBaseFlag" data-call-args="'${_bdEsc(safeBaseId)}'">🚩 ${en ? 'Take Base Flag (+1)' : 'Prendre le drapeau de la base (+1)'}</button>
      ` : `
        <button class="hbtn disabled" style="width: 100%; opacity: 0.65; cursor: not-allowed; padding: 10px;">🚩 ${cooldownLabel || (en ? "Flag already taken today." : "Drapeau déjà capturé aujourd\u2019hui.")}</button>
      `)}
    </div>`;

  const pcMessageHtml = isEditMode ? `
    <div class="pw-panel" style="background:rgba(83,157,223,0.12);border:1px solid rgba(83,157,223,0.25);border-radius:12px;padding:12px;margin-top:10px;">
      <div style="font-weight:800;margin-bottom:6px;">💬 ${en ? 'PC Message for visitors' : 'Message PC pour visiteurs'}</div>
      <div style="font-size:11px;color:var(--light1);margin-bottom:6px;">${en ? 'This message will be shown to players who take your flag.' : 'Ce message sera affiché aux joueurs qui prennent votre drapeau.'}</div>
      <textarea id="base-pc-msg-input" maxlength="200" placeholder="${en ? 'Welcome to my base! Good luck!' : 'Bienvenue dans ma base ! Bonne visite !'}" style="width:100%;min-height:70px;background:rgba(0,0,0,0.3);border:1px solid rgba(236,222,183,0.2);border-radius:8px;color:var(--light2);padding:8px;resize:vertical;">${_bdEsc(pcMsg)}</textarea>
      <div style="display:flex;gap:6px;margin-top:8px;"><button class="hbtn" data-action="legacy-call" data-call="saveBasePcMessage" data-call-args="">${en ? 'Save message' : 'Enregistrer message'}</button><span style="font-size:11px;color:var(--light1);align-self:center;">${pcMsg.length}/200</span></div>
    </div>` : (pcMsg ? `
    <div class="pw-panel" style="background:rgba(0,0,0,0.25);border:1px solid rgba(236,222,183,0.15);border-radius:12px;padding:12px;margin-top:10px;">
      <div style="font-weight:800;margin-bottom:6px;">💬 ${en ? 'Owner\'s PC Message' : 'Message du propriétaire'}</div>
      <div style="background:rgba(0,0,0,0.3);border-radius:8px;padding:10px;font-style:italic;color:var(--light2);">“${_bdEsc(pcMsg)}”</div>
    </div>` : '');



  const stats = res && res.record
    ? `<div class="pw-row base-dlg-stats" style="margin-top: 8px;">
         <span>${_bdT('base.dlg.pc_visits')} <b>${res.record.visits | 0}</b></span>
         <span>${_bdT('base.dlg.pc_wins')} <b>${res.record.w | 0}</b></span>
         <span>${_bdT('base.dlg.pc_losses')} <b>${res.record.l | 0}</b></span>
       </div>` : '';
  return _bdOpen(
    `<div class="modal-title"><div class="pw-row"><span class="pw-info-icon">🖥️</span>`
    + `<div class="pw-info-head-text"><div class="pw-info-name">${_bdT('base.dlg.pc_title')}</div>`
    + `<div class="pw-text-sm pw-light1">${_bdT(own ? 'base.dlg.pc_own' : 'base.dlg.pc_guest')}</div></div></div>`
    + `<span class="modal-close" data-action="legacy-call" data-call="closeBaseDialog" data-call-args=""></span></div>`
    + stats
    + `<div id="base-pc-panel" class="base-dlg-panel">`
    + flagCardHtml + pcMessageHtml
    + `</div>`
    + `<div class="pw-btn-group">`
    + `<button class="hbtn pw-btn-cancel" data-action="legacy-call" data-call="closeBaseDialog" data-call-args="">${_bdT('base.dlg.close')}</button></div>`);
}

window.baseDialogNpc = baseDialogNpc;
window.baseDialogNpcResult = baseDialogNpcResult;
window.baseDialogNpcFight = baseDialogNpcFight;
window.baseDialogPc = baseDialogPc;
window.closeBaseDialog = closeBaseDialog;
window.ensureSecretBaseFlags = ensureSecretBaseFlags;
window.getSecretBaseFlagRank = getSecretBaseFlagRank;
window.getSecretBaseBonuses = getSecretBaseBonuses;
window.collectSecretBaseFlag = collectSecretBaseFlag;
window.getSecretBaseRankLabel = getSecretBaseRankLabel;
window.getSecretBaseRankDesc = getSecretBaseRankDesc;
window.applySecretBaseMoneyBonus = applySecretBaseMoneyBonus;
window.ORAS_FLAG_RANKS = ORAS_FLAG_RANKS;
window.getBasePcMessage = getBasePcMessage;
window.setBasePcMessage = setBasePcMessage;
window.saveBasePcMessage = saveBasePcMessage;
