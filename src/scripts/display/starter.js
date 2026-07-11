// ============================================================
// STARTER — (split from map.js)
// ============================================================
function chooseStarter(region){
 region = region || G.region || 'kanto';
 // if already chosen for this region, do nothing
 const already = region==='johto' ? (G.starterJohto || (G.regionStarter&&G.regionStarter.johto)) : (G.starterKanto || G.starter);
 if(already){
 const m=document.getElementById('starter-modal');
 if(m) m.style.display='none';
 return;
 }
 showStarterModal(region);
}

function showStarterModal(region){
 region = region || 'kanto';
 const isEn = (G && G.lang === 'en');
 const isJohto = region === 'johto';
 const starters = isJohto ? [
 {id:152, name:getPokeName(152), desc: isEn ? 'Grass - Calm & sturdy' : 'Plante - Calme et robuste', color:'#78c850'},
 {id:155, name:getPokeName(155), desc: isEn ? 'Fire - Fast & explosive' : 'Feu - Rapide et explosif', color:'#f08030'},
 {id:158, name:getPokeName(158), desc: isEn ? 'Water - Strong jaws' : 'Eau - Mâchoires puissantes', color:'#6890f0'}
 ] : [
 {id:1, name: getPokeName(1), desc: isEn ? 'Grass/Poison - Solid defensive resilience' : 'Plante/Poison - Solide défensivement', color:'#78c850'},
 {id:4, name: getPokeName(4), desc: isEn ? 'Fire - High offensive firepower' : 'Feu - Puissance offensive élevée', color:'#f08030'},
 {id:7, name: getPokeName(7), desc: isEn ? 'Water - Great balanced durability' : 'Eau - Grande endurance', color:'#6890f0'}
 ];
 const welcome = isJohto
 ? (isEn ? 'Welcome to Johto! Professor Elm is waiting in New Bark Town.' : 'Bienvenue à Johto ! Le Prof. Orme vous attend à Bourg Geon.')
 : (isEn ? 'Welcome to Kanto! Professor Oak is waiting in Pallet Town.' : 'Bienvenue à Kanto ! Le Prof. Chen vous attend à Bourg Palette.');
 const title = isJohto
 ? (isEn ? 'Choose your Johto Starter!' : 'Choisissez votre Starter Johto !')
 : (isEn ? 'Choose your Starter!' : 'Choisissez votre Starter !');
 const sub = isEn ? 'This Pokémon will accompany you throughout your adventure in this region.' : 'Ce Pokémon vous accompagnera tout au long de votre aventure dans cette région.';
 const modal = document.getElementById('starter-modal');
 const inner = document.getElementById('starter-modal-inner');
 if(!modal || !inner) return;
 inner.innerHTML = `<div>
 <div style="font-size: 13px;color:var(--light1);margin-bottom:12px;text-align:center">${welcome}</div>
 <div style="text-align:center;margin-bottom:20px">
   <div style="font-size: 15px;font-weight:bold;color:var(--light2);margin-bottom:6px">${title}</div>
   <div style="color:var(--light1);font-size: 13px">${sub}</div>
 </div>
 <div>
 ${starters.map(st=>`
 <div class="starter-card" data-starter-id="${st.id}" data-starter-region="${region}" style="cursor:pointer;background:${st.color}22;border-left:4px solid ${st.color}">
   <div class="poke-sprite" style="background:${st.color}44">${spriteImg(st.id,'',{size:72})}</div>
   <div style="flex:1">
     <div class="poke-name" style="color:white;text-shadow:0 1px 3px rgba(0,0,0,0.5);font-size: 15px;margin-bottom:4px">${st.name} <span style="color:rgba(255,255,255,0.7);font-size: 13px">#${st.id}</span></div>
     <div style="font-size: 13px;color:rgba(255,255,255,0.85);text-shadow:0 1px 2px rgba(0,0,0,0.3)">${st.desc}</div>
   </div>
   <div style="background:${st.color};color:white;font-size:13px;padding:6px 14px;border-radius:20px;font-weight:bold;align-self:center">${isEn ? 'Choose' : 'Choisir'}</div>
 </div>
 `).join('')}
 </div>
 <div style="margin-top:20px;font-size:13px;color:var(--light1);text-align:center">${isEn ? 'You must choose a starter to continue. This window cannot be closed.' : 'Vous devez choisir un starter pour continuer. Cette fenêtre ne peut pas être fermée.'}</div>
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
 // prevent closing by clicking backdrop
 modal.onclick = function(e){ if(e.target===modal){ /* block */ e.stopPropagation(); } };
}

function pickStarter(id, region){
 if(G._starterPickLock) return;
 G._starterPickLock=true;
 const _releaseLock=()=>{G._starterPickLock=false;};
 setTimeout(_releaseLock,1500);
 try {
 region = region || G.region || 'kanto';
 // prevent double pick
 if(region==='johto' && (G.starterJohto || (G.regionStarter&&G.regionStarter.johto))) { _releaseLock(); return; }
 if(region!=='johto' && (G.starterKanto || G.starter)) { _releaseLock(); return; }
 const p=createPoke(id,5);
 if(!p){ console.warn('[starter] createPoke null', id); _releaseLock(); return; }
 // ensure team has space – if full, send to box, but starter should go to team first slot if empty
 if(G.team.length<6){
 G.team.push(p);
 } else {
 G.collection[id]=p;
 }
 if(region==='johto'){
 G.starterJohto=true;
 if(!G.regionStarter) G.regionStarter={};
 G.regionStarter.johto=true;
 } else {
 G.starterKanto=true;
 G.starter=true; // legacy
 if(!G.regionStarter) G.regionStarter={};
 G.regionStarter.kanto=true;
 }
 G.pokedex[id]={...(G.pokedex[id]||{}), seen:true,caught:true};
 const isEn = G.lang==='en';
 notify(isEn ? ` ${p.name} joined your team!` : ` ${p.name} rejoint votre équipe !`, 'var(--green)');
 setMsg(p.name + (isEn ? ' is now your partner!' : ' est maintenant votre partenaire !'));
 const modal=document.getElementById('starter-modal');
 if(modal) modal.style.display='none';
 saveGame();
 updateHeader();
 showTab('info');
 renderMap();
 } finally { _releaseLock(); }
}

// Auto-show starter modal on load / region change

function checkStarterNeeded(){
 const reg = G.region || 'kanto';
 const needKanto = reg==='kanto' && !(G.starterKanto || G.starter);
 const needJohto = reg==='johto' && !G.starterJohto && !(G.regionStarter && G.regionStarter.johto);
 // Don't re-trigger if modal is already showing for the correct region
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
 // Starter already chosen — make sure modal is hidden
 if(modal && alreadyShowing) modal.style.display = 'none';
 return false;
}

// ============================================================
// UNDERGROUND MINE (Souterrain / Mine de Pierres d'Évolution)

// --- Bouton"?"+ fenêtre d'aide au code couleur de la carte ---


