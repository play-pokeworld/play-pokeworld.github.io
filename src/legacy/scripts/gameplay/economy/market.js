const MARKET_STOCK = {
 kanto: [1,4,7,133,137,106,107,122,124,131],
 johto: [152,155,158,172,173,174,175,236,196,197,199,213,238,239,240]
};

function getMarketPokemon(){
 if(typeof G === 'undefined' || !G) return [];
 const region = (G.region || 'kanto');
 let stock = (region === 'johto') ? MARKET_STOCK.johto.slice() : MARKET_STOCK.kanto.slice();
 try {
 const locs = (region === 'johto') ? (typeof LOCS_JOHTO !== 'undefined' ? LOCS_JOHTO : LOCS) : LOCS;
 const wildSet = new Set();
 for(const loc of Object.values(locs)){
 for(const w of (loc.wild || [])) wildSet.add(+w[0]);
 }
 stock = stock.filter(id => !wildSet.has(id));
 } catch(e){}
 const evoTargets = new Set();
 if(typeof LEVEL_EVO_MAP !== 'undefined'){
 for(const t of Object.values(LEVEL_EVO_MAP)) evoTargets.add(+t);
 }
 if(typeof STONE_EVO !== 'undefined'){
 for(const k in STONE_EVO){
 for(const t of Object.values(STONE_EVO[k])) evoTargets.add(+t);
 }
 }
 const allowList = new Set([137,133,124]);
 stock = stock.filter(id => !evoTargets.has(id) || allowList.has(id));
 const banned = (region === 'johto') ? [243,244,245,249,250,251] : [144,145,146,150,151];
 stock = stock.filter(id => !banned.includes(id));
 return stock;
}

function getPokemonPrice(id){
 if(id===151) return 100000;
 if(id===150) return 75000;
 if([144,145,146].includes(id)) return 50000;
 const d=PD[id];
 if(!d) return 999999;
 const bst=d[3]+d[4]+d[5]+d[6];
 if([1,4,7,152,155,158].includes(id)) return 5000;
 if([2,5,8].includes(id)) return 8000;
 if([3,6,9].includes(id)) return 12000;
 if([138,140].includes(id)) return 8000;
 if([139,141].includes(id)) return 12000;
 if([142].includes(id)) return 15000;
 if([147].includes(id)) return 10000;
 if([148].includes(id)) return 15000;
 if([149].includes(id)) return 25000;
 let mult=12;
 if(bst>=350) mult=22;
 else if(bst>=300) mult=18;
 else if(bst>=250) mult=15;
 else if(bst>=200) mult=13;
 return Math.max(1500, Math.floor(bst*mult));
}

function renderMarket(el){
 const ids=getMarketPokemon();
 
 const filterBar = document.getElementById('fs-panel-filters');
 if(filterBar){
 filterBar.style.display = 'flex';
 filterBar.style.alignItems = 'center';
 filterBar.style.justifyContent = 'flex-end';
 filterBar.innerHTML = `<span class="extracted-template-style-212">${t('money')}: <b class="extracted-template-style-213">${G.money.toLocaleString()}₽</b></span>`;
 }

 if(!ids.length){
 el.innerHTML=`<div class="extracted-template-style-207">${t('market_empty')}</div>`;
 return;
 }
 const cats={starter:[],fossil:[],rare:[],other:[]};
 for(const id of ids){
 if([1,4,7,152,155,158].includes(id)) cats.starter.push(id);
 else if([138,139,140,141,142].includes(id)) cats.fossil.push(id);
 else if([133,137,106,107,122,124,131,175,236].includes(id)) cats.rare.push(id);
 else cats.other.push(id);
 }
 let html='';
 const catLabels={starter:t('market_cat_starter')||'Starters',fossil:t('market_cat_fossil')||'Fossils',rare:t('market_cat_rare')||'Rare',other:t('market_cat_other')||'Other'};
 for(const cat of ['starter','fossil','rare','other']){
 if(!cats[cat].length) continue;
 html+=`<div class="extracted-template-style-214">${catLabels[cat]}</div>`;
 html+=cats[cat].map(id=>{
 const d=PD[id];
 const price=getPokemonPrice(id);
 const owned=speciesOwned(id);
 const seen=G.pokedex[id]?.seen;
 const isShiny=isSpeciesShiny(id);
 return `<div class="shop-item extracted-template-style-215" data-action="legacy-call" data-call="buyPokemon" data-call-args="${id}">
 <div class="extracted-template-style-216">
 <div class="extracted-template-style-217">${spriteImg(id,'',{size:72, shiny:isShiny})}</div>
 </div>
 <div class="extracted-template-style-144">
 <div class="extracted-template-style-218">${seen?getPokeName(id):'???'} <span class="extracted-template-style-219">#${id}</span></div>
 <div class="extracted-template-style-220">${typeSpan(d[1])}${d[2]?typeSpan(d[2]):''} · BST ${d[3]+d[4]+d[5]+d[6]}</div>
 ${owned?`<div class="extracted-template-style-152">${t('bought')}</div>`:''}
 </div>
 <div class="extracted-template-style-221">${price.toLocaleString()}₽</div>
 </div>`;
 }).join('');
 }
 el.innerHTML=html;
}

function buyPokemon(id){
 const price=getPokemonPrice(id);
 if(G.money<price){notify(t("n.pas_assez_dargent"),'var(--red)');return;}
 if(speciesOwned(id)){notify(t("legacy_message_n_vous_poss_dez_d_j_cette_esp_ce"),'var(--red)');return;}
 G.money-=price;
 updateHeader();
 const isShiny = isSpeciesShiny(id);
 const p=createPoke(id,1,isShiny);
 if(!p){notify(t("legacy_message_n_erreur_lors_de_la_cr_ation_du_pok_mon"),'var(--red)');return;}
 if(G.team.length<6){
 G.team.push(p);
 notify(tr('joined_team_price', {name:p.name, price:price.toLocaleString()}),'var(--green)');
 } else {
 G.collection[String(id)]=p;
 notify(tr('sent_to_box_price', {name:p.name, price:price.toLocaleString()}),'var(--green)');
 }
 G.pokedex[id]={...(G.pokedex[id]||{}),seen:true,caught:true};
 if(isShiny) G.pokedex[id].shiny=true;
 saveGame();
 try{ autoSave(); }catch(e){}
 const fsContent = document.getElementById('fs-panel-content');
 if(fsContent && document.getElementById('fullscreen-panel-modal')?.style.display === 'flex'){
 renderMarket(fsContent);
 }
 updateHeader();
 renderTeamWindow();
}
