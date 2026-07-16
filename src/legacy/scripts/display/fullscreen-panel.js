


var _dictionaryTab = 'items';
var _dictionarySearch = '';
function dictIsEn(){ const c=(typeof currentLang==='function'?currentLang():((G&&G.lang)||'fr')); return String(c).charAt(0)==='e'; }
function dt(fr,en){ return dictIsEn()?en:fr; }
function setDictionaryTab(tab){ _dictionaryTab = tab || 'items'; _dictionarySearch = ''; const content=document.getElementById('fs-panel-content'); if(content) renderDictionary(content); }
function setDictionarySearch(value){ _dictionarySearch = String(value||'').toLowerCase().trim(); const content=document.getElementById('fs-panel-content'); if(content) renderDictionary(content); }
function _dictPokemonList(){ const out=[]; (G.team||[]).forEach((p,idx)=>{ if(p) out.push({p,loc:t('team_location_clean'),ref:String(idx)}); }); Object.entries(G.collection||{}).forEach(([k,p])=>{ if(p) out.push({p,loc:t('box_pc_location'),ref:k}); }); return out; }
function findItemSources(key){
 const sources=[]; const add=(label)=>{ if(label&&!sources.includes(label)) sources.push(label); };
 for(const [locId,drops] of Object.entries(ROUTE_DROPS||{})) if((drops||[]).includes(key)) add(getLocName(locId));
 for(const [shopId,shop] of Object.entries(SHOPS||{})){ const items=shop.items||shop.stock||[]; if(Array.isArray(items)&&items.some(it=>(Array.isArray(it)?it[0]:(it.key||it.id||it))===key)) add(getShopName(shopId)); }
 if(typeof MINE_ITEMS!=='undefined'&&MINE_ITEMS.some(it=>it.key===key)) add(t('mine_title')||dt('Mine','Mine'));
 for(const q of (STORY_QUESTS||[])) if(q.rewardItems&&q.rewardItems[key]) add(dt('Quête principale','Main quest'));
 if(typeof SIDE_QUESTS!=='undefined') for(const q of Object.values(SIDE_QUESTS||{})) if(q.rewardItems&&q.rewardItems[key]) add(dt('Quête secondaire','Side quest'));
 for(const r of (G.repeatables||[])) if(r.def&&r.def.rewardItems&&r.def.rewardItems[key]) add(dt('Quête répétable','Repeatable quest'));
 if(ITEMS[key]&&ITEMS[key].type==='fossil') add(t('fossil_lab')||dt('Laboratoire Fossile','Fossil Lab'));
 if(!sources.length) add(dt('Obtention non renseignée','Unknown source'));
 return sources;
}
function openAbilityInfo(key){
 const info=TALENTS_FULL[key]; if(!info) return; const inner=document.getElementById('poke-modal-inner'); if(!inner) return;
 const species=[]; if(typeof getSpeciesTalents==='function'){ for(let id=1; id<=(PD?PD.length:0); id++){ if(PD[id]&&getSpeciesTalents(id).includes(key)) species.push(id); } }
 inner.innerHTML=`<div class="modal-title"><div>🧬 ${info.name}</div><span class="modal-close" data-action="close-poke-modal">✕</span></div>
 <div class="dict-info-block"><div><b>${dt('Rareté','Rarity')}</b> : ${getRarityLabel(info.rarity)}</div><p>${info.info||''}</p></div>
 <div class="dict-info-title">${dt('Pokémon concernés','Related Pokémon')}</div>
 <div class="dict-chip-list">${species.length?species.map(id=>`<span class="dict-chip">#${id} ${getPokeName(id)}</span>`).join(''):`<span class="dict-muted">${dt('Aucun Pokémon listé.','No Pokémon listed.')}</span>`}</div>`;
 document.getElementById('poke-modal').classList.add('open');
}
function renderDictionary(el){
 el.classList.add('dictionary-panel-content');
 const tab=_dictionaryTab||'items'; const q=_dictionarySearch||'';
 const tabs=[{id:'items',label:t('dict_items')||dt('Objets','Items')},{id:'moves',label:t('dict_moves')||dt('Attaques','Moves')},{id:'abilities',label:t('dict_abilities')||dt('Talents','Abilities')}];
 let html=`<div class="dict-toolbar"><div class="dict-tabs">${tabs.map(tb=>`<button class="hbtn dict-tab ${tab===tb.id?'active':''}" data-action="legacy-call" data-call="setDictionaryTab" data-call-args="'${tb.id}'">${tb.label}</button>`).join('')}</div><input class="dict-search" data-action="filter-dictionary" value="${q.replace(/"/g,'&quot;')}" placeholder="${dt('Rechercher...','Search...')}"></div>`;
 if(tab==='items'){
  let keys=Object.keys(ITEMS||{}).sort((a,b)=>getItemName(a).localeCompare(getItemName(b))); if(q) keys=keys.filter(k=>(getItemName(k)+' '+k+' '+getItemDesc(k)).toLowerCase().includes(q));
  html+=`<div class="dict-grid">${keys.map(k=>{ const owned=G.inventory&&G.inventory[k]>0; const sources=findItemSources(k); return `<div class="dict-entry ${owned?'owned':''}" data-action="legacy-call" data-call="openItemInfo" data-call-args="'${k}'"><div class="dict-entry-icon">${itemSpriteHtml(k,32)}</div><div><b>${getItemName(k)}</b><span>${owned?`${dt('Possédé','Owned')} ×${G.inventory[k]}`:dt('Non possédé','Not owned')}</span><small>${sources.slice(0,3).join(' · ')}${sources.length>3?'…':''}</small></div></div>`; }).join('')||`<div class="dict-muted">${dt('Aucun résultat.','No results.')}</div>`}</div>`;
 } else if(tab==='moves'){
  const mons=_dictPokemonList(); let keys=Object.keys(MOVES||{}).sort((a,b)=>getMoveName(a).localeCompare(getMoveName(b))); if(q) keys=keys.filter(k=>(getMoveName(k)+' '+k+' '+(MOVES[k]?.type||'')).toLowerCase().includes(q));
  html+=`<div class="dict-grid">${keys.map(k=>{ const mv=MOVES[k]; const users=mons.filter(o=>(o.p.moves||[]).some(m=>m.id===k)); return `<div class="dict-entry ${users.length?'owned':''}" data-type-color="${TYPE_COLORS[mv?.type||'']||'#555'}" data-action="legacy-call" data-call="openMoveInfo" data-call-args="'${k}'"><div class="dict-entry-icon type-badge ${typeClass(mv?.type||'?')}">${mv?.type||'?'}</div><div><b>${getMoveName(k)}</b><span>${users.length?`${users.length} ${dt('Pokémon avec cette attaque','Pokémon know this move')}`:dt('Aucun Pokémon ne la connaît','No Pokémon knows it')}</span><small>${users.slice(0,4).map(u=>u.p.name).join(' · ')}${users.length>4?'…':''}</small></div></div>`; }).join('')||`<div class="dict-muted">${dt('Aucun résultat.','No results.')}</div>`}</div>`;
 } else {
  const mons=_dictPokemonList(); const unlocked=new Set(); Object.values(G.unlockedTalents||{}).forEach(arr=>(arr||[]).forEach(tal=>unlocked.add(tal))); mons.forEach(o=>{ if(o.p.talent) unlocked.add(o.p.talent); });
  let keys=Object.keys(TALENTS_FULL||{}).sort((a,b)=>TALENTS_FULL[a].name.localeCompare(TALENTS_FULL[b].name)); if(q) keys=keys.filter(k=>(TALENTS_FULL[k].name+' '+k+' '+(TALENTS_FULL[k].info||'')).toLowerCase().includes(q));
  html+=`<div class="dict-grid">${keys.map(k=>{ const info=TALENTS_FULL[k]; const users=mons.filter(o=>o.p.talent===k); return `<div class="dict-entry ${unlocked.has(k)?'owned':''}" data-action="legacy-call" data-call="openAbilityInfo" data-call-args="'${k}'"><div class="dict-entry-icon">🧬</div><div><b>${info.name}</b><span>${unlocked.has(k)?`${dt('Débloqué','Unlocked')} · ${users.length} ${dt('porteur(s)','holder(s)')}`:dt('Non débloqué','Locked')} · ${getRarityLabel(info.rarity)}</span><small>${users.slice(0,4).map(u=>u.p.name).join(' · ')}${users.length>4?'…':''}</small></div></div>`; }).join('')||`<div class="dict-muted">${dt('Aucun résultat.','No results.')}</div>`}</div>`;
 }
 el.innerHTML=html; const input=el.querySelector('.dict-search'); if(input){ input.focus(); input.setSelectionRange(input.value.length,input.value.length); } if(typeof applyDynamicStyles==='function') applyDynamicStyles(el);
}

function openFullscreenPanel(panelType){
 
 closeUnifiedSelectorModal();
 closeFullscreenPanel();
 if(typeof closeBattleSummary === 'function') closeBattleSummary();
 const pm = document.getElementById('poke-modal');
 if(pm) pm.classList.remove('open');
 const qm = document.getElementById('quest-modal');
 if(qm) qm.classList.remove('open');
 const sm = document.getElementById('settings-modal');
 if(sm) sm.classList.remove('open');

 const titles = {
 inventory: t('panel_inventory_title'),
 shop: t('panel_shop_title'),
 market: t('panel_market_title'),
 pokedex: t('panel_pokedex_title'),
 dictionary: t('dictionary_title'),
 guide: t('guide_title')
 };

 
 let modal = document.getElementById('fullscreen-panel-modal');
 if(!modal){
 modal = document.createElement('div');
 modal.id = 'fullscreen-panel-modal';
 modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:600;display:none;align-items:center;justify-content:center;padding:16px;';
 modal.innerHTML = `
 <div class="extracted-template-style-043">
   <div id="fs-panel-header" class="extracted-template-style-044">
     <div id="fs-panel-title" class="extracted-template-style-045"></div>
     <span class="extracted-template-style-046" data-action="legacy-call" data-call="closeFullscreenPanel" data-call-args="">✕</span>
   </div>
   <div id="fs-panel-filters" class="extracted-template-style-047"></div>
   <div id="fs-panel-content" class="extracted-template-style-048"></div>
 </div>`;
 document.body.appendChild(modal);
 modal.addEventListener('click', function(e){ if(e.target===modal) closeFullscreenPanel(); });
 }

 
 document.getElementById('fs-panel-filters').style.display = 'none';
 document.getElementById('fs-panel-filters').innerHTML = '';
 document.getElementById('fs-panel-title').textContent = titles[panelType] || panelType;
 const content = document.getElementById('fs-panel-content');
 content.classList.remove('dictionary-panel-content');

 if(panelType === 'inventory') renderInventory(content);
 else if(panelType === 'shop') renderShop(content);
 else if(panelType === 'market') renderMarket(content);
 else if(panelType === 'pokedex') renderPokedex(content);
 else if(panelType === 'dictionary') renderDictionary(content);
 else if(panelType === 'guide' && typeof renderGuidePanel === 'function'){ if(typeof window !== 'undefined' && typeof window.setGuideSection === 'function') window.setGuideSection(null); else renderGuidePanel(content); }

 modal.style.display = 'flex';
}

function closeFullscreenPanel(){
 const modal = document.getElementById('fullscreen-panel-modal');
 if(modal) modal.style.display = 'none';
}
