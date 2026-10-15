// PokeWorld — P0 · Fenêtre « Monnaies » (dashboard, bandeau à la PokéClicker)
//
// Bandeau horizontal : chaque monnaie est une colonne (icône au-dessus,
// montant en dessous), avec un tooltip « gagnée en… ». Révélation progressive.

// Shared safe-HTML service (canonical sink).
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) {
    if (typeof pwSetHtml === 'function') pwSetHtml(el, html);
    else el.innerHTML = html;
  };
}

const WINDOW_CSS = `
.pw-currency-panel{overflow:visible;display:flex;flex-wrap:wrap;gap:10px;justify-content:space-around;align-items:flex-start;padding:6px;}
.pw-cur-col{position:relative;overflow:visible;display:flex;flex-direction:column;align-items:center;gap:2px;min-width:56px;}
/* PASSE 28 — ANI-01 : les deltas de gain s'animent ICI, dans la fenêtre
   Monnaies, et nulle part ailleurs. L'hôte est en position absolue sous la
   colonne pour ne jamais pousser la mise en page. */
.pw-cur-fx{position:absolute;top:100%;left:50%;transform:translateX(-50%);height:0;pointer-events:none;z-index:3;}
.pw-cur-ico{width:25px;height:25px;image-rendering:pixelated;}
.pw-cur-amount{font-size:12px;font-weight:700;color:var(--light2,#fff);font-variant-numeric:tabular-nums;}
.pw-cur-name{font-size:10px;color:var(--light3,#9aa);text-align:center;}
.pw-cur-hint{font-size:11px;color:var(--light3,#999);text-align:center;padding:4px;flex-basis:100%;}
.pw-cur-section-title{display:flex;align-items:center;gap:6px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--light3,#999);padding:8px 4px 2px;flex-basis:100%;}
.pw-cur-row{display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:8px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);min-height:30px;width:100%;}
.pw-ball-icon{image-rendering:pixelated;flex-shrink:0;}
.pw-ball-none{color:var(--light3,#999);font-weight:700;}
.pw-ball-shop-controls{display:flex;align-items:center;gap:6px;}
.pw-ball-qty-input{width:64px;background:#1c1a16;border:1px solid rgba(255,255,255,.18);border-radius:6px;color:#ECDEB7;padding:3px 6px;font-size:13px;}
.pw-ball-total{min-width:70px;text-align:right;font-size:13px;font-weight:700;color:var(--light2,#fff);font-variant-numeric:tabular-nums;}
`;
let _winCssInjected = false;
function _ensureWinCss() {
  if (_winCssInjected || typeof document === 'undefined') return;
  const st = document.createElement('style');
  st.id = 'pw-currency-win-css';
  st.textContent = WINDOW_CSS;
  document.head.appendChild(st);
  _winCssInjected = true;
}

// Teinte du delta flottant par monnaie (classes .pw-fx-float--* du moteur FX).
const _FX_KIND = {
  money: 'money',
  dungeonTokens: 'token',
  questPoints: 'xp',
  diamonds: 'frag',
  battlePoints: 'token',
};

function currencyColumns() {
  const w = typeof ensureWallet === 'function' ? ensureWallet() : null;
  if (!w) return [];
  const battlePoints = typeof getBattlePoints === 'function' ? getBattlePoints() : 0;
  return [
    {
      id: 'money',
      labelKey: 'currency_money',
      gainKey: 'currency_money_gain',
      amount: G.money || 0,
      revealed: true,
      icon: 'src/assets/images/currency/money.svg',
    },
    {
      id: 'dungeonTokens',
      labelKey: 'currency_dungeon_tokens',
      gainKey: 'currency_jd_gain',
      amount: w.dungeonTokens,
      revealed: !!w.revealed.dungeonTokens,
      icon: 'src/assets/images/currency/dungeonToken.svg',
    },
    {
      id: 'questPoints',
      labelKey: 'currency_quest_points',
      gainKey: 'currency_pq_gain',
      amount: w.questPoints,
      revealed: !!w.revealed.questPoints,
      icon: 'src/assets/images/currency/questPoint.svg',
    },
    {
      id: 'diamonds',
      labelKey: 'currency_diamonds',
      gainKey: 'currency_diamond_gain',
      amount: w.diamonds,
      // V7-R1c — visible dès que la Mine est ouverte (cf. diamondsDiscoverable).
      revealed:
        typeof globalThis.diamondsDiscoverable === 'function'
          ? !!globalThis.diamondsDiscoverable()
          : !!w.revealed.diamonds,
      icon: 'src/assets/images/currency/diamond.svg',
    },
    {
      id: 'battlePoints',
      labelKey: 'currency_battle_points',
      gainKey: 'currency_pc_gain',
      amount: battlePoints,
      revealed: battlePoints > 0,
      icon: 'src/assets/images/currency/battlePoint.svg',
    },
  ];
}

function renderCurrencyWindow() {
  if (typeof document === 'undefined') return;
  _ensureWinCss();
  const el = document.getElementById('currency-window-body');
  if (!el) return;
  const cols = currencyColumns();
  const shown = cols.filter((c) => c.revealed);

  // PASSE 29 — item 8 : les gains n'étaient PLUS visibles. Cause : cette
  // fonction réécrivait tout le HTML de la fenêtre à chaque rafraîchissement,
  // et elle est appelée deux fois de suite (updateHeader() puis le flush des
  // fenêtres). Le nombre flottant, ajouté juste après la reconstruction,
  // était donc balayé quelques millisecondes plus tard par la suivante —
  // le delta était bien calculé, mais jamais vu.
  // On ne reconstruit désormais le squelette QUE si la liste des monnaies
  // affichées change ; sinon on met à jour les seuls montants. Les hôtes FX
  // survivent aux rafraîchissements, donc l'animation se joue jusqu'au bout.
  const signature = shown.map((c) => c.id).join('|');
  let panel = el.querySelector('.pw-currency-panel');
  if (!panel || panel.dataset.pwSig !== signature) {
    const html = shown
      .map(
        (c) =>
          '<div class="pw-cur-col" data-cur="' +
          c.id +
          '" title="' +
          (typeof t === 'function' ? t(c.labelKey) + ' — ' + t(c.gainKey) : c.id) +
          '">' +
          '<img class="pw-cur-ico" src="' +
          c.icon +
          '" alt="">' +
          '<span class="pw-cur-amount">' +
          formatNumber(Number(c.amount)) +
          '</span>' +
          '<span class="pw-cur-name">' +
          (typeof t === 'function' ? t(c.labelKey) : c.id) +
          '</span>' +
          '<span class="pw-cur-fx" id="pw-cur-fx-' +
          c.id +
          '" aria-hidden="true"></span>' +
          '</div>'
      )
      .join('');
    _pwSetHtmlSafe(el, '<div class="pw-currency-panel">' + html + '</div>');
    panel = el.querySelector('.pw-currency-panel');
    if (panel) panel.dataset.pwSig = signature;
  } else {
    for (const c of shown) {
      const col = panel.querySelector('.pw-cur-col[data-cur="' + c.id + '"]');
      if (!col) continue;
      const amt = col.querySelector('.pw-cur-amount');
      const txt = formatNumber(Number(c.amount));
      if (amt && amt.textContent !== txt) amt.textContent = txt;
    }
  }

  // Les gains s'annoncent dans la fenêtre Monnaies, et nulle part ailleurs.
  // reportCurrency() amorce silencieusement au premier passage : aucun faux
  // « + » à l'ouverture de la fenêtre.
  if (typeof reportCurrency === 'function') {
    for (const c of shown) {
      try {
        reportCurrency('cur-' + c.id, Number(c.amount) || 0, {
          host: document.getElementById('pw-cur-fx-' + c.id),
          suffix: c.id === 'money' ? ' \u20BD' : '',
          kind: _FX_KIND[c.id] || 'money',
        });
      } catch (_) {}
    }
  }
}

// --- Surface classique -----------------------------------------------------------------
if (typeof window !== 'undefined') {
  window.currencyColumns = currencyColumns;
  window.renderCurrencyWindow = renderCurrencyWindow;
  window.ensureCurrencyWindowCss = _ensureWinCss;
}
if (typeof globalThis !== 'undefined') {
  globalThis.currencyColumns = currencyColumns;
  globalThis.renderCurrencyWindow = renderCurrencyWindow;
  globalThis.ensureCurrencyWindowCss = _ensureWinCss;
}

export { currencyColumns, renderCurrencyWindow, _ensureWinCss };
