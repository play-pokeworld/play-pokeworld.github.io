// ============================================================
// INVENTORY — Filtres dans le header fixe, contenu scrollable
// ============================================================
var _invCat = 'all';
var _invSort = 'name';

function itemCat(key){
 const itm=ITEMS[key]; if(!itm) return 'all';
 if(key.startsWith('berry')) return 'berry';
 if(itm.type==='stone') return 'stone';
 if(itm.type==='treasure') return 'treasure';
 if(itm.type==='candy'||itm.type==='special') return 'special';
 if(itm.buff) return 'object';
 return 'berry';
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
 const lang = (typeof G !== 'undefined' && G) ? G.lang : 'fr';
 const entries=Object.entries(G.inventory).filter(([k,v])=>v>0 && ITEMS[k]);
 const cats=[
 {id:'all', label: t("m.inventory.12"), icon:'🎒'},
 {id:'berry', label: t("m.inventory.11"), icon:'🍓'},
 {id:'object', label: t("m.inventory.10"), icon:''},
 {id:'stone', label: t("m.inventory.9"), icon:''},
 {id:'treasure', label: t("m.inventory.8"), icon:'💰'},
 {id:'special', label: t("m.inventory.7"), icon:'✨'}
 ];
 const sorts=[
 {id:'name', label: lang==='en' ? 'Name' : 'Nom', icon:''},
 {id:'qty', label: lang==='en' ? 'Quantity' : 'Quantité', icon:'🔢'},
 {id:'category', label: lang==='en' ? 'Category' : 'Catégorie', icon:'📂'}
 ];

 // === BARRE FILTRES FIXE EN HAUT ===
 const filterBar = document.getElementById('fs-panel-filters');
 if(filterBar){
 filterBar.style.display = 'flex';
 filterBar.style.flexWrap = 'wrap';
 filterBar.style.gap = '6px';
 filterBar.style.alignItems = 'center';

 let filtersHtml = `<span style="font-size:13px;color:var(--light1);margin-right:6px;">Filtre:</span>`;
 filtersHtml += cats.map(c=>{
   const isActive = _invCat===c.id;
   return `<button class="hbtn" onclick="setInvCat('${c.id}')" style="padding:6px 12px;font-size:13px;background:${isActive?'var(--light2)':'var(--light1)'};color:${isActive?'var(--dark1)':'var(--light2)'};border:2px solid ${isActive?'var(--light2)':'var(--dark3)'};font-weight:${isActive?'bold':'normal'}">${c.icon} ${c.label}</button>`;
 }).join('');
 filtersHtml += `<span style="font-size:13px;color:var(--light1);margin:0 6px;">|</span>`;
 filtersHtml += `<span style="font-size:13px;color:var(--light1);margin-right:6px;">Tri:</span>`;
 filtersHtml += sorts.map(s=>{
   const isActive = _invSort===s.id;
   return `<button class="hbtn" onclick="setInvSort('${s.id}')" style="padding:6px 12px;font-size:13px;background:${isActive?'var(--light2)':'var(--light1)'};color:${isActive?'var(--dark1)':'var(--light2)'};border:2px solid ${isActive?'var(--light2)':'var(--dark3)'};font-weight:${isActive?'bold':'normal'}">${s.icon} ${s.label}</button>`;
 }).join('');
 filterBar.innerHTML = filtersHtml;
 }

 // === CONTENU SCROLLABLE ===
 if(!entries.length){
 el.innerHTML=`<div style="text-align:center;padding:40px;color:var(--light2)">${t('inv_empty')}</div>`;
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
 html += `<div style="text-align:center;padding:20px;color:var(--light2)">${t("m.inventory.6")}</div>`;
 } else {
 html += filtered.map(([key,qty])=>{
 const itm=ITEMS[key];
 const equipped=itemEquippedOnTeam(key);

 return `<div class="inv-item" style="background:var(--light1);border:2px solid var(--dark1);cursor:pointer;" onclick="handleInventoryClick('${key}')" oncontextmenu="event.preventDefault();openItemInfo('${key}');return false;">
 <div class="inv-icon">${itemSpriteHtml(key, 40)}</div>
 <div style="flex:1">
 <div class="inv-name" style="color:var(--dark1);font-weight:500;">${getItemName(key)}</div>
 </div>
 <div class="inv-qty" style="background:var(--dark1);color:var(--light2);font-weight:bold;padding:4px 10px;border-radius:12px;min-width:45px;text-align:center;">×${qty}</div>
 </div>`;
 }).join('');
 }
 el.innerHTML = html;
}

function handleInventoryClick(key){
  const itm = ITEMS[key];
  if(!itm) return;
  if(itm.buff){
    openItemInfo(key);
    return;
  }
  onInventoryClick(key);
}
