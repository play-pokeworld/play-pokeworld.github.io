var _invCat = 'all';
var _invSort = 'name';

function itemCat(key){
 const itm=ITEMS[key]; if(!itm) return 'all';
 if(key.startsWith('berry')) return 'berry';
 if(itm.type==='stone') return 'stone';
 if(itm.type==='treasure'||itm.type==='fossil') return 'treasure';
 if(itm.type==='candy'||itm.type==='special'||itm.type==='key') return 'special';
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
 {id:'name', label: t('sort_name'), icon:''},
 {id:'qty', label: t('sort_quantity'), icon:'🔢'},
 {id:'category', label: t('sort_category'), icon:'📂'}
 ];

 
 const filterBar = document.getElementById('fs-panel-filters');
 if(filterBar){
 filterBar.style.display = 'flex';
 filterBar.style.flexWrap = 'wrap';
 filterBar.style.gap = '6px';
 filterBar.style.alignItems = 'center';

 let filtersHtml = `<span class="extracted-template-style-205">${t('filter_label')}</span>`;
 filtersHtml += cats.map(c=>{
   const isActive = _invCat===c.id;
   return `<button class="hbtn" data-action="legacy-call" data-call="setInvCat" data-call-args="'${c.id}'" data-style="padding:6px 12px;font-size:13px;background:${isActive?'var(--light2)':'var(--light1)'};color:${isActive?'var(--dark1)':'var(--light2)'};border:2px solid ${isActive?'var(--light2)':'var(--dark3)'};font-weight:${isActive?'bold':'normal'}">${c.icon} ${c.label}</button>`;
 }).join('');
 filtersHtml += `<span class="extracted-template-style-206">|</span>`;
 filtersHtml += `<span class="extracted-template-style-205">${t('sort_label')}</span>`;
 filtersHtml += sorts.map(s=>{
   const isActive = _invSort===s.id;
   return `<button class="hbtn" data-action="legacy-call" data-call="setInvSort" data-call-args="'${s.id}'" data-style="padding:6px 12px;font-size:13px;background:${isActive?'var(--light2)':'var(--light1)'};color:${isActive?'var(--dark1)':'var(--light2)'};border:2px solid ${isActive?'var(--light2)':'var(--dark3)'};font-weight:${isActive?'bold':'normal'}">${s.icon} ${s.label}</button>`;
 }).join('');
 filterBar.innerHTML = filtersHtml;
 }

 
 if(!entries.length){
 el.innerHTML=`<div class="extracted-template-style-207">${t('inv_empty')}</div>`;
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
 html += `<div class="extracted-template-style-208">${t("m.inventory.6")}</div>`;
 } else {
 html += filtered.map(([key,qty])=>{
 const itm=ITEMS[key];
 const equipped=itemEquippedOnTeam(key);

 return `<div class="inv-item extracted-template-style-209" data-action="legacy-call" data-call="handleInventoryClick" data-call-args="'${key}'" data-context-call="openItemInfo" data-context-args="'${key}'">
 <div class="inv-icon">${itemSpriteHtml(key, 40)}</div>
 <div class="extracted-template-style-088">
 <div class="inv-name extracted-template-style-210">${getItemName(key)}</div>
 </div>
 <div class="inv-qty extracted-template-style-211">&times;${qty}</div>
 </div>`;
 }).join('');
 }
 el.innerHTML = html;
}

function handleInventoryClick(key){
  const itm = ITEMS[key];
  if(!itm) return;
  if(itm.buff){
    
    return;
  }
  onInventoryClick(key);
}
