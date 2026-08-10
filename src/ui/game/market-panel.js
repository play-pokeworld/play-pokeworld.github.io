// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
/**
 * PokeWorld UI — Pokemon market panel (screen adapter)
 *
 * Pure presentation: the stock/prices now live on the ECS ShopStock component
 * (src/application/market-system.js + economy:market system); this panel only
 * shapes the model for the MarketView and renders it.
 */
// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
}

function renderMarket(el){
 const ids = getMarketPokemon();

 const filterBar = document.getElementById('fs-panel-filters');
 if(filterBar){
 // Wave 15 (user feedback): render through THE same DS MoneyRow component
 // as every other shop-like panel — identical look everywhere.
 const comps = (typeof window!=='undefined' && window.PokeUI && window.PokeUI.components) ? window.PokeUI.components : null;
 if(!comps || typeof comps.moneyRowHTML !== 'function') throw new Error('[ui] PokeUI components not loaded (moneyRowHTML)');
 filterBar.style.display = 'flex';
 filterBar.style.alignItems = 'center';
 filterBar.style.justifyContent = 'flex-end';
 _pwSetHtmlSafe(filterBar, comps.moneyRowHTML({ label: t('money'), amount: G.money.toLocaleString() }));
 }

 // Wave 16: the panel itself is the rebuilt ECS MarketView — the adapter
 // only buckets the species and shapes the model (labels localized HERE).
 const views = (typeof window!=='undefined' && window.PokeUI && window.PokeUI.views) ? window.PokeUI.views : null;
 if(!views || !views.MarketView) throw new Error('[ui] PokeUI views not loaded (MarketView)');
 if(!ids.length){
 _pwSetHtmlSafe(el, views.MarketView.toHTML({ emptyLabel: t('market_empty'), categories: [] }));
 return;
 }
 const cats={starter:[],fossil:[],rare:[],other:[]};
 for(const id of ids){
 if([1,4,7,152,155,158,252,255,258].includes(id)) cats.starter.push(id);
 else if([138,139,140,141,142,345,347].includes(id)) cats.fossil.push(id);
 else if([133,137,106,107,122,124,131,175,236,298,351,374].includes(id)) cats.rare.push(id);
 else cats.other.push(id);
 }
 const catLabels={starter:t('market_cat_starter')||'Starters',fossil:t('market_cat_fossil')||'Fossils',rare:t('market_cat_rare')||'Rare',other:t('market_cat_other')||'Other'};
 const model = { emptyLabel: t('market_empty'), categories: [] };
 for(const cat of ['starter','fossil','rare','other']){
 if(!cats[cat].length) continue;
 const cards = [];
 for(const id of cats[cat]){
  const d=PD[id]; if(!d) continue;
  const price=getPokemonPrice(id);
  const owned=speciesOwned(id);
  const seen=G.pokedex[id]?.seen;
  const isShiny=isSpeciesShiny(id);
  cards.push({
   id,
   name: seen ? getPokeName(id) : '???',
   numLabel: `#${id}`,
   typesHtml: `${typeSpan(d[1])}${d[2]?typeSpan(d[2]):''}`,
   bstLabel: `BST ${d[3]+d[4]+d[5]+d[6]}`,
   priceLabel: `${price.toLocaleString()}₽`,
   ownedLabel: owned ? t('bought') : null,
   spriteHtml: spriteImg(id,'',{size:72, shiny:isShiny}),
  });
 }
 model.categories.push({ key: cat, label: catLabels[cat], cards });
 }
 _pwSetHtmlSafe(el, views.MarketView.toHTML(model));
}

if (typeof renderMarket !== 'undefined') { if (typeof window !== 'undefined') window.renderMarket = renderMarket; if (typeof globalThis !== 'undefined') globalThis.renderMarket = renderMarket; }

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  renderMarket,
};
