

var _dictionaryTab = 'items';
var _dictionarySearch = '';
function setDictionaryTab(tab){
 _dictionaryTab = tab || 'items';
 _dictionarySearch = '';
 const content = document.getElementById('fs-panel-content');
 if(content) renderDictionary(content);
}
function setDictionarySearch(value){
 _dictionarySearch = String(value || '').toLowerCase().trim();
 const content = document.getElementById('fs-panel-content');
 if(content) renderDictionary(content);
}
function _dictPokemonList(){
 const out=[];
 (G.team||[]).forEach((p,idx)=>{ if(p) out.push({p, loc:t('team_location_clean'), ref:String(idx)}); });
 Object.entries(G.collection||{}).forEach(([k,p])=>{ if(p) out.push({p, loc:t('box_pc_location'), ref:k}); });
 return out;
}
function findItemSources(key){
 const sources=[];
 const add=(label)=>{ if(label && !sources.includes(label)) sources.push(label); };
 for(const [locId,drops] of Object.entries(ROUTE_DROPS||{})) if((drops||[]).includes(key)) add(getLocName(locId));
 for(const [shopId,shop] of Object.entries(SHOPS||{})){
   const items = shop.items || shop.stock || [];
   if(Array.isArray(items) && items.some(it => (Array.isArray(it) ? it[0] : (it.key || it.id || it)) === key)) add(getShopName(shopId));
 }
 if(typeof MINE_ITEMS !== 'undefined' && MINE_ITEMS.some(it=>it.key===key)) add(t('mine_title')||'Mine');
 for(const q of (STORY_QUESTS||[])) if(q.rewardItems && q.rewardItems[key]) add(t('dict_main_quest')||'Main quest');
 if(typeof SIDE_QUESTS !== 'undefined') for(const q of Object.values(SIDE_QUESTS||{})) if(q.rewardItems && q.rewardItems[key]) add(t('dict_side_quest')||'Side quest');
 for(const r of (G.repeatables||[])) if(r.def && r.def.rewardItems && r.def.rewardItems[key]) add(t('dict_repeatable_quest')||'Repeatable quest');
 if(ITEMS[key] && ITEMS[key].type === 'fossil') add(t('fossil_lab')||'Fossil Lab');
 if(!sources.length) add(t('dict_unknown_source')||'Source not listed');
 return sources;
}
function openAbilityInfo(key){
 const info = TALENTS_FULL[key];
 if(!info) return;
 const inner = document.getElementById('poke-modal-inner');
 if(!inner) return;
 const species = [];
 if(typeof getSpeciesTalents === 'function'){
   for(let id=1; id<=(PD?PD.length:0); id++){
     if(PD[id] && getSpeciesTalents(id).includes(key)) species.push(id);
   }
 }
 inner.innerHTML = `<div class="modal-title"><div>${typeof getIcon==='function'?getIcon('training',16):''} ${info.name}</div><span class="modal-close" data-action="close-poke-modal">✕</span></div>
 <div class="dict-info-block"><div><b>${t('dict_rarity')||'Rarity'}</b> : ${getRarityLabel(info.rarity)}</div><p>${info.info||''}</p></div>
 <div class="dict-info-title">${t('dict_affected_pokemon')||'Affected Pokémon'}</div>
 <div class="dict-chip-list">${species.length?species.map(id=>`<span class="dict-chip">#${id} ${getPokeName(id)}</span>`).join(''):`<span class="dict-muted">${t('dict_no_pokemon_listed')||'No Pokémon listed.'}</span>`}</div>`;
 document.getElementById('poke-modal').classList.add('open');
}
function renderDictionary(el){
 el.classList.add('dictionary-panel-content');
 const tab = _dictionaryTab || 'items';
 const q = _dictionarySearch || '';
 const tabs = [{id:'items',label:t('dict_items')||'Objets'},{id:'moves',label:t('dict_moves')||'Attaques'},{id:'abilities',label:t('dict_abilities')||'Talents'}];
 let html = `<div class="dict-toolbar"><div class="dict-tabs">${tabs.map(tb=>`<button class="hbtn dict-tab ${tab===tb.id?'active':''}" data-action="legacy-call" data-call="setDictionaryTab" data-call-args="'${tb.id}'">${tb.label}</button>`).join('')}</div><input class="dict-search" data-action="filter-dictionary" value="${q.replace(/"/g,'&quot;')}" placeholder="${t('dict_search_placeholder') || 'Search...'}"></div>`;
 if(tab === 'items'){
   let keys = Object.keys(ITEMS||{}).sort((a,b)=>getItemName(a).localeCompare(getItemName(b)));
   if(q) keys = keys.filter(k => (getItemName(k)+' '+k+' '+getItemDesc(k)).toLowerCase().includes(q));
   html += `<div class="dict-grid">${keys.map(k=>{
     const owned = (G.inventory&&G.inventory[k]>0);
     const sources = findItemSources(k);
     return `<div class="dict-entry ${owned?'owned':''}" data-action="legacy-call" data-call="openItemInfo" data-call-args="'${k}'">
       <div class="dict-entry-icon">${itemSpriteHtml(k,32)}</div><div><b>${getItemName(k)}</b><span>${owned?tr('dict_owned_qty',{count:G.inventory[k]}):(t('dict_not_owned')||'Not owned')}</span><small>${sources.slice(0,3).join(' · ')}${sources.length>3?'…':''}</small></div>
     </div>`;
   }).join('') || `<div class="dict-muted">${t('dict_no_results')||'No results.'}</div>`}</div>`;
 } else if(tab === 'moves'){
   const mons = _dictPokemonList();
   let keys = Object.keys(MOVES||{}).sort((a,b)=>getMoveName(a).localeCompare(getMoveName(b)));
   if(q) keys = keys.filter(k => (getMoveName(k)+' '+k+' '+(MOVES[k]?.type||'')).toLowerCase().includes(q));
   html += `<div class="dict-grid">${keys.map(k=>{
     const mv = MOVES[k];
     const users = mons.filter(o=>(o.p.moves||[]).some(m=>m.id===k));
     return `<div class="dict-entry ${users.length?'owned':''}" data-type-color="${TYPE_COLORS[mv?.type||'']||'#555'}" data-action="legacy-call" data-call="openMoveInfo" data-call-args="'${k}'">
       <div class="dict-entry-icon type-badge ${typeClass(mv?.type||'?')}">${mv?.type||'?'}</div><div><b>${getMoveName(k)}</b><span>${users.length?tr('dict_move_users',{count:users.length}):(t('dict_move_users_none')||'No Pokémon know this move')}</span><small>${users.slice(0,4).map(u=>u.p.name).join(' · ')}${users.length>4?'…':''}</small></div>
     </div>`;
   }).join('') || `<div class="dict-muted">${t('dict_no_results')||'No results.'}</div>`}</div>`;
 } else {
   const mons = _dictPokemonList();
   const unlocked = new Set();
   Object.values(G.unlockedTalents||{}).forEach(arr=>(arr||[]).forEach(tal=>unlocked.add(tal)));
   mons.forEach(o=>{ if(o.p.talent) unlocked.add(o.p.talent); });
   let keys = Object.keys(TALENTS_FULL||{}).sort((a,b)=>TALENTS_FULL[a].name.localeCompare(TALENTS_FULL[b].name));
   if(q) keys = keys.filter(k => (TALENTS_FULL[k].name+' '+k+' '+(TALENTS_FULL[k].info||'')).toLowerCase().includes(q));
   html += `<div class="dict-grid">${keys.map(k=>{
     const info=TALENTS_FULL[k]; const users=mons.filter(o=>o.p.talent===k);
     return `<div class="dict-entry ${unlocked.has(k)?'owned':''}" data-action="legacy-call" data-call="openAbilityInfo" data-call-args="'${k}'">
       <div class="dict-entry-icon">${typeof getIcon==='function'?getIcon('training',16):''}</div><div><b>${info.name}</b><span>${unlocked.has(k)?`${t('dict_ability_unlocked')||'Unlocked'} · ${tr('dict_ability_carriers',{count:users.length})}`:(t('dict_ability_locked')||'Locked')} · ${getRarityLabel(info.rarity)}</span><small>${users.slice(0,4).map(u=>u.p.name).join(' · ')}${users.length>4?'…':''}</small></div>
     </div>`;
   }).join('') || `<div class="dict-muted">${t('dict_no_results')||'No results.'}</div>`}</div>`;
 }
 el.innerHTML = html;
 const input = el.querySelector('.dict-search');
 if(input){ input.focus(); input.setSelectionRange(input.value.length,input.value.length); }
 if(typeof applyDynamicStyles === 'function') applyDynamicStyles(el);
}


var _atollTab = 'menu';
const ATOLL_RANK_SEQUENCE = ['E','D','C','B','A','S'];
const ATOLL_MODES = {
 tower_e:{key:'tower_e', group:'tower', maxRank:'E', reward:8, level:100, size:4, label:'atoll_tower_e', pool:[10,11,13,14,129,191]},
 tower_d:{key:'tower_d', group:'tower', maxRank:'D', reward:12, level:100, size:4, label:'atoll_tower_d', pool:[10,11,13,14,16,19,21,23,41,43,50,54,60,72,74,81,86,90,96,100,102,104,109,116,118,129,161,163,165,167,172,173,174,175,187,191,194,220,236,238,239,240,246]},
 tower_c:{key:'tower_c', group:'tower', maxRank:'C', reward:18, level:100, size:5, label:'atoll_tower_c', pool:[18,26,45,57,62,71,73,85,89,97,99,105,117,119,162,164,168,171,195,210,224,237]},
 tower_b:{key:'tower_b', group:'tower', maxRank:'B', reward:26, level:100, size:6, label:'atoll_tower_b', pool:[18,26,45,57,62,65,73,85,89,94,97,99,105,112,117,119,121,123,130,137,162,164,168,171,195,196,197,199,205,208,210,224,237]},
 tower_a:{key:'tower_a', group:'tower', maxRank:'A', reward:38, level:100, size:6, label:'atoll_tower_a', pool:[65,94,112,115,121,123,127,130,131,143,181,184,196,197,199,205,208,212,214,217,229,230,242]},
 tower_s:{key:'tower_s', group:'tower', maxRank:'S', reward:55, level:100, size:6, label:'atoll_tower_s', pool:[59,65,94,103,112,130,131,143,149,150,151,181,197,208,212,229,230,242,243,244,245,248,249,250,251]},
 tower_free:{key:'tower_free', group:'tower', reward:70, level:100, size:6, label:'atoll_tower_free', pool:[59,65,94,103,112,130,131,143,149,150,151,181,197,208,212,229,230,242,243,244,245,248,249,250,251]},
 factory_c:{key:'factory_c', group:'factory', maxRank:'C', reward:22, level:100, size:4, borrowed:true, label:'atoll_factory_c', pool:[83,97,122,124,127,132,137,143,185,196,197,199,214,217]},
 factory_a:{key:'factory_a', group:'factory', maxRank:'A', reward:42, level:100, size:5, borrowed:true, label:'atoll_factory_a', pool:[65,94,115,121,123,127,130,131,143,181,184,197,199,205,208,212,214,217,229]},
 arena_three:{key:'arena_three', group:'arena', maxRank:'B', reward:24, level:100, size:3, playerCap:3, label:'atoll_arena_three', pool:[26,45,62,65,73,94,121,123,130,181,184,197,205]},
 arena_no_item:{key:'arena_no_item', group:'arena', maxRank:'A', reward:30, level:100, size:3, playerCap:3, noItems:true, label:'atoll_arena_no_item', pool:[59,65,89,94,112,121,130,181,197,208,229]},
 arena_type:{key:'arena_type', group:'arena', maxRank:'A', reward:34, level:100, size:3, playerCap:3, label:'atoll_arena_type', pool:[71,73,94,95,121,123,130,181,197,205,208,212,229]},
 dome_quarter:{key:'dome_quarter', group:'dome', maxRank:'A', reward:42, level:100, size:6, label:'atoll_dome_quarter', pool:[18,59,65,94,112,121,130,131,181,197,205,208,212,229]},
 dome_final:{key:'dome_final', group:'dome', maxRank:'S', reward:85, level:100, size:6, label:'atoll_dome_final', pool:[59,65,94,103,112,130,131,143,149,150,181,197,208,212,229,230,242,243,244,245,248,249,250]}
};
const ATOLL_SHOP = [ ['rarecandy',25], ['leftovers',120], ['assault_vest',180], ['eviolite',200], ['choice_band',260], ['choice_specs',260], ['choice_scarf',260], ['life_orb',360] ];
function ensureAtollState(){ if(!G.atoll || typeof G.atoll !== 'object') G.atoll = {tokens:0, streak:0, bestStreak:0, winsByMode:{}}; if(!G.atoll.winsByMode) G.atoll.winsByMode = {}; if(typeof G.atoll.tokens !== 'number') G.atoll.tokens = 0; if(typeof G.atoll.streak !== 'number') G.atoll.streak = 0; if(typeof G.atoll.bestStreak !== 'number') G.atoll.bestStreak = 0; return G.atoll; }
function isAtollUnlocked(){ return (typeof isRegionLeagueWon === 'function') ? isRegionLeagueWon('kanto') : !!G.championTitle; }
function setAtollTab(tab){ _atollTab = tab || 'menu'; renderBattleAtoll(document.getElementById('fs-panel-content')); }
function atollTeamForRestriction(mode){ const team = (G.team||[]).filter(Boolean); return mode.playerCap ? team.slice(0, mode.playerCap) : team; }
function validateAtollRankRestriction(mode){
 if(!mode || !mode.maxRank || mode.borrowed) return true;
 const invalid = atollTeamForRestriction(mode).filter(p => p && typeof rankAllowsPokemon === 'function' && !rankAllowsPokemon(mode.maxRank, p.id));
 if(invalid.length){ notify(tr('atoll_rank_blocked', {rank:mode.maxRank, pokemon:invalid.slice(0,3).map(p=>p.name||getPokeName(p.id)).join(', ')}), 'var(--red)'); return false; }
 return true;
}
function createAtollTeam(modeKey='tower_c'){
 const mode = ATOLL_MODES[modeKey] || ATOLL_MODES.tower_c;
 const pool = mode.pool || [18,65,112,59,103,130]; const picked=[]; let guard=0;
 while(picked.length < mode.size && guard++ < 120){ const id = pool[rand(0,pool.length-1)]; if(!picked.includes(id)) picked.push(id); }
 return picked.map((id,i)=>{ const p=createPoke(id, mode.level, false); if(p){ p.name = getPokeName(id); const preferred = {65:['psychic','shadowball','psybeam','thunderbolt'],94:['shadowball','nightshade','sludgebomb','psychic'],59:['fireblast','flamethrower','bite'],130:['surf','bite','dragonbreath','icebeam'],149:['dragonbreath','outrage','earthquake','flamethrower'],131:['surf','icebeam','thunderbolt','psychic'],248:['stoneedge','earthquake','crunch','fireblast'],242:['icebeam','psychic','thunderbolt','flamethrower'],208:['irontail','earthquake','rockthrow','stoneedge'],229:['crunch','flamethrower','fireblast','sludgebomb'],181:['thunderbolt','thunder','irontail','bodyslam'],212:['metalclaw','irontail','bugbite','slash']}; if(preferred[id]) p.moves = preferred[id].filter(m=>MOVES[m]).slice(0,4).map(m=>({id:m})); p.evs={hp:6,atk:6,def:6,spa:6,spd:6,spe:6}; p.ivs={hp:6,atk:6,def:6,spa:6,spd:6,spe:6}; if(typeof recalcPokeStats === 'function') { recalcPokeStats(p); p.currentHP=p.maxHP; }} return p; }).filter(Boolean);
}
function createAtollRentalTeam(modeKey){ return createAtollTeam(modeKey).slice(0,3).map(p=>{ p.name = `${t('atoll_rental')} ${p.name}`; return p; }); }
function restoreAtollTeam(){ if(G && G._atollTeamBackup){ G.team = G._atollTeamBackup; delete G._atollTeamBackup; } if(G && G._atollTeamSlotItemsBackup){ G.teamSlotItems = G._atollTeamSlotItemsBackup; delete G._atollTeamSlotItemsBackup; } try{ if(typeof syncTeamSlotHeldItems === 'function') syncTeamSlotHeldItems(); renderTeamWindow(); }catch(_){} }
function startAtollBattle(modeKey='tower_c'){
 ensureAtollState(); if(!isAtollUnlocked()){ notify(t('atoll_locked'), 'var(--red)'); return; } if(typeof hasActiveTrainingBattle === 'function' && hasActiveTrainingBattle()){ notify(t('training_in_progress_no_battle'), 'var(--red)'); return; } if(battle && battle.active){ notify(t('battle_in_progress'), 'var(--red)'); return; } if(!G.team || !G.team.length){ notify(t('no_pokemon_in_team'), 'var(--red)'); return; }
 const mode = ATOLL_MODES[modeKey] || ATOLL_MODES.tower_c; if(!validateAtollRankRestriction(mode)) return;
 if(mode.borrowed){ G._atollTeamBackup = JSON.parse(JSON.stringify(G.team)); G._atollTeamSlotItemsBackup = JSON.parse(JSON.stringify(G.teamSlotItems||[])); G.team = createAtollRentalTeam(mode.key); G.teamSlotItems=[]; }
 else if(mode.playerCap && G.team.length > mode.playerCap){ G._atollTeamBackup = JSON.parse(JSON.stringify(G.team)); G._atollTeamSlotItemsBackup = JSON.parse(JSON.stringify(G.teamSlotItems||[])); G.team = G.team.slice(0, mode.playerCap); if(Array.isArray(G.teamSlotItems)) G.teamSlotItems = G.teamSlotItems.slice(0, mode.playerCap); }
 if(mode.noItems){ G._atollTeamSlotItemsBackup = JSON.parse(JSON.stringify(G.teamSlotItems||[])); G.teamSlotItems=[]; try{ syncTeamSlotHeldItems(); }catch(_){} }
 const team=createAtollTeam(mode.key); closeFullscreenPanel(); const ok=startBattle(null,true,'atoll',team);
 if(ok === false){ restoreAtollTeam(); openFullscreenPanel('atoll'); return; }
 if(ok!==false && battle && battle.active){ battle.isAtollBattle=true; battle.atollMode=mode.key; battle.atollReward=mode.reward || 10; battle.atollBorrowed=!!mode.borrowed; battle.atollPlayerCap=mode.playerCap||0; battle.trainerVisual = {name:t('battle_atoll_title'), role:'atoll', style:[mode.group, mode.key], sprite:'atoll'}; try{ renderBattleTeamRow(); }catch(_){} addBattleTimeline(`${t('battle_atoll_title')} · ${t(mode.label)}`, 'trainer'); }
}
function completeAtollBattle(tokens, modeKey){ const st=ensureAtollState(); const gain=Math.max(0, Number(tokens||0)); st.tokens += gain; st.streak = (st.streak||0)+1; st.bestStreak=Math.max(st.bestStreak||0, st.streak); st.winsByMode[modeKey||'tower_c']=(st.winsByMode[modeKey||'tower_c']||0)+1; restoreAtollTeam(); notify(tr('atoll_win_reward', {tokens:gain, streak:st.streak}), 'var(--green)'); }
function buyAtollItem(key, price){ const st=ensureAtollState(); price=Number(price||0); if(st.tokens < price){ notify(t('atoll_not_enough_tokens'), 'var(--red)'); return; } st.tokens -= price; addToInventory(key, 1); saveGame(); renderBattleAtoll(document.getElementById('fs-panel-content')); notify(tr('atoll_item_bought', {item:getItemName(key)}), 'var(--green)'); }
function atollNav(){ const tabs=[['menu','atoll_home'],['tower','atoll_tower'],['factory','atoll_factory'],['arena','atoll_arena'],['dome','atoll_dome'],['shop','atoll_shop']]; return `<div class="atoll-nav">${tabs.map(([id,label])=>`<button class="hbtn ${_atollTab===id?'active':''}" data-action="legacy-call" data-call="setAtollTab" data-call-args="'${id}'">${t(label)}</button>`).join('')}</div>`; }
function atollRankBadge(mode){ return mode.maxRank ? `<span class="atoll-rank-lock rank-${mode.maxRank.toLowerCase()}">${tr('atoll_max_rank', {rank:mode.maxRank})}</span>` : `<span class="atoll-rank-lock free">${t('atoll_rank_free')}</span>`; }
function atollModeCard(key){ const m=ATOLL_MODES[key]; return `<div class="atoll-rank-card atoll-mode-card rank-${(m.maxRank||'free').toLowerCase()}"><div>${atollRankBadge(m)}<b>${t(m.label)}</b><span>${tr('atoll_mode_rule', {level:m.level, size:m.size, reward:m.reward})}</span></div><button class="hbtn" data-action="legacy-call" data-call="startAtollBattle" data-call-args="'${m.key}'">${t('atoll_start')}</button></div>`; }
function renderAtollTab(){
 if(_atollTab==='tower') return `<div class="atoll-section-title">${t('atoll_tower')}</div><div class="atoll-rank-grid">${['tower_e','tower_d','tower_c','tower_b','tower_a','tower_s','tower_free'].map(atollModeCard).join('')}</div>`;
 if(_atollTab==='factory') return `<div class="atoll-section-title">${t('atoll_factory')}</div><div class="atoll-rank-grid">${['factory_c','factory_a'].map(atollModeCard).join('')}</div>`;
 if(_atollTab==='arena') return `<div class="atoll-section-title">${t('atoll_arena')}</div><div class="atoll-rank-grid">${['arena_three','arena_no_item','arena_type'].map(atollModeCard).join('')}</div>`;
 if(_atollTab==='dome') return `<div class="atoll-section-title">${t('atoll_dome')}</div><div class="atoll-rank-grid">${['dome_quarter','dome_final'].map(atollModeCard).join('')}</div>`;
 if(_atollTab==='shop') return `<div class="atoll-section-title">${t('atoll_shop')}</div><div class="atoll-shop-grid">${ATOLL_SHOP.map(([key,price])=>`<div class="atoll-shop-card"><div>${itemSpriteHtml(key,32)}<b>${getItemName(key)}</b><span>${price} ${t('atoll_tokens')}</span></div><button class="hbtn" data-action="legacy-call" data-call="buyAtollItem" data-call-args="'${key}',${price}">${t('buy_btn')}</button></div>`).join('')}</div>`;
 return `<div class="atoll-rank-grid atoll-home-grid"><button class="atoll-rank-card" data-action="legacy-call" data-call="setAtollTab" data-call-args="'tower'"><div><b>${t('atoll_tower')}</b></div></button><button class="atoll-rank-card" data-action="legacy-call" data-call="setAtollTab" data-call-args="'factory'"><div><b>${t('atoll_factory')}</b></div></button><button class="atoll-rank-card" data-action="legacy-call" data-call="setAtollTab" data-call-args="'arena'"><div><b>${t('atoll_arena')}</b></div></button><button class="atoll-rank-card" data-action="legacy-call" data-call="setAtollTab" data-call-args="'dome'"><div><b>${t('atoll_dome')}</b></div></button></div>`;
}
function renderBattleAtoll(el){ if(!el) return; const st=ensureAtollState(); if(!isAtollUnlocked()){ el.innerHTML = `<div class="atoll-panel"><div class="atoll-hero"><div><h2>${t('battle_atoll_title')}</h2><p>${t('atoll_locked_desc')}</p></div></div></div>`; return; } el.innerHTML = `<div class="atoll-panel"><div class="atoll-hero"><div><h2>${t('battle_atoll_title')}</h2><p>${t('battle_atoll_desc')}</p></div><div class="atoll-token-box"><b>${st.tokens}</b><span>${t('atoll_tokens')}</span><small>${tr('atoll_streak', {streak:st.streak||0, best:st.bestStreak||0})}</small></div></div>${atollNav()}${renderAtollTab()}</div>`; }

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
 guide: t('guide_title'),
 atoll: t('battle_atoll_title')
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
 else if(panelType === 'atoll') renderBattleAtoll(content);

 modal.style.display = 'flex';
}

function closeFullscreenPanel(){
 const modal = document.getElementById('fullscreen-panel-modal');
 if(modal) modal.style.display = 'none';
}


// --- Migrated to ES module, globals exposed ---
if (typeof setDictionarySearch !== 'undefined' && typeof window !== 'undefined') window.setDictionarySearch = setDictionarySearch;
if (typeof findItemSources !== 'undefined' && typeof window !== 'undefined') window.findItemSources = findItemSources;
if (typeof setDictionaryTab !== 'undefined' && typeof window !== 'undefined') window.setDictionaryTab = setDictionaryTab;
if (typeof renderDictionary !== 'undefined' && typeof window !== 'undefined') window.renderDictionary = renderDictionary;
if (typeof openAbilityInfo !== 'undefined' && typeof window !== 'undefined') window.openAbilityInfo = openAbilityInfo;
if (typeof openFullscreenPanel !== 'undefined' && typeof window !== 'undefined') window.openFullscreenPanel = openFullscreenPanel;
if (typeof closeFullscreenPanel !== 'undefined' && typeof window !== 'undefined') window.closeFullscreenPanel = closeFullscreenPanel;
if (typeof renderBattleAtoll !== 'undefined' && typeof window !== 'undefined') window.renderBattleAtoll = renderBattleAtoll;
if (typeof setAtollTab !== 'undefined' && typeof window !== 'undefined') window.setAtollTab = setAtollTab;
if (typeof restoreAtollTeam !== 'undefined' && typeof window !== 'undefined') window.restoreAtollTeam = restoreAtollTeam;
if (typeof startAtollBattle !== 'undefined' && typeof window !== 'undefined') window.startAtollBattle = startAtollBattle;
if (typeof completeAtollBattle !== 'undefined' && typeof window !== 'undefined') window.completeAtollBattle = completeAtollBattle;
if (typeof buyAtollItem !== 'undefined' && typeof window !== 'undefined') window.buyAtollItem = buyAtollItem;

export {};

