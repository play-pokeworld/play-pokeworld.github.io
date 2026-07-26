// Repli si util.js (pwSetHtml) n'est pas chargé — tests unitaires ciblés.
var _pwSetHtmlSafe = _pwSetHtmlSafe || function(el, html){ if(typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
var _invCat = 'all';
var _invSort = 'name';

function itemCat(key){
 const itm=ITEMS[key]; if(!itm) return 'misc';
 const isCtCs = (typeof isCtCsItem==='function') ? isCtCsItem(key) : (itm.type==='ct' || itm.type==='cs');
 if(isCtCs) return 'ct_cs';
 if(itm.category==='resistance_berry' || key.endsWith('_berry') || key==='berry') return 'berry';
 if(itm.type==='stone' || itm.type==='evolution' || itm.evolution===true) return 'evolution';
 if(itm.type==='fossil') return 'fossil';
 if(itm.type==='treasure') return 'treasure';
 if(itm.type==='key') return 'special';
 if(itm.type==='candy' || itm.type==='special') return 'special';
  if(itm.type==='held' || itm.category || itm.buff) return 'held';
 return 'misc';
}
function setInvCat(c){
 _invCat=c;
 let el=document.getElementById('fs-panel-content');
 if(!el) el=document.getElementById('tab-content');
 if(el) renderInventory(el);
}

function setInvSort(s){
 _invSort=s;
 let el=document.getElementById('fs-panel-content');
 if(!el) el=document.getElementById('tab-content');
 if(el) renderInventory(el);
}

function renderInventory(el){
  const entries=Object.entries(G.inventory).filter(([k,v])=>v>0 && ITEMS[k]);
 const cats=[
 {id:'all', label: t("m.inventory.12"), icon:getIcon('bag',14)},
 {id:'berry', label: t("m.inventory.11"), icon:getIcon('pokeball',14)},
 {id:'ct_cs', label: "CT / CS", icon: "💿"},
 {id:'held', label: (typeof t==='function'?t('cat_held_items'):'Objets tenus'), icon:getIcon('team',14)},
 {id:'evolution', label: (typeof t==='function'?t('cat_evolution'):'Evolution'), icon:getIcon('badge',14)},
 {id:'fossil', label: (typeof t==='function'?t('cat_fossils'):'Fossiles'), icon:'🦴'},
 {id:'treasure', label: t("m.inventory.8"), icon:getIcon('money',14)},
 {id:'special', label: (typeof t==='function'?t('cat_key_special'):'Key Items & Special'), icon:'🔑'},
 {id:'misc', label: (typeof t==='function'?t('cat_misc'):'Divers'), icon:'📦'}
 ];
 const sorts=[
 {id:'name', label: t('sort_name'), icon:getIcon('dictionary',14)},
 {id:'qty', label: t('sort_quantity'), icon:getIcon('info',14)},
 {id:'category', label: t('sort_category'), icon:getIcon('box',14)}
 ];

 
 const filterBar = document.getElementById('fs-panel-filters');
 if(filterBar){
 filterBar.style.display = 'flex';
 filterBar.style.flexWrap = 'wrap';
 filterBar.style.gap = '6px';
 filterBar.style.alignItems = 'center';

 let filtersHtml = `<div class="ui-control-toolbar ui-control-toolbar--filters"><span class="ui-toolbar-label">${t('filter_label')}</span>`;
 filtersHtml += cats.map(c=>{
   const isActive = _invCat===c.id;
   return typeof uiButtonHtml==='function'
    ? uiButtonHtml({label:c.label, icon:c.icon, call:'setInvCat', args:`'${c.id}'`, variant:'tool', active:isActive})
    : `<button class="hbtn" data-action="legacy-call" data-call="setInvCat" data-call-args="'${c.id}'">${c.icon} ${c.label}</button>`;
 }).join('');
 filtersHtml += `<span class="ui-toolbar-sep"></span><span class="ui-toolbar-label">${t('sort_label')}</span>`;
 filtersHtml += sorts.map(s=>{
   const isActive = _invSort===s.id;
   return typeof uiButtonHtml==='function'
    ? uiButtonHtml({label:s.label, icon:s.icon, call:'setInvSort', args:`'${s.id}'`, variant:'tool', active:isActive})
    : `<button class="hbtn" data-action="legacy-call" data-call="setInvSort" data-call-args="'${s.id}'">${s.icon} ${s.label}</button>`;
 }).join('');
 filtersHtml += `</div>`;
 filterBar.innerHTML = filtersHtml;
 }

 
 if(!entries.length){
 _pwSetHtmlSafe(el, `<div class="pw-empty-state-lg">${t('inv_empty')}</div>`);
 return;
 }
 let filtered = _invCat==='all' ? entries : entries.filter(([k])=>itemCat(k)===_invCat);
 
 if(_invSort==='name'){
   filtered.sort((a,b) => getItemName(a[0]).localeCompare(getItemName(b[0])));
 } else if(_invSort==='qty'){
   filtered.sort((a,b) => b[1] - a[1]);
 } else if(_invSort==='category'){
   filtered.sort((a,b) => itemCat(a[0]).localeCompare(itemCat(b[0])));
 }

 let html = '';
 if(!filtered.length){
 html += `<div class="pw-empty-state-md">${t("m.inventory.6")}</div>`;
 } else {
 html += filtered.map(([key,qty])=>{
 const itm=ITEMS[key];
 const equipped=itemEquippedOnTeam(key);
 var equipBadge = equipped ? ` <span data-style="color:var(--green);font-size:10px">\u2713 ${equipped.name}</span>` : '';

 return `<div class="inv-item pw-starter-chosen" data-action="legacy-call" data-call="handleInventoryClick" data-call-args="'${key}'" data-context-call="openItemInfo" data-context-args="'${key}'">
 <div class="inv-icon">${itemSpriteHtml(key, 40)}</div>
 <div class="pw-flex-1">
 <div class="inv-name pw-starter-chosen-label">${getItemName(key)}${equipBadge}</div>
 </div>
 <div class="inv-qty pw-starter-chosen-level">&times;${qty}</div>
 </div>`;
 }).join('');
 }
 _pwSetHtmlSafe(el, html);
}

// Objet « utilisable » depuis le sac : le clic gauche déclenche son usage
// (liste des Pokémon, vente…) au lieu du panneau d'info. Ce panneau reste
// accessible au clic droit / appui long (data-context-call="openItemInfo").
function isUsableBagItem(key){
  const itm=(typeof ITEMS!=='undefined' && ITEMS) ? ITEMS[key] : null;
  if(!itm) return false;
  if(itm.type==='treasure') return true;                                    // écran de vente
  if(itm.type==='stone' || itm.type==='evolution' || itm.evolution===true) return true; // liste d'évolution
  const isCtCs = (typeof isCtCsItem==='function') ? isCtCsItem(key) : (itm.type==='ct' || itm.type==='cs');
  if(isCtCs) return true;                                                   // enseignement d'attaque
  if(itm.type==='candy' || key==='rarecandy') return true;                  // super bonbon
  return false;
}

function handleInventoryClick(key){
  const itm = ITEMS[key];
  if(!itm) return;
  // If in equip mode (from team), call the equip callback
  if(window._equipCallback) {
    // Passe 18 : si l'objet cliqué n'est pas TENABLE (pierre, CT, trésor…),
    // on NE consomme PAS le callback et on signale l'erreur — avant, le
    // callback était perdu et le clic suivant ouvrait le panneau d'info.
    const equippable = (typeof isHeldEquippableItem === 'function') ? isHeldEquippableItem(key) : !!(itm.type === 'held' || itm.buff);
    if(!equippable){
      if(typeof notify === 'function' && typeof tr === 'function') notify(tr('item_not_holdable', {item:(typeof getItemName==='function'?getItemName(key):key)}), 'var(--red)');
      return;
    }
    const cb = window._equipCallback;
    window._equipCallback = null;
    cb(key);
    return;
  }
  // Clic gauche sur un objet utilisable (CT/CS, objet d'évolution, bonbon,
  // trésor) → flux d'utilisation (onInventoryClick ouvre la liste des Pokémon
  // ou l'écran dédié). Les autres objets affichent leur fiche d'info.
  if(isUsableBagItem(key) && typeof onInventoryClick === 'function') {
    onInventoryClick(key);
    return;
  }
  if(typeof openItemInfo === 'function') {
    openItemInfo(key);
  } else if(typeof onInventoryClick === 'function') {
    onInventoryClick(key);
  }
}


// --- Migrated to ES module, globals exposed ---
if (typeof itemCat !== 'undefined' && typeof window !== 'undefined') window.itemCat = itemCat;
if (typeof isUsableBagItem !== 'undefined' && typeof window !== 'undefined') window.isUsableBagItem = isUsableBagItem;
if (typeof setInvCat !== 'undefined' && typeof window !== 'undefined') window.setInvCat = setInvCat;
if (typeof setInvSort !== 'undefined' && typeof window !== 'undefined') window.setInvSort = setInvSort;
if (typeof renderInventory !== 'undefined' && typeof window !== 'undefined') window.renderInventory = renderInventory;
if (typeof handleInventoryClick !== 'undefined' && typeof window !== 'undefined') window.handleInventoryClick = handleInventoryClick;

