// PokeWorld — P0 · Animation de capture (désactivable dans les réglages)
//
// L'animation est ENFANT de la fenêtre de combat (#battle-center-panel),
// positionnée en absolu au CENTRE de la carte du Pokémon adverse.
// Deux phases : 1) ball qui secoue + « Chance de Capture : N% » ;
//                2) résultat « Capturé ! » / « Échec… ».
// Si l'animation est DÉSACTIVÉE, le résultat s'affiche quand même (sans la
// secousse) et bloque le spawn du Pokémon suivant, pour que le joueur voie
// le verdict sans scroller vers le résumé.

// Shared safe-HTML service (canonical sink).
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
}

const CAPTURE_CSS = `
#pw-capture-anim{position:absolute;z-index:1200;pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:6px;transform:translate(-50%,-50%);}
#pw-capture-anim.pw-capture-fixed{position:fixed;}
#pw-capture-anim .pw-ca-ball{width:72px;height:72px;image-rendering:pixelated;filter:drop-shadow(0 4px 6px rgba(0,0,0,.55));animation:pw-ca-shake .7s ease-in-out infinite;}
#pw-capture-anim .pw-ca-label{font-family:inherit;font-size:15px;font-weight:700;background:rgba(24,22,18,.95);padding:6px 16px;border-radius:999px;border:1px solid rgba(255,255,255,.15);}
#pw-capture-anim .pw-ca-rate{font-family:inherit;font-size:12px;font-weight:700;color:var(--light1,#ECDEB7);background:rgba(24,22,18,.92);padding:3px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.12);}
@keyframes pw-ca-shake{0%,100%{transform:rotate(0)}20%{transform:rotate(-24deg)}40%{transform:rotate(22deg)}60%{transform:rotate(-16deg)}80%{transform:rotate(12deg)}}
`;

let _styleInjected = false;
function _ensureStyle() {
  if (_styleInjected || typeof document === 'undefined') return;
  const st = document.createElement('style');
  st.id = 'pw-capture-anim-css';
  st.textContent = CAPTURE_CSS;
  document.head.appendChild(st);
  _styleInjected = true;
}

function captureAnimationsEnabled() {
  try {
    const v = (typeof G !== 'undefined' && G && G.settings && G.settings.captureAnimations);
    return v !== false;
  } catch (_) { return true; }
}

// Durée de base (ms) ajustée à la vitesse de combat : en x2/x3/x10, la
// ball ne doit pas rester affichée aussi longtemps qu'en x1.
function battleSpeedMult() {
  try {
    const spd = (typeof battle !== 'undefined' && battle && battle.speed) ? Number(battle.speed) : 1;
    return (spd > 0) ? spd : 1;
  } catch (_) { return 1; }
}
const BASE_DURATION = 1150;
const BASE_PHASE2 = 700;
function animDurations() {
  const mult = battleSpeedMult();
  const dur = Math.max(300, Math.round(BASE_DURATION / mult));
  const phase2 = Math.max(200, Math.round(BASE_PHASE2 / mult));
  return { dur, phase2 };
}

// ballKey : pokeball|greatball|ultraball|masterball|honorball — success : boolean.
// rate    : taux de capture de la ball (affiché en phase 1).
function playCaptureAnimation(ballKey, success, label, rate) {
  const { dur, phase2 } = animDurations();
  if (typeof document === 'undefined') return;
  const enabled = captureAnimationsEnabled();
  _ensureStyle();

  // Hôte : la fenêtre de combat. Sinon repli (document.body) pour les cas
  // sans fenêtre (tests VM, appels hors combat).
  const panel = document.getElementById('battle-center-panel');
  const host = panel || document.body;

  let root = document.getElementById('pw-capture-anim');
  if (!root) {
    root = document.createElement('div');
    root.id = 'pw-capture-anim';
    host.appendChild(root);
  } else if (root.parentNode !== host) {
    if (root.parentNode) root.remove();
    root = document.createElement('div');
    root.id = 'pw-capture-anim';
    host.appendChild(root);
  }

  // Position = centre de la carte du Pokémon adverse, dans le repère de la
  // fenêtre de combat (coordonnées contenu → suit le scroll avec la carte).
  let left = '50%', top = '40%', fixed = false;
  const row = document.getElementById('battle-team-row');
  if (row) {
    const cards = row.querySelectorAll('.poke-card');
    const card = cards[0];
    if (card && typeof card.getBoundingClientRect === 'function') {
      const c = card.getBoundingClientRect();
      if (panel && typeof panel.getBoundingClientRect === 'function') {
        const p = panel.getBoundingClientRect();
        left = Math.round(c.left + c.width / 2 - p.left + (panel.scrollLeft || 0)) + 'px';
        top = Math.round(c.top + c.height / 2 - p.top + (panel.scrollTop || 0)) + 'px';
      } else {
        left = Math.round(c.left + c.width / 2) + 'px';
        top = Math.round(c.top + c.height / 2) + 'px';
        fixed = true;
      }
    }
  }

  root.style.cssText = 'position:' + (fixed ? 'fixed' : 'absolute')
    + ';left:' + left + ';top:' + top
    + ';transform:translate(-50%,-50%);z-index:1200;pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:6px;';

  const text = label || (success ? (t('ball_catch_success') || 'Capturé !') : (t('ball_catch_fail') || 'Le Pokémon s’est échappé…'));
  const resultColor = success ? 'color:#A7E3A1' : 'color:#E4A0A0';
  const ratePct = (typeof rate === 'number' && isFinite(rate)) ? Math.round(rate) : null;

  // Signale au loop de combat qu'un verdict est en cours (il attend sa fin).
  try { globalThis.__pwCaptureAnimUntil = Date.now() + dur; } catch (_) {}
  clearTimeout(root._t);
  clearTimeout(root._t1);

  if (!enabled) {
    // Animation désactivée : on affiche seulement le verdict (toujours bloquant).
    _pwSetHtmlSafe(root, '<span class="pw-ca-label" style="' + resultColor + '">' + text + '</span>');
    root._t = setTimeout(() => { if (root && root.parentNode) root.remove(); }, dur);
    return;
  }

  const sprite = (typeof ballSpriteUrl === 'function') ? (ballSpriteUrl(ballKey) || ('src/assets/images/items/' + (ballKey || 'pokeball') + '.png')) : ('src/assets/images/items/' + (ballKey || 'pokeball') + '.png');
  const phase1 = '<img class="pw-ca-ball" src="' + sprite + '" alt="">'
    + (ratePct != null
      ? '<span class="pw-ca-rate">' + ((typeof tr === 'function') ? tr('ball_catch_chance', { rate: ratePct }) : ('Chance de Capture : ' + ratePct + '%')) + '</span>'
      : '');
  _pwSetHtmlSafe(root, phase1);
  // Phase 2 (2ᵉ mouvement) : le verdict remplace la chance affichée.
  root._t1 = setTimeout(() => {
    if (root && root.parentNode) {
      _pwSetHtmlSafe(root, '<span class="pw-ca-label" style="' + resultColor + '">' + text + '</span>');
    }
  }, phase2);
  root._t = setTimeout(() => { if (root && root.parentNode) root.remove(); }, dur);
}

if (typeof window !== 'undefined') {
  window.playCaptureAnimation = playCaptureAnimation;
  window.captureAnimationsEnabled = captureAnimationsEnabled;
}
if (typeof globalThis !== 'undefined') {
  globalThis.playCaptureAnimation = playCaptureAnimation;
  globalThis.captureAnimationsEnabled = captureAnimationsEnabled;
}

export { playCaptureAnimation, captureAnimationsEnabled };

