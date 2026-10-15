// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
/**
 * PokeWorld UI — Pokemon market panel (screen adapter)
 *
 * Même UX que la boutique : on CLIQUE un Pokémon pour le sélectionner, puis
 * la barre du bas (quantité + Acheter, prix en Points de quête) achète.
 * Le stock et les prix viennent du composant ECS ShopStock.
 */
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) {
    if (typeof pwSetHtml === 'function') pwSetHtml(el, html);
    else el.innerHTML = html;
  };
}

// ── État de sélection (UX boutique) ────────────────────────────────────────
let _marketSelected = null;
let _marketQty = 1;

const MARKET_CSS = `
.pw-market-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;}
.pw-market-row{display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 8px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);cursor:pointer;text-align:center;}
.pw-market-row:hover{background:rgba(255,255,255,.09);border-color:rgba(255,255,255,.22);}
.pw-market-row.selected{box-shadow:0 0 0 2px var(--pw-accent-color,#FFA500) inset;background:rgba(255,165,0,.12);}
.pw-market-row .pw-flex-1{width:100%;display:flex;flex-direction:column;align-items:center;gap:2px;}
.pw-market-orb{position:relative;}
/* !important + sélecteur renforcé : la règle globale (classe .pw-manage-orb
   sur les images) force position:relative !important, ce qui écraserait
   la position absolue de la balle sans ce sélecteur plus spécifique. */
.pw-market-orb img.pw-market-ball{position:absolute !important;right:2px;bottom:2px;width:20px;height:20px;image-rendering:pixelated;filter:drop-shadow(0 1px 2px rgba(0,0,0,.5));}
.pw-market-price{margin-top:2px;}
.pw-market-footer{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:10px;padding:10px;border-radius:var(--pw-radius-md,8px);background:var(--pw-bg-header,#1C1A17);border:1px solid var(--pw-border-color,#4A3E31);}
.pw-market-footer .pw-shop-qty{width:72px;min-width:0;min-height:0;background:var(--pw-bg-sprite,#191714);border:1px solid var(--pw-border-color,#4A3E31);border-radius:var(--pw-radius-sm,4px);color:var(--pw-text-primary,#ECDEB7);padding:5px 8px;font-size:13px;}
.pw-market-footer .pw-shop-total{margin-left:auto;display:flex;align-items:center;gap:4px;font-size:13px;font-weight:700;color:var(--pw-text-primary,#ECDEB7);font-variant-numeric:tabular-nums;}
.pw-market-footer .pw-shop-total img{vertical-align:-2px;}
`;
let _marketCss = false;
function _ensureMarketCss() {
  if (_marketCss || typeof document === 'undefined') return;
  const st = document.createElement('style');
  st.id = 'pw-market-css';
  st.textContent = MARKET_CSS;
  document.head.appendChild(st);
  _marketCss = true;
}

function renderMarket(el) {
  const ids = getMarketPokemon();
  _ensureMarketCss();

  const filterBar = document.getElementById('fs-panel-filters');
  if (filterBar) {
    // Le marché se paie en Points de quête : on affiche le PQ (pas les ₽).
    const comps =
      typeof window !== 'undefined' && window.PokeUI && window.PokeUI.components
        ? window.PokeUI.components
        : null;
    if (!comps || typeof comps.moneyRowHTML !== 'function')
      throw new Error('[ui] PokeUI components not loaded (moneyRowHTML)');
    const w = typeof ensureWallet === 'function' ? ensureWallet() : null;
    const pq = w && typeof w.questPoints === 'number' ? w.questPoints : 0;
    filterBar.style.display = 'flex';
    filterBar.style.alignItems = 'center';
    filterBar.style.justifyContent = 'flex-end';
    _pwSetHtmlSafe(
      filterBar,
      comps.moneyRowHTML({
        label: typeof t === 'function' ? t('currency_quest_points') : 'Points de quête',
        amount: formatNumber(pq),
        suffix: '',
        prefixHtml: typeof currencySprite === 'function' ? currencySprite('pq', 14) : '',
      })
    );
  }

  const views =
    typeof window !== 'undefined' && window.PokeUI && window.PokeUI.views
      ? window.PokeUI.views
      : null;
  if (!views || !views.MarketView) throw new Error('[ui] PokeUI views not loaded (MarketView)');
  if (!ids.length) {
    _pwSetHtmlSafe(el, views.MarketView.toHTML({ emptyLabel: t('market_empty'), categories: [] }));
    return;
  }
  const cats = { starter: [], fossil: [], rare: [], other: [] };
  for (const id of ids) {
    if ([1, 4, 7, 152, 155, 158, 252, 255, 258].includes(id)) cats.starter.push(id);
    else if ([138, 139, 140, 141, 142, 345, 347].includes(id)) cats.fossil.push(id);
    else if ([133, 137, 106, 107, 122, 124, 131, 175, 236, 298, 351, 374].includes(id))
      cats.rare.push(id);
    else cats.other.push(id);
  }
  const catLabels = {
    starter: t('market_cat_starter') || 'Starters',
    fossil: t('market_cat_fossil') || 'Fossils',
    rare: t('market_cat_rare') || 'Rare',
    other: t('market_cat_other') || 'Other',
  };
  const model = { emptyLabel: t('market_empty'), categories: [], selectedId: _marketSelected };
  for (const cat of ['starter', 'fossil', 'rare', 'other']) {
    if (!cats[cat].length) continue;
    const cards = [];
    for (const id of cats[cat]) {
      const d = PD[id];
      if (!d) continue;
      const price = typeof pqMarketPrice === 'function' ? pqMarketPrice(id) : 0;
      const owned = speciesOwned(id);
      const seen = G.pokedex[id]?.seen;
      const isShiny = isSpeciesShiny(id);
      cards.push({
        id,
        name: seen ? getPokeName(id) : '???',
        numLabel: `#${id}`,
        typesHtml: `${typeSpan(d[1])}${d[2] ? typeSpan(d[2]) : ''}`,
        priceLabel:
          typeof pqSpriteHtml === 'function' ? pqSpriteHtml(price) : `${formatNumber(price)} PQ`,
        ownedLabel: owned ? t('bought') : null,
        // Indicateur à la PokéClicker : balle vide / normale / dorée (shiny).
        ballSrc: owned
          ? isShiny
            ? 'src/assets/images/pokeball/Pokeball-shiny.svg'
            : 'src/assets/images/pokeball/Pokeball.svg'
          : 'src/assets/images/pokeball/None.svg',
        spriteHtml: spriteImg(id, '', { size: 72, shiny: isShiny }),
      });
    }
    model.categories.push({ key: cat, label: catLabels[cat], cards });
  }
  _pwSetHtmlSafe(el, views.MarketView.toHTML(model) + marketFooterHtml(model));
}

// ── Barre d'achat (quantité + Acheter, prix PQ) ────────────────────────────
function marketFooterHtml(model) {
  const all = [];
  for (const c of model.categories || []) for (const card of c.cards || []) all.push(card);
  const entry = all.find((c) => c.id === _marketSelected) || null;
  if (!entry) return '';
  const qty = Math.max(1, Math.floor(Number(_marketQty) || 1));
  const price = typeof pqMarketPrice === 'function' ? pqMarketPrice(entry.id) : 0;
  const total = price * qty;
  const totalLabel = typeof pqSpriteHtml === 'function' ? pqSpriteHtml(total) : formatNumber(total);
  return (
    '<div class="pw-market-footer">' +
    '<button type="button" class="hbtn" data-action="legacy-call" data-call="marketResetQty" data-call-args="">' +
    (typeof t === 'function' ? t('shop_reset') : 'Reset') +
    '</button>' +
    '<input class="pw-shop-qty" type="number" min="1" value="' +
    qty +
    '" data-shop-qty-input="1" oninput="marketSetQty(this.value)" data-action="stop-propagation">' +
    '<button type="button" class="hbtn" data-action="legacy-call" data-call="marketAddQty" data-call-args="10">+10</button>' +
    '<button type="button" class="hbtn" data-action="legacy-call" data-call="marketAddQty" data-call-args="100">+100</button>' +
    '<button type="button" class="hbtn" data-action="legacy-call" data-call="marketMaxQty" data-call-args="">' +
    (typeof t === 'function' ? t('shop_max') : 'Max') +
    '</button>' +
    '<span class="pw-shop-total">' +
    totalLabel +
    '</span>' +
    '<button type="button" class="hbtn pw-shop-buy" data-action="legacy-call" data-call="buySelectedMarket" data-call-args="">' +
    (typeof t === 'function' ? t('buy_btn') : 'Acheter') +
    '</button>' +
    '</div>'
  );
}

// ── Handlers ───────────────────────────────────────────────────────────────
function _marketEl() {
  return document.getElementById('fs-panel-content') || document.getElementById('tab-content');
}
function selectMarketPokemon(id) {
  _marketSelected = Number(id);
  _marketQty = 1;
  const el = _marketEl();
  if (el) renderMarket(el);
}
function marketResetQty() {
  _marketQty = 1;
  const el = _marketEl();
  if (el) renderMarket(el);
}
function marketSetQty(v) {
  _marketQty = Math.max(1, Math.floor(Number(v) || 1));
  _clampMarketQty();
  const qtyInput = document.querySelector('.pw-market-footer .pw-shop-qty');
  if (qtyInput) qtyInput.value = _marketQty;
  const totalEl = document.querySelector('.pw-market-footer .pw-shop-total');
  if (totalEl && _marketSelected) {
    const price = typeof pqMarketPrice === 'function' ? pqMarketPrice(_marketSelected) : 0;
    const total = price * _marketQty;
    const label = typeof pqSpriteHtml === 'function' ? pqSpriteHtml(total) : formatNumber(total);
    _pwSetHtmlSafe(totalEl, label);
  }
}
function marketAddQty(n) {
  _marketQty =
    Math.max(1, Math.floor(Number(_marketQty) || 1)) + Math.max(0, Math.floor(Number(n) || 0));
  _clampMarketQty();
  const el = _marketEl();
  if (el) renderMarket(el);
}
function marketMaxQty() {
  if (!_marketSelected) {
    try {
      notify(t('shop_not_selected'), 'var(--red)');
    } catch (_) {}
    return;
  }
  const price = typeof pqMarketPrice === 'function' ? pqMarketPrice(_marketSelected) : 0;
  const w = typeof ensureWallet === 'function' ? ensureWallet() : null;
  const bal = w && typeof w.questPoints === 'number' ? w.questPoints : 0;
  _marketQty = price > 0 ? Math.max(1, Math.floor(bal / price)) : 1;
  const el = _marketEl();
  if (el) renderMarket(el);
}
function _clampMarketQty() {
  const price = typeof pqMarketPrice === 'function' ? pqMarketPrice(_marketSelected) : 0;
  const w = typeof ensureWallet === 'function' ? ensureWallet() : null;
  const bal = w && typeof w.questPoints === 'number' ? w.questPoints : 0;
  const max = price > 0 ? Math.max(1, Math.floor(bal / price)) : 1;
  _marketQty = Math.min(Math.max(1, Math.floor(Number(_marketQty) || 1)), max);
}
function buySelectedMarket() {
  if (!_marketSelected) {
    try {
      notify(t('shop_not_selected'), 'var(--red)');
    } catch (_) {}
    return;
  }
  const qty = Math.max(1, Math.floor(Number(_marketQty) || 1));
  if (typeof buyPokemon === 'function') buyPokemon(_marketSelected, qty);
  _marketQty = 1;
  const el = _marketEl();
  if (el) renderMarket(el);
}

if (typeof renderMarket !== 'undefined') {
  if (typeof window !== 'undefined') window.renderMarket = renderMarket;
  if (typeof globalThis !== 'undefined') globalThis.renderMarket = renderMarket;
}
if (typeof selectMarketPokemon !== 'undefined') {
  if (typeof window !== 'undefined') window.selectMarketPokemon = selectMarketPokemon;
  if (typeof globalThis !== 'undefined') globalThis.selectMarketPokemon = selectMarketPokemon;
}
if (typeof marketResetQty !== 'undefined') {
  if (typeof window !== 'undefined') window.marketResetQty = marketResetQty;
  if (typeof globalThis !== 'undefined') globalThis.marketResetQty = marketResetQty;
}
if (typeof marketSetQty !== 'undefined') {
  if (typeof window !== 'undefined') window.marketSetQty = marketSetQty;
  if (typeof globalThis !== 'undefined') globalThis.marketSetQty = marketSetQty;
}
if (typeof marketAddQty !== 'undefined') {
  if (typeof window !== 'undefined') window.marketAddQty = marketAddQty;
  if (typeof globalThis !== 'undefined') globalThis.marketAddQty = marketAddQty;
}
if (typeof marketMaxQty !== 'undefined') {
  if (typeof window !== 'undefined') window.marketMaxQty = marketMaxQty;
  if (typeof globalThis !== 'undefined') globalThis.marketMaxQty = marketMaxQty;
}
if (typeof buySelectedMarket !== 'undefined') {
  if (typeof window !== 'undefined') window.buySelectedMarket = buySelectedMarket;
  if (typeof globalThis !== 'undefined') globalThis.buySelectedMarket = buySelectedMarket;
}

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  renderMarket,
  selectMarketPokemon,
  marketResetQty,
  marketSetQty,
  marketAddQty,
  marketMaxQty,
  buySelectedMarket,
};
