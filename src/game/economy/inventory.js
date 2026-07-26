// Repli si util.js (pwSetHtml) n'est pas chargé — tests unitaires ciblés.
var _pwSetHtmlSafe = _pwSetHtmlSafe || function(el, html){ if(typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
var _invCat = 'held';
var _invCatTouched = false; // passe 27 : onglet choisi explicitement par le joueur
var _invSort = 'name';
var _invSearch = ''; // passe 26 : recherche texte (même ergonomie que la boîte PC)

function itemCat(key){
 // Passe 26 : les baies SONT des objets tenus (catégorie 'berry' supprimée) ;
 // le filtre « Divers » disparaît — tout ce qui n'est pas classé ailleurs
 // rejoint « special » (clés, bonbons, fournitures).
 const itm=ITEMS[key]; if(!itm) return 'special';
 const isCtCs = (typeof isCtCsItem==='function') ? isCtCsItem(key) : (itm.type==='ct' || itm.type==='cs');
 if(isCtCs) return 'ct_cs';
 if(itm.type==='stone' || itm.type==='evolution' || itm.evolution===true) return 'evolution';
 if(itm.type==='fossil') return 'fossil';
 if(itm.type==='treasure') return 'treasure';
 if(itm.type==='key') return 'special';
 if(itm.type==='candy' || itm.type==='special') return 'special';
 if(itm.type==='held' || itm.category || itm.buff || String(key).endsWith('_berry')) return 'held';
 return 'special';
}
function setInvCat(c){
 _invCat=c; _invCatTouched=true;
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
// Passe 26 : recherche dans le sac (saisie de la barre unifiée).
function setInvSearch(v){
 _invSearch = String(v || '').toLowerCase().trim();
 let el=document.getElementById('fs-panel-content');
 if(!el) el=document.getElementById('tab-content');
 if(el) renderInventory(el);
}
// Passe 26 : bouton « Réinitialiser » identique à la boîte PC.
function resetInvFilters(){
 _invCat='held'; _invCatTouched=false; _invSort='name'; _invSearch='';
 let el=document.getElementById('fs-panel-content');
 if(!el) el=document.getElementById('tab-content');
 if(el) renderInventory(el);
}

function renderInventory(el){
  const entries=Object.entries(G.inventory).filter(([k,v])=>v>0 && ITEMS[k]);
 // Passe 27 : sac en ONGLETS (même ergonomie que les pages « boîte/fossiles »
 // du PC) — le select de catégorie disparaît, PAS d'onglet « Tous » : le sac
 // est toujours trié par famille et l'équipement d'un objet tombe direct sur
 // l'onglet « Objets tenus ».
 const cats=[
 {id:'held', label: (typeof t==='function'?t('cat_held_items'):'Objets tenus')},
 {id:'ct_cs', label: "CT / CS"},
 {id:'evolution', label: (typeof t==='function'?t('cat_evolution'):'Evolution')},
 {id:'fossil', label: (typeof t==='function'?t('cat_fossils'):'Fossiles')},
 {id:'treasure', label: t("m.inventory.8")},
 {id:'special', label: (typeof t==='function'?t('cat_key_special'):'Key Items & Special')}
 ];
 const sorts=[
 {id:'name', label: t('sort_name')},
 {id:'qty', label: t('sort_quantity')}
 ];

 // La barre externe (fs-panel-filters) n'est plus utilisée : la barre fait
 // partie du contenu (passe 26).
 const filterBar = document.getElementById('fs-panel-filters');
 if(filterBar) filterBar.style.display = 'none';

 // Comptes par onglet + choix de l'onglet affiché
 const counts={}; cats.forEach(c=>counts[c.id]=0);
 entries.forEach(([k])=>{ const c=itemCat(k); counts[c]=(counts[c]||0)+1; });
 if(window._equipCallback) _invCat='held'; // équipement en cours → objets tenus
 if(!_invCatTouched && (counts[_invCat]||0)===0){
   const firstNonEmpty = cats.find(c=>(counts[c.id]||0)>0);
   if(firstNonEmpty) _invCat = firstNonEmpty.id;
 }
 if(!cats.some(c=>c.id===_invCat)) _invCat='held';
 if(_invSort!=='name' && _invSort!=='qty' && _invSort!=='category') _invSort='name';

 const tabsHtml = '<div class="inv-tabs">' + cats.map(c=>`<button class="hbtn inv-tab${_invCat===c.id?' active':''}" data-action="legacy-call" data-call="setInvCat" data-call-args="'${c.id}'">${c.label} <span class="inv-tab-count">${counts[c.id]||0}</span></button>`).join('') + '</div>';
 const sortOptions = sorts.map(o=>`<option value="${o.id}"${_invSort===o.id?' selected':''}>${o.label}</option>`).join('');
 const searchVal = String(_invSearch||'').replace(/"/g,'&quot;');
 const toolbarHtml = `<div class="box-filter-panel ui-control-toolbar ui-control-toolbar--box inv-toolbar">`
  + tabsHtml
  + `<div class="inv-controls"><label><span>${t('sort_label')}</span><select data-action="select-self" data-change-call="setInvSort" data-change-args="this.value">${sortOptions}</select></label>`
  + `<input class="dict-search box-filter-search" data-action="filter-bag" value="${searchVal}" placeholder="${t('bag_search_placeholder')}">`
  + `<button class="hbtn" data-action="legacy-call" data-call="resetInvFilters" data-call-args="">${t('box_filter_reset')}</button></div>`
  + `</div>`;

 // Recherche = GLOBALE (tous onglets confondus, comme le dictionnaire) ;
 // sinon l'onglet courant filtre l'affichage.
 let filtered = _invSearch ? entries : entries.filter(([k])=>itemCat(k)===_invCat);
 if(_invSearch) filtered = filtered.filter(([k]) => (getItemName(k)+' '+k+' '+(typeof getItemDesc==='function'?getItemDesc(k):'')).toLowerCase().includes(_invSearch));

 if(_invSort==='qty'){
   filtered.sort((a,b) => b[1] - a[1] || getItemName(a[0]).localeCompare(getItemName(b[0])));
 } else {
   filtered.sort((a,b) => getItemName(a[0]).localeCompare(getItemName(b[0])));
 }

 let html = toolbarHtml;
 if(!entries.length){
 _pwSetHtmlSafe(el, `<div class="pw-empty-state-lg">${t('inv_empty')}</div>`);
 return;
 }
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
 const invSearchInput = el.querySelector('.box-filter-search');
 // preventScroll : focus() remettrait le panneau en haut (passe 16)
 if(invSearchInput && _invSearch){ try{ invSearchInput.focus({preventScroll:true}); }catch(_){ invSearchInput.focus(); } invSearchInput.setSelectionRange(invSearchInput.value.length, invSearchInput.value.length); }
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
if (typeof setInvSearch !== 'undefined' && typeof window !== 'undefined') window.setInvSearch = setInvSearch;
if (typeof resetInvFilters !== 'undefined' && typeof window !== 'undefined') window.resetInvFilters = resetInvFilters;
if (typeof renderInventory !== 'undefined' && typeof window !== 'undefined') window.renderInventory = renderInventory;
if (typeof handleInventoryClick !== 'undefined' && typeof window !== 'undefined') window.handleInventoryClick = handleInventoryClick;

