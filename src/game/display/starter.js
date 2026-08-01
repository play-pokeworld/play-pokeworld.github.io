function chooseStarter(region){
 region = region || G.region || 'kanto';
 
 const already = region==='johto' ? (G.starterJohto || (G.regionStarter&&G.regionStarter.johto)) :
                 region==='hoenn' ? (G.starterHoenn || (G.regionStarter&&G.regionStarter.hoenn)) :
                 (G.starterKanto || G.starter);
 if(already){
 const m=document.getElementById('starter-modal');
 if(m) m.style.display='none';
 return;
 }
 showStarterModal(region);
}

function showStarterModal(region){
 region = region || 'kanto';
 const isJohto = region === 'johto';
 const isHoenn = region === 'hoenn';
 const starters = isJohto ? [
 {id:152, name:getPokeName(152), desc: t('starter_johto_chikorita_desc'), color:'#78c850'},
 {id:155, name:getPokeName(155), desc: t('starter_johto_cyndaquil_desc'), color:'#f08030'},
 {id:158, name:getPokeName(158), desc: t('starter_johto_totodile_desc'), color:'#6890f0'}
 ] : isHoenn ? [
 {id:252, name:getPokeName(252), desc: t('starter_hoenn_treecko_desc')||'Arcko - Plante', color:'#78c850'},
 {id:255, name:getPokeName(255), desc: t('starter_hoenn_torchic_desc')||'Poussifeu - Feu', color:'#f08030'},
 {id:258, name:getPokeName(258), desc: t('starter_hoenn_mudkip_desc')||'Gobou - Eau', color:'#6890f0'}
 ] : [
 {id:1, name: getPokeName(1), desc: t('starter_kanto_bulbasaur_desc'), color:'#78c850'},
 {id:4, name: getPokeName(4), desc: t('starter_kanto_charmander_desc'), color:'#f08030'},
 {id:7, name: getPokeName(7), desc: t('starter_kanto_squirtle_desc'), color:'#6890f0'}
 ];
 const welcome = isJohto ? t('starter_welcome_johto') : isHoenn ? (t('starter_welcome_hoenn')||'Bienvenue à Hoenn !') : t('starter_welcome_kanto');
 const title = isJohto ? t('starter_title_johto') : isHoenn ? (t('starter_title_hoenn')||'Choisis ton partenaire') : t('starter_title_kanto');
 const sub = t('starter_subtitle');
 const modal = document.getElementById('starter-modal');
 const inner = document.getElementById('starter-modal-inner');
 if(!modal || !inner) return;
 inner.innerHTML = `<div>
 <div class="pw-text-sm pw-light1 pw-center">${welcome}</div>
 <div class="pw-center">
   <div class="pw-text-md pw-bold pw-light2">${title}</div>
   <div class="pw-text-sm pw-light1">${sub}</div>
 </div>
 <div>
 ${starters.map(st=>`
 <div class="starter-card starter-card--custom" data-starter-id="${st.id}" data-starter-region="${region}">
   <div class="poke-sprite">${spriteImg(st.id,'',{size:72})}</div>
   <div class="pw-flex-1">
     <div class="poke-name pw-text-md">${st.name} <span class="pw-text-sm">#${st.id}</span></div>
     <div class="pw-text-glow">${st.desc}</div>
   </div>
   <div>${t('choose')}</div>
 </div>
 `).join('')}
 </div>
 <div class="pw-text-sm pw-light1 pw-center">${t('starter_required')}</div>
 </div>`;
 inner.onclick = function(ev){
 const card = ev.target && ev.target.closest ? ev.target.closest('.starter-card') : null;
 if(!card) return;
 ev.preventDefault(); ev.stopPropagation();
 const sid = parseInt(card.getAttribute('data-starter-id'),10);
 const sreg = card.getAttribute('data-starter-region') || 'kanto';
 try { pickStarter(sid, sreg); } catch(err){ console.error('[starter] pickStarter failed', err); G._starterPickLock=false; }
 };
 modal.style.display='flex';
 
 modal.onclick = function(e){ if(e.target===modal){  e.stopPropagation(); } };
}

function pickStarter(id, region){
 if(G._starterPickLock) return;
 G._starterPickLock=true;
 const _releaseLock=()=>{G._starterPickLock=false;};
 setTimeout(_releaseLock,1500);
 try {
 region = region || G.region || 'kanto';
 
 if(region==='johto' && (G.starterJohto || (G.regionStarter&&G.regionStarter.johto))) { _releaseLock(); return; }
 if(region==='hoenn' && (G.starterHoenn || (G.regionStarter&&G.regionStarter.hoenn))) { _releaseLock(); return; }
 if(region!=='johto' && region!=='hoenn' && (G.starterKanto || G.starter)) { _releaseLock(); return; }
 const p=createPoke(id,5);
 if(!p){ console.warn('[starter] createPoke null', id); _releaseLock(); return; }
 
 if(G.team.length<6){
 G.team.push(p);
 } else {
 const _sKey = (typeof generateUniqueBoxId==='function') ? generateUniqueBoxId(id) : (!G.collection[String(id)] ? String(id) : ('box_' + id + '_' + Date.now())); G.collection[_sKey]=p;
 }
 // Passe 18 : espèce mémorisée (les équipes du rival en dépendent).
 if(!G.starterSpecies) G.starterSpecies={};
 G.starterSpecies[region]=id;
 if(region==='johto'){ 
 G.starterJohto=true;
 if(!G.regionStarter) G.regionStarter={};
 G.regionStarter.johto=true;
 } else if(region==='hoenn'){
 G.starterHoenn=true;
 if(!G.regionStarter) G.regionStarter={};
 G.regionStarter.hoenn=true;
 } else {
 G.starterKanto=true;
 G.starter=true; 
 if(!G.regionStarter) G.regionStarter={};
 G.regionStarter.kanto=true;
 }
 G.pokedex[id]={...(G.pokedex[id]||{}), seen:true,caught:true};
 notify(tr('joined_team', {name:p.name}), 'var(--green)');
 setMsg(tr('partner_now', {name:p.name}));
 const modal=document.getElementById('starter-modal');
 if(modal) modal.style.display='none';
 saveGame();
 updateHeader();
 showTab('info');
 renderMap();
 } finally { _releaseLock(); }
}


function checkStarterNeeded(){
 const reg = G.region || 'kanto';
 const needKanto = reg==='kanto' && !(G.starterKanto || G.starter);
 const needJohto = reg==='johto' && !G.starterJohto && !(G.regionStarter && G.regionStarter.johto);
 const needHoenn = reg==='hoenn' && !G.starterHoenn && !(G.regionStarter && G.regionStarter.hoenn);
 
 const modal = document.getElementById('starter-modal');
 const alreadyShowing = modal && modal.style.display === 'flex';
 if(needKanto) {
 if(!alreadyShowing) showStarterModal('kanto');
 return true;
 }
 if(needJohto) {
 if(!alreadyShowing) showStarterModal('johto');
 return true;
 }
 if(needHoenn) {
 if(!alreadyShowing) showStarterModal('hoenn');
 return true;
 }
 
 if(modal && alreadyShowing) modal.style.display = 'none';
 return false;
}


// --- Migrated to ES module, globals exposed ---
if (typeof chooseStarter !== 'undefined' && typeof window !== 'undefined') window.chooseStarter = chooseStarter;
if (typeof showStarterModal !== 'undefined' && typeof window !== 'undefined') window.showStarterModal = showStarterModal;
if (typeof pickStarter !== 'undefined' && typeof window !== 'undefined') window.pickStarter = pickStarter;
if (typeof checkStarterNeeded !== 'undefined' && typeof window !== 'undefined') window.checkStarterNeeded = checkStarterNeeded;


