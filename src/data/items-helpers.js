/**
 * Items Helpers — Item display helpers
 * Names, descriptions, sprites, info panels
 */

function normalizeItemKey(key){
  const aliases = {berry_oran:'oran_berry', berry_sitrus:'sitrus_berry', berry_ceriz:'cheri_berry', berry_prine:'prine_berry', chroma_charm:'shiny_charm', up_grade:'upgrade'};
  return aliases[key] || key;
}

// Reconnaît une CT/CS même quand le type n'est pas déclaré :
// 28 CT (ex. ct_airshlash) n'ont pas de `type` mais portent un `moveId`
// et une clé préfixée ct_*/cs_*.
function isCtCsItem(key){
  const itm = (typeof ITEMS !== 'undefined' && ITEMS) ? ITEMS[key] : null;
  if(!itm) return false;
  if(itm.type === 'ct' || itm.type === 'cs') return true;
  if(itm.moveId && /^(ct|cs)/.test(String(key))) return true;
  return false;
}

// Certaines CT pointent vers d'anciens ids compacts absents de MOVES
// (ex. ct13_icebeam → moveId "icebeam", alors que MOVES connaît "ice_beam").
const CT_MOVE_ALIASES = {
  icebeam: 'ice_beam',
  hyperbeam: 'hyper_beam',
  solarbeam: 'solar_beam',
  shadowball: 'shadow_ball',
};
// MoveId canonique (existant dans MOVES) enseigné par une CT/CS.
function resolveCtCsMoveId(key){
  const itm = (typeof ITEMS !== 'undefined' && ITEMS) ? ITEMS[key] : null;
  if(!itm || !itm.moveId) return null;
  const id = itm.moveId;
  if(typeof MOVES !== 'undefined' && MOVES && MOVES[id]) return id;
  return CT_MOVE_ALIASES[id] || id;
}

function getItemName(key){
  const displayKey = normalizeItemKey(key);
  if (typeof ItemEngine !== 'undefined') {
    const lang = (typeof G !== 'undefined' && G && G.lang === 'en') ? 'en' : 'fr';
    return ItemEngine.getItemNameLocalized(displayKey, lang);
  }
  let v = (typeof t==='function') ? t('items.'+displayKey+'.name') : displayKey;
  if(!v || v === 'items.'+displayKey+'.name') v = String(displayKey).replaceAll('_', ' ');
  const name = (typeof titleCaseDisplayName === 'function') ? titleCaseDisplayName(v) : v;
  
  // CT/CS suffix: "{Name} TM" in EN, "{Name} CS/CT" in FR
  if(String(displayKey).startsWith('ct') || String(displayKey).startsWith('cs')) {
    const isCS = String(displayKey).startsWith('cs');
    const isEN = (typeof G !== 'undefined' && G && G.lang === 'en');
    if (isCS) return isEN ? name + ' TM' : name + ' CS';
    return isEN ? name + ' TM' : name + ' CT';
  }
  return name;
}

function getItemDesc(key){
  const displayKey = normalizeItemKey(key);
  const lang = (typeof G !== 'undefined' && G && G.lang === 'en') ? 'en' : 'fr';
  if (typeof ItemEngine !== 'undefined' && typeof ItemEngine.generateItemDesc === 'function') {
    return ItemEngine.generateItemDesc(displayKey, lang);
  }
  const item = (typeof ITEMS !== 'undefined' && ITEMS[displayKey]) ? ITEMS[displayKey] : null;
  if (item && item.effect) return item.effect;
  return lang === 'en' ? 'Item effect shown in battle.' : (typeof t==='function'?t('effect_applied_in_battle'):'Effect applied in battle.');
}

function openItemInfo(key){
  // Panneau d'info unifié : même modale #poke-modal que les attaques et talents
  // (la variante PokePanel séparée est désactivée pour garantir une largeur,
  // un en-tête et un bouton retour identiques partout).
  const itm = ITEMS && ITEMS[key];
  if(!itm) return;
  const inner = document.getElementById('poke-modal-inner');
  if(!inner) return;
  const lang = (typeof G !== 'undefined' && G && G.lang === 'en') ? 'en' : 'fr';
  const name = getItemName(key);
  const desc = getItemDesc(key);
  const qty = (G.inventory && G.inventory[key]) || 0;
  
  var lang2 = (typeof G !== 'undefined' && G && G.lang === 'en') ? 'en' : 'fr';
  var TL = lang2 === 'en' ? {stone:'Stone',treasure:'Treasure',candy:'Candy',key:'Key Item',held:'Held Item',fossil:'Fossil',ct:'TM/HM',cs:'HM',evolution:'Evo. Item',berry:'Berry',memory:'Memory',z_crystal:'Z-Crystal',keystone:'Keystone'}
   : {stone:'Pierre',treasure:'Trésor',candy:'Bonbon',key:(typeof t==='function'?t('cat_key_item'):'Key Item'),held:'Objet Tenu',fossil:'Fossile',ct:'CT/CS',cs:'CS',evolution:'Évolution',berry:'Baie',memory:'Mémoire',z_crystal:'Cristal Z',keystone:(typeof t==='function'?t('keystone_label'):'Keystone')};
  function _typeLabel(key, fallback) {
    try {
      var v = t(key);
      // If t() returns the key itself or empty, use fallback
      if (!v || v === key || !v.trim()) return fallback;
      return v.trim();
    } catch(e) { return fallback; }
  }
  var typeLabel = '';
  if(itm.type === 'stone') typeLabel = _typeLabel('item_type_stone', TL.stone);
  else if(itm.type === 'treasure') typeLabel = _typeLabel('item_type_treasure', TL.treasure);
  else if(itm.type === 'candy') typeLabel = _typeLabel('item_type_candy', TL.candy);
  else if(itm.type === 'key') typeLabel = _typeLabel('item_type_key', TL.key);
  else if(itm.type === 'held') typeLabel = _typeLabel('item_type_held', TL.held);
  else if(itm.type === 'fossil') typeLabel = _typeLabel('item_type_fossil', TL.fossil);
  else if(itm.type === 'ct' || itm.type === 'cs') typeLabel = _typeLabel('item_type_tm', TL.ct);
  else if(itm.type === 'evolution') typeLabel = _typeLabel('item_type_evolution', TL.evolution);
  else if(itm.type === 'memory') typeLabel = TL.memory;
  else if(itm.type === 'z_crystal') typeLabel = TL.z_crystal;
  else if(itm.type === 'keystone') typeLabel = TL.keystone;
  else typeLabel = _typeLabel('item_type_berry', TL.berry);

  let powerDisplay = '';
  if (typeof ItemEngine !== 'undefined' && ItemEngine.getPowerDisplay) powerDisplay = ItemEngine.getPowerDisplay(key);
  
  let sourceBody = '';
  // Passe 26 : « où trouver » complet (routes, boutiques + CT/CS, mine,
  // atoll, quêtes, labo fossile) — une ligne par source.
  if (typeof getItemSourceList === 'function') {
    const _sources = getItemSourceList(key);
    if (_sources.length) sourceBody = '<div class="pw-src-list">' + _sources.map(s => '<div class="pw-src-line">' + s + '</div>').join('') + '</div>';
  }
  if (!sourceBody && typeof getItemSource === 'function') {
    const src = getItemSource(key, lang);
    if (src) sourceBody = '<div data-style="padding:8px 10px;background:var(--dark3);border-radius:6px;font-size:11px;color:var(--light1);">' + src + '</div>';
  }

  // Mémorise d'où vient ce panneau (dictionnaire, fiche, sac…) pour le bouton retour
  if (typeof window.pwInfoCaptureSource === 'function') window._pwInfoSource = window.pwInfoCaptureSource();

  if (typeof window.pwBuildInfoPanel === 'function') {
    var _itemSections = [];
    // Passe 24 : badges couleur météo/statuts dans les descriptions d'objets.
    var _descRich = desc;
    if (typeof replaceWeatherTerms === 'function') _descRich = replaceWeatherTerms(_descRich);
    if (typeof replaceStatusTerms === 'function') _descRich = replaceStatusTerms(_descRich);
    if (desc) _itemSections.push({ title: (t('description') || 'Description'), body: '<div class="pw-text-sm pw-light1" data-style="line-height:1.6;">' + _descRich + '</div>' });
    if (sourceBody) _itemSections.push({ title: '📍 ' + ((typeof t === 'function' && t('found_in_lbl')) || (lang === 'en' ? 'Found in:' : 'Où trouver :')), body: sourceBody });
    inner.innerHTML = window.pwBuildInfoPanel({
      icon: itemSpriteHtml(key, 48),
      title: name,
      subtitle: typeLabel,
      sections: _itemSections,
      rows: [
        { label: (t('price') || 'Prix'), value: (itm.price||0).toLocaleString() + '₽' },
        { label: (t('owned') || 'Possédé'), value: '&times;' + qty, valueClass: 'pw-info-value-green' }
      ]
    });
  } else {
    inner.innerHTML = '<div class="modal-title"><div class="pw-row">'
      + itemSpriteHtml(key, 48)
      + '<div><div>' + name + '</div><div class="pw-text-sm pw-light1">' + typeLabel + '</div></div></div>'
      + '<span class="modal-close" data-action="pw-info-back"></span></div>';
  }
  if(typeof window.pwModalInfo==='function') window.pwModalInfo(true);
  document.getElementById('poke-modal').classList.add('open');
}

function getItemSpriteUrl(key){
  const displayKey = normalizeItemKey(key);
  if (!displayKey || !ITEMS || !ITEMS[displayKey]) return null;
  if (displayKey.startsWith('ct') || displayKey.startsWith('cs')) {
    if (typeof resolveCtCsMoveId === 'function') {
      const moveId = resolveCtCsMoveId(displayKey);
      const mv = moveId && typeof MOVES !== 'undefined' ? MOVES[moveId] : null;
      if (mv && mv.type) return 'src/assets/images/items/tm_' + mv.type.toLowerCase() + '.png';
    }
    return 'src/assets/images/items/tm_normal.png';
  }
  return 'src/assets/images/items/' + displayKey + '.png';
}

function itemSpriteHtml(key, size){
  const url = getItemSpriteUrl(key);
  const icon = (ITEMS && ITEMS[key] && ITEMS[key].icon) || '';
  size = size || 24;
  if (url) return '<img src="' + url + '" style="width:'+size+'px;height:'+size+'px;image-rendering:pixelated;" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'inline-flex\';"><span style="display:none;align-items:center;justify-content:center;width:'+size+'px;height:'+size+'px;font-size:'+(size-4)+'px;">' + icon + '</span>';
  return '<span data-style="display:flex;align-items:center;justify-content:center;width:var(--ii-size);height:var(--ii-size);font-size:var(--ii-fs);" style="--ii-size:'+size+'px;--ii-fs:'+(size-4)+'px;">' + icon + '</span>';
}

// --- Globals ---
if (typeof normalizeItemKey !== 'undefined' && typeof window !== 'undefined') window.normalizeItemKey = normalizeItemKey;
if (typeof isCtCsItem !== 'undefined' && typeof window !== 'undefined') window.isCtCsItem = isCtCsItem;
if (typeof resolveCtCsMoveId !== 'undefined' && typeof window !== 'undefined') window.resolveCtCsMoveId = resolveCtCsMoveId;
if (typeof getItemName !== 'undefined' && typeof window !== 'undefined') window.getItemName = getItemName;
if (typeof getItemDesc !== 'undefined' && typeof window !== 'undefined') window.getItemDesc = getItemDesc;
if (typeof openItemInfo !== 'undefined' && typeof window !== 'undefined') window.openItemInfo = openItemInfo;
if (typeof getItemSpriteUrl !== 'undefined' && typeof window !== 'undefined') window.getItemSpriteUrl = getItemSpriteUrl;
if (typeof itemSpriteHtml !== 'undefined' && typeof window !== 'undefined') window.itemSpriteHtml = itemSpriteHtml;

