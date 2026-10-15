// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) {
    if (typeof pwSetHtml === 'function') pwSetHtml(el, html);
    else el.innerHTML = html;
  };
}

// ── État de la boutique façon PokéClicker ──────────────────────────────────
// On CLIQUE sur un objet pour le sélectionner, puis on règle la quantité
// (Reset / +10 / +100 / Max) et on clique « Acheter » en bas.
// Les employés s'achètent par 1 ; la Master Ball se paie en plusieurs monnaies.
let _shopSelected = null; // clé de l'objet sélectionné
let _shopQty = 1; // quantité
let _shopShopId = null; // boutique courante (reset de sélection au changement)
function _shopEl() {
  return document.getElementById('fs-panel-content') || document.getElementById('tab-content');
}

const SHOP_CSS = `
.pw-shop-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;}
.pw-shop-item{display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 8px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);cursor:pointer;user-select:none;}
.pw-shop-item:hover{background:rgba(255,255,255,.09);border-color:rgba(255,255,255,.22);}
.pw-shop-item.selected{background:rgba(148,136,107,.22);border-color:var(--accent,#94886B);box-shadow:0 0 0 1px var(--accent,#94886B) inset;}
.pw-shop-item.soldout{opacity:.45;cursor:default;}
.pw-shop-item .pw-shop-ico{width:42px;height:42px;display:flex;align-items:center;justify-content:center;}
.pw-shop-item .pw-shop-ico img{image-rendering:pixelated;}
.pw-shop-item .pw-shop-name{font-size:12px;color:var(--light1,#ECDEB7);text-align:center;line-height:1.15;min-height:28px;display:flex;align-items:center;justify-content:center;}
.pw-shop-item .pw-shop-price{font-size:11px;color:var(--light2,#fff);font-variant-numeric:tabular-nums;}
.pw-shop-item .pw-shop-price img{vertical-align:-2px;}
.pw-shop-item .pw-shop-stock{font-size:10px;color:var(--light3,#9aa);}
.pw-shop-item .pw-shop-soldout{font-size:10px;color:var(--red,#E4A0A0);font-weight:700;}
.pw-shop-footer{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:10px;padding:10px;border-radius:10px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);}
.pw-shop-footer .pw-shop-qty{width:72px;background:#1c1a16;border:1px solid rgba(255,255,255,.18);border-radius:6px;color:#ECDEB7;padding:5px 8px;font-size:13px;}
.pw-shop-footer .pw-shop-total{margin-left:auto;display:flex;align-items:center;gap:4px;font-size:13px;font-weight:700;color:var(--light1,#ECDEB7);font-variant-numeric:tabular-nums;}
.pw-shop-footer .pw-shop-total img{vertical-align:-2px;}
.pw-shop-buy{font-weight:700;}
.pw-shop-multi{display:flex;gap:6px;flex-wrap:wrap;margin-left:auto;}
.pw-shop-multi .hbtn{display:flex;align-items:center;gap:4px;}
.pw-shop-multi .hbtn img{vertical-align:-2px;}
`;
let _shopCss = false;
function _ensureShopCss() {
  if (_shopCss || typeof document === 'undefined') return;
  const st = document.createElement('style');
  st.id = 'pw-shop-css';
  st.textContent = SHOP_CSS;
  document.head.appendChild(st);
  _shopCss = true;
}

function renderShop(el) {
  const loc = getLocObj(G.location);
  const shopId = loc ? loc.shopId : null;

  // Wave 15 (user feedback): the money row is ALWAYS visible, rendered
  // through the SAME DS MoneyRow component as the market panel.
  const filterBar = document.getElementById('fs-panel-filters');
  if (filterBar) {
    const comps =
      typeof window !== 'undefined' && window.PokeUI && window.PokeUI.components
        ? window.PokeUI.components
        : null;
    if (!comps || typeof comps.moneyRowHTML !== 'function')
      throw new Error('[ui] PokeUI components not loaded (moneyRowHTML)');
    filterBar.style.display = 'flex';
    filterBar.style.alignItems = 'center';
    filterBar.style.justifyContent = 'flex-end';
    _pwSetHtmlSafe(
      filterBar,
      comps.moneyRowHTML({ label: t('money'), amount: formatNumber(G.money) })
    );
  }

  // Wave 16: the panel itself is the rebuilt ECS ShopView — the adapter
  // only shapes the model (localized labels stay HERE).
  const views =
    typeof window !== 'undefined' && window.PokeUI && window.PokeUI.views
      ? window.PokeUI.views
      : null;
  if (!views || !views.ShopView) throw new Error('[ui] PokeUI views not loaded (ShopView)');
  if (!shopId || !SHOPS[shopId]) {
    _pwSetHtmlSafe(el, views.ShopView.toHTML({ state: 'empty', emptyLabel: t('shop_empty') }));
    return;
  }
  if (shopId === 'indigo' && !G.championTitle) {
    _pwSetHtmlSafe(
      el,
      views.ShopView.toHTML({
        state: 'locked',
        locked: { title: t('indigo_shop_locked_title'), desc: t('indigo_shop_locked_desc') },
      })
    );
    return;
  }
  _ensureShopCss();
  // Changement de boutique → on oublie la sélection précédente.
  if (_shopShopId !== shopId) {
    _shopShopId = shopId;
    _shopSelected = null;
    _shopQty = 1;
  }
  const model = shopItemsModel(shopId, loc);
  const grid = shopGridHtml(model);
  _pwSetHtmlSafe(el, grid);
}

// ── Modèle : objets + balls + employés vendus dans cette boutique ──────────
function shopItemsModel(shopId, loc) {
  const shop = SHOPS[shopId];
  // Phase 26: the generated TM/HM stock (canonical by version: gen 1 goes to Kanto,
  // gen 2 + leftovers to Johto) is merged into the shop's base stock.
  const baseItems = shop.items || [];
  const ctcsStock =
    (typeof CTCS_SHOP_STOCK !== 'undefined' && CTCS_SHOP_STOCK && CTCS_SHOP_STOCK[shopId]) || [];
  const stockList = baseItems.concat(ctcsStock.filter((k) => !baseItems.includes(k)));
  const items = [];
  for (const key of stockList) {
    const itm = ITEMS[key];
    if (!itm || !itm.price) continue;
    const owned = G.inventory[key] || 0;
    const capped = !!(itm.type === 'held' || itm.category || itm.buff);
    const full = capped && owned >= 25;
    items.push({
      key,
      kind: 'item',
      name: getItemName(key),
      price: itm.price,
      spriteHtml: itemSpriteHtml(key, 40),
      stockLabel: full ? tr('shop_bag_max', { n: 25 }) : tr('shop_bag_lbl') + ' : ' + owned,
      soldOut: full,
    });
  }
  // P0 — les Poké Balls s'achètent ici, avec déblocage progressif PAR VILLE.
  const badgeReq = loc && typeof loc.badgeReq === 'number' ? loc.badgeReq : 0;
  const ballList = [{ key: 'pokeball', labelKey: 'ball_pokeball', price: 100 }];
  if (badgeReq >= 2) ballList.push({ key: 'greatball', labelKey: 'ball_greatball', price: 500 });
  if (badgeReq >= 5) ballList.push({ key: 'ultraball', labelKey: 'ball_ultraball', price: 2000 });
  if (typeof ensurePokeballs === 'function') ensurePokeballs();
  for (const bl of ballList) {
    const owned = (G.pokeballs && G.pokeballs[bl.key]) || 0;
    items.push({
      key: bl.key,
      kind: 'ball',
      name: typeof t === 'function' ? t(bl.labelKey) : bl.key,
      price: bl.price,
      spriteHtml:
        typeof ballSpriteUrl === 'function'
          ? '<img src="' + ballSpriteUrl(bl.key) + '" alt="" style="width:32px;height:32px;">'
          : '',
      stockLabel: tr('shop_bag_lbl') + ' : ' + formatNumber(owned),
      soldOut: false,
    });
  }
  // Master Ball : PLUSIEURS entrées dans la grille, une par monnaie (₽/JD/PQ/💎),
  // pour acheter en lot comme les autres objets et voir chaque prix d'un coup.
  if (badgeReq >= 8) {
    const mbPrices = typeof masterBallPrices === 'function' ? masterBallPrices() : {};
    const mbOwned = (G.pokeballs && G.pokeballs.masterball) || 0;
    const mbDefs = [
      { cur: 'money', label: typeof t === 'function' ? t('currency_money') : '₽' },
      {
        cur: 'dungeonTokens',
        label: typeof t === 'function' ? t('currency_dungeon_tokens') : 'JD',
      },
      { cur: 'questPoints', label: typeof t === 'function' ? t('currency_quest_points') : 'PQ' },
      { cur: 'diamonds', label: typeof t === 'function' ? t('currency_diamonds') : '💎' },
    ];
    for (const mb of mbDefs) {
      const price = mbPrices[mb.cur];
      if (price == null) continue;
      items.push({
        key: 'masterball_' + mb.cur,
        kind: 'masterball',
        currency: mb.cur,
        price,
        name: (typeof t === 'function' ? t('ball_masterball') : 'Master Ball') + ' · ' + mb.label,
        spriteHtml:
          typeof ballSpriteUrl === 'function'
            ? '<img src="' +
              ballSpriteUrl('masterball') +
              '" alt="" style="width:32px;height:32px;">'
            : '',
        stockLabel: tr('shop_bag_lbl') + ' : ' + formatNumber(mbOwned),
        soldOut: false,
      });
    }
  }
  // Employés : avec les autres objets, achat par 1. Déjà recruté → « Acheté » en rouge.
  if (typeof staffDefsForLocation === 'function' && typeof staffPrice === 'function') {
    const defs = staffDefsForLocation(G.location);
    if (Array.isArray(defs)) {
      if (typeof ensureStaffState === 'function') ensureStaffState();
      for (const def of defs) {
        const owned = !!(G.staff && G.staff.owned && G.staff.owned[def.id]);
        if (owned) {
          items.push({
            key: def.id,
            kind: 'staff',
            name: typeof getStaffName === 'function' ? getStaffName(def.id) : def.id,
            sub: typeof getStaffDesc === 'function' ? getStaffDesc(def.id) : '',
            spriteHtml: typeof staffSpriteImg === 'function' ? staffSpriteImg(def.id, 40) : '',
            stockLabel: '',
            soldOut: true,
            soldOutLabel: typeof t === 'function' ? t('staff_bought_lbl') : 'Acheté',
          });
          continue;
        }
        const hire = staffPrice(def) || { currency: 'money', price: 0 };
        items.push({
          key: def.id,
          kind: 'staff',
          name: typeof getStaffName === 'function' ? getStaffName(def.id) : def.id,
          sub: typeof getStaffDesc === 'function' ? getStaffDesc(def.id) : '',
          currency: hire.currency,
          price: hire.price,
          spriteHtml: typeof staffSpriteImg === 'function' ? staffSpriteImg(def.id, 40) : '',
          stockLabel: '',
          soldOut: false,
        });
      }
    }
  }
  return items;
}

// ── Grille à la PokéClicker (cliquer pour sélectionner) ────────────────────
function shopGridHtml(model) {
  const title =
    '<div class="pw-cur-section-title">' +
    (typeof t === 'function' ? t('shop_items_title') : 'Objets') +
    '</div>';
  const cards = model
    .map((it) => {
      const sel = _shopSelected === it.key;
      let priceLabel;
      if (it.kind === 'staff' || it.kind === 'masterball') {
        priceLabel =
          typeof currencyAmountSpriteHtml === 'function'
            ? currencyAmountSpriteHtml(it.currency, it.price)
            : formatNumber(it.price);
      } else {
        priceLabel =
          typeof moneySpriteHtml === 'function'
            ? moneySpriteHtml(it.price)
            : formatNumber(it.price) + ' ₽';
      }
      const soldLabel =
        it.soldOutLabel || (typeof tr === 'function' ? tr('shop_bag_max', { n: 25 }) : '');
      return (
        '<div class="pw-shop-item' +
        (sel ? ' selected' : '') +
        (it.soldOut ? ' soldout' : '') +
        '"' +
        (it.soldOut
          ? ''
          : ' data-action="legacy-call" data-call="selectShopItem" data-call-args="\'' +
            it.key +
            '\'"') +
        '>' +
        '<div class="pw-shop-ico">' +
        it.spriteHtml +
        '</div>' +
        '<div class="pw-shop-name">' +
        it.name +
        '</div>' +
        '<div class="pw-shop-price">' +
        priceLabel +
        '</div>' +
        (it.soldOut
          ? '<div class="pw-shop-soldout">' + soldLabel + '</div>'
          : '<div class="pw-shop-stock">' + it.stockLabel + '</div>') +
        '</div>'
      );
    })
    .join('');
  return title + '<div class="pw-shop-list">' + cards + '</div>' + shopFooterHtml(model);
}

// Quantité max autorisée pour l'entrée sélectionnée (sac + solde).
function shopMaxAllowed(entry) {
  if (!entry) return 1;
  if (entry.kind === 'staff') return 1;
  if (entry.kind === 'masterball') {
    // Borné par le solde de la monnaie (prix unitaire courant) + plafond 100.
    const w = typeof ensureWallet === 'function' ? ensureWallet() : null;
    let bal = G.money || 0;
    if (entry.currency === 'dungeonTokens') bal = (w && w.dungeonTokens) || 0;
    else if (entry.currency === 'questPoints') bal = (w && w.questPoints) || 0;
    else if (entry.currency === 'diamonds') bal = (w && w.diamonds) || 0;
    const afford = entry.price > 0 ? Math.floor(bal / entry.price) : 1;
    return Math.max(1, Math.min(100, afford));
  }
  let max = 999999999;
  if (entry.price > 0) max = Math.floor((G.money || 0) / entry.price);
  if (entry.kind === 'item') {
    const itm = ITEMS[entry.key];
    const capped = !!(itm && (itm.type === 'held' || itm.category || itm.buff));
    if (capped) {
      const owned = G.inventory[entry.key] || 0;
      max = Math.min(max, Math.max(0, 25 - owned));
    }
  }
  return Math.max(1, max);
}

// ── Pied de boutique : quantité + boutons + Acheter ────────────────────────
function shopFooterHtml(model) {
  const entry = (model || []).find((it) => it.key === _shopSelected) || null;
  if (!entry) return '';
  const qty = Math.max(1, Math.floor(Number(_shopQty) || 1));

  // Employés : achat unique, quantité bloquée à 1.
  if (entry.kind === 'staff') {
    const priceLabel =
      typeof currencyAmountSpriteHtml === 'function'
        ? currencyAmountSpriteHtml(entry.currency, entry.price)
        : formatNumber(entry.price);
    return (
      '<div class="pw-shop-footer">' +
      '<button type="button" class="hbtn" data-action="legacy-call" data-call="shopResetQty" data-call-args="">' +
      (typeof t === 'function' ? t('shop_reset') : 'Reset') +
      '</button>' +
      '<input class="pw-shop-qty" type="number" value="1" disabled>' +
      '<span class="pw-shop-total">' +
      priceLabel +
      '</span>' +
      '<button type="button" class="hbtn pw-shop-buy" data-action="legacy-call" data-call="buySelectedFromShop" data-call-args="">' +
      (typeof t === 'function' ? t('recruit_btn') : 'Recruter') +
      '</button>' +
      '</div>'
    );
  }

  // Objets, balls classiques et Master Ball (par monnaie).
  let total;
  if (entry.kind === 'masterball') {
    total =
      typeof masterBallTotalPrice === 'function'
        ? masterBallTotalPrice(entry.currency, qty)
        : entry.price * qty;
  } else {
    total = entry.price * qty;
  }
  const totalLabel =
    entry.kind === 'masterball'
      ? typeof currencyAmountSpriteHtml === 'function'
        ? currencyAmountSpriteHtml(entry.currency, total)
        : formatNumber(total)
      : typeof moneySpriteHtml === 'function'
        ? moneySpriteHtml(total)
        : formatNumber(total) + ' ₽';
  return (
    '<div class="pw-shop-footer">' +
    '<button type="button" class="hbtn" data-action="legacy-call" data-call="shopResetQty" data-call-args="">' +
    (typeof t === 'function' ? t('shop_reset') : 'Reset') +
    '</button>' +
    '<input class="pw-shop-qty" type="number" min="1" value="' +
    qty +
    '" data-shop-qty-input="1" oninput="shopSetQty(this.value)" data-action="stop-propagation">' +
    '<button type="button" class="hbtn" data-action="legacy-call" data-call="shopAddQty" data-call-args="10">+10</button>' +
    '<button type="button" class="hbtn" data-action="legacy-call" data-call="shopAddQty" data-call-args="100">+100</button>' +
    '<button type="button" class="hbtn" data-action="legacy-call" data-call="shopMaxQty" data-call-args="">' +
    (typeof t === 'function' ? t('shop_max') : 'Max') +
    '</button>' +
    '<span class="pw-shop-total">' +
    totalLabel +
    '</span>' +
    '<button type="button" class="hbtn pw-shop-buy" data-action="legacy-call" data-call="buySelectedFromShop" data-call-args="">' +
    (typeof t === 'function' ? t('buy_btn') : 'Acheter') +
    '</button>' +
    '</div>'
  );
}

// ── Handlers ───────────────────────────────────────────────────────────────
function _shopEntry() {
  const loc = getLocObj(G.location);
  const model = shopItemsModel(loc ? loc.shopId : null, loc);
  return (model || []).find((it) => it.key === _shopSelected) || null;
}
function _clampQty() {
  const entry = _shopEntry();
  if (!entry) {
    _shopQty = 1;
    return;
  }
  _shopQty = Math.min(Math.max(1, Math.floor(Number(_shopQty) || 1)), shopMaxAllowed(entry));
}
function selectShopItem(key) {
  _shopSelected = key;
  _shopQty = 1;
  const el = _shopEl();
  if (el) renderShop(el);
}
function shopResetQty() {
  _shopQty = 1;
  const el = _shopEl();
  if (el) renderShop(el);
}
function shopSetQty(v) {
  _shopQty = Math.max(1, Math.floor(Number(v) || 1));
  _clampQty();
  // Mise à jour EN PLACE (pas de re-render) : garde le focus de la saisie.
  const qtyInput = document.querySelector('.pw-shop-qty');
  if (qtyInput) qtyInput.value = _shopQty;
  const totalEl = document.querySelector('.pw-shop-total');
  if (totalEl && _shopSelected) {
    const entry = _shopEntry();
    if (entry) {
      const total =
        entry.kind === 'masterball'
          ? typeof masterBallTotalPrice === 'function'
            ? masterBallTotalPrice(entry.currency, _shopQty)
            : entry.price * _shopQty
          : entry.price * _shopQty;
      const totalHtml =
        entry.kind === 'masterball'
          ? typeof currencyAmountSpriteHtml === 'function'
            ? currencyAmountSpriteHtml(entry.currency, total)
            : formatNumber(total)
          : typeof moneySpriteHtml === 'function'
            ? moneySpriteHtml(total)
            : formatNumber(total) + ' ₽';
      _pwSetHtmlSafe(totalEl, totalHtml);
    }
  }
}
function shopAddQty(n) {
  _shopQty =
    Math.max(1, Math.floor(Number(_shopQty) || 1)) + Math.max(0, Math.floor(Number(n) || 0));
  _clampQty();
  const el = _shopEl();
  if (el) renderShop(el);
}
function shopMaxQty() {
  if (!_shopSelected) {
    try {
      notify(t('shop_not_selected'), 'var(--red)');
    } catch (_) {}
    return;
  }
  const entry = _shopEntry();
  if (!entry) return;
  _shopQty = shopMaxAllowed(entry);
  const el = _shopEl();
  if (el) renderShop(el);
}
function buySelectedFromShop() {
  if (!_shopSelected) {
    try {
      notify(t('shop_not_selected'), 'var(--red)');
    } catch (_) {}
    return;
  }
  const entry = _shopEntry();
  if (!entry || entry.soldOut) return;
  if (entry.kind === 'staff') {
    if (typeof buyStaff === 'function') buyStaff(entry.key);
  } else if (entry.kind === 'masterball') {
    const qty = Math.min(Math.max(1, Math.floor(Number(_shopQty) || 1)), shopMaxAllowed(entry));
    if (typeof buyMasterBall === 'function') buyMasterBall(entry.currency, qty);
  } else {
    const qty = Math.min(Math.max(1, Math.floor(Number(_shopQty) || 1)), shopMaxAllowed(entry));
    if (entry.kind === 'ball') {
      if (typeof buyPokeballs === 'function') buyPokeballs(entry.key, qty);
    } else {
      if (typeof buyItem === 'function') buyItem(entry.key, qty);
    }
  }
  // Le compteur revient à 1 après chaque achat.
  _shopQty = 1;
  const el = _shopEl();
  if (el) renderShop(el);
}
// buyItem is NOT defined here anymore: the purchase rule (bag cap, funds,
// wallet/bag mutation) runs in the `economy:market` ECS system on the
// Wallet/InventoryItems/ShopStock components (src/application/market-system.js,
// wave 33 §1.3). The name keeps its exact public surface, re-exposed from
// the application layer.

// --- Migrated to ES module, globals exposed ---
if (typeof renderShop !== 'undefined') {
  if (typeof window !== 'undefined') window.renderShop = renderShop;
  if (typeof globalThis !== 'undefined') globalThis.renderShop = renderShop;
}
if (typeof selectShopItem !== 'undefined') {
  if (typeof window !== 'undefined') window.selectShopItem = selectShopItem;
  if (typeof globalThis !== 'undefined') globalThis.selectShopItem = selectShopItem;
}
if (typeof shopResetQty !== 'undefined') {
  if (typeof window !== 'undefined') window.shopResetQty = shopResetQty;
  if (typeof globalThis !== 'undefined') globalThis.shopResetQty = shopResetQty;
}
if (typeof shopSetQty !== 'undefined') {
  if (typeof window !== 'undefined') window.shopSetQty = shopSetQty;
  if (typeof globalThis !== 'undefined') globalThis.shopSetQty = shopSetQty;
}
if (typeof shopAddQty !== 'undefined') {
  if (typeof window !== 'undefined') window.shopAddQty = shopAddQty;
  if (typeof globalThis !== 'undefined') globalThis.shopAddQty = shopAddQty;
}
if (typeof shopMaxQty !== 'undefined') {
  if (typeof window !== 'undefined') window.shopMaxQty = shopMaxQty;
  if (typeof globalThis !== 'undefined') globalThis.shopMaxQty = shopMaxQty;
}
if (typeof buySelectedFromShop !== 'undefined') {
  if (typeof window !== 'undefined') window.buySelectedFromShop = buySelectedFromShop;
  if (typeof globalThis !== 'undefined') globalThis.buySelectedFromShop = buySelectedFromShop;
}
// buyItem: exposed by src/application/market-system.js (ECS).

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  renderShop,
  selectShopItem,
  shopResetQty,
  shopSetQty,
  shopAddQty,
  shopMaxQty,
  buySelectedFromShop,
};
