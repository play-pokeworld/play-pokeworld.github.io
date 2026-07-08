
// ===== extracted from src/scripts/gameplay/battle.js =====
function getTraineePoke(){
  if(G.selectedTraineeUid){
    const inTeamIdx = G.team.findIndex(p => p && p.uid === G.selectedTraineeUid);
    if(inTeamIdx !== -1){
      G.selectedTraineeLoc = 'team';
      G.selectedTraineeId = String(inTeamIdx);
      return G.team[inTeamIdx];
    }
    for(const k in (G.collection||{})){
      const p = G.collection[k];
      if(p && p.uid === G.selectedTraineeUid){
        G.selectedTraineeLoc = 'box';
        G.selectedTraineeId = k;
        return p;
      }
    }
  }
  if(G.selectedTraineeLoc === 'box' && G.selectedTraineeId != null){
    let p = G.collection[G.selectedTraineeId] || G.collection[String(G.selectedTraineeId)];
    if(!p && String(G.selectedTraineeId).startsWith('box_')){
      p = G.collection[String(G.selectedTraineeId).replace('box_','')] || G.collection[Number(String(G.selectedTraineeId).replace('box_',''))];
    }
    if(p){
      if(!p.uid) p.uid = 'p_' + Math.random().toString(36).substr(2, 9) + '_' + Math.random().toString(36).substr(2, 5);
      G.selectedTraineeUid = p.uid;
      return p;
    }
  }
  if(G.selectedTraineeLoc === 'team' && G.selectedTraineeId != null){
    const idx = Number(G.selectedTraineeId);
    if(G.team[idx]){
      const p = G.team[idx];
      if(!p.uid) p.uid = 'p_' + Math.random().toString(36).substr(2, 9) + '_' + Math.random().toString(36).substr(2, 5);
      G.selectedTraineeUid = p.uid;
      return p;
    }
  }
  const fallback = G.team[0] || null;
  if(fallback){
    if(!fallback.uid) fallback.uid = 'p_' + Math.random().toString(36).substr(2, 9) + '_' + Math.random().toString(36).substr(2, 5);
    G.selectedTraineeUid = fallback.uid;
    G.selectedTraineeLoc = 'team';
    G.selectedTraineeId = '0';
  }
  return fallback;
}
function renderTrainingWindow(){
  const el = document.getElementById('training-window-body');
  if(!el) return;
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  const unlocked = G.badges.includes('surge') || G.badges.length >= 3;
  if(!unlocked){
    el.innerHTML = `<div style="text-align:center;padding:14px;color:var(--dim);font-size:11px;">
      <div style="font-size:24px;margin-bottom:4px;">🔒</div>
      <b>${lang==='en'?'Training Room Locked':'Salle d\'Entraînement verrouillée'}</b><br>
      ${lang==='en'?'Defeat Lt. Surge in Vermilion City (3 Badges) to unlock EV Sparring Training!':'Battez le Major Bob à Carmin sur Mer (3 Badges) pour débloquer la salle d\'entraînement !'}
    </div>`;
    return;
  }

  const trainee = getTraineePoke();
  if(!trainee){
    el.innerHTML = `<div style="text-align:center;padding:12px;color:var(--dim);">Aucun Pokémon actif.</div>`;
    return;
  }
  if(!trainee.evs) trainee.evs = {hp:0, atk:0, def:0, spa:0, spd:0, spe:0};
  const totalEvs = Object.values(trainee.evs).reduce((a,b)=>a+b, 0);

  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.3);padding:8px;border-radius:6px;border:1px solid var(--gold);margin-bottom:8px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
          ${spriteImg(trainee.id, trainee.emoji, {size:36, shiny:trainee.shinyActive})}
        </div>
        <div>
          <b style="color:#fff;font-size:13px;">${trainee.name}</b> <span style="font-size:11px;color:#eee;">Nv.${trainee.level}</span><br>
          <span style="font-size:10px;color:var(--gold);">EVs : ${totalEvs}/36 🟢 (${G.selectedTraineeLoc==='team'?'⚡ Équipe':'📦 Boîte'})</span>
        </div>
      </div>
      <button class="hbtn" style="padding:5px 8px;font-size:11px;background:var(--blue);color:#fff;" onclick="openUnifiedSelectorModal('training')">🔄 ${lang==='en'?'Change':'Changer'}</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
      <div class="pokechill-row" style="background:#18261e;border:1px solid #2e4a3c;border-radius:6px;padding:8px;cursor:pointer;text-align:left;" onclick="startTrainingBattle('move')">
        <div style="font-weight:bold;color:#4ade80;font-size:11px;">${lang==='en'?'Move Training':'Entraînement Capacité'}</div>
        <div style="font-size:9px;color:var(--dim);">${lang==='en'?'Difficulty: ★':'Difficulté : ★'} (Facile : -2 Nv.)</div>
      </div>
      <div class="pokechill-row" style="background:#1f1826;border:1px solid #3c2e4a;border-radius:6px;padding:8px;cursor:pointer;text-align:left;" onclick="startTrainingBattle('ability')">
        <div style="font-weight:bold;color:#c084fc;font-size:11px;">${lang==='en'?'Ability Training':'Entraînement Talent'}</div>
        <div style="font-size:9px;color:var(--dim);">${lang==='en'?'Difficulty: ★':'Difficulté : ★'} (Facile : -1 Nv.)</div>
      </div>
      <div class="pokechill-row" style="background:#26181e;border:1px solid #4a2e3c;border-radius:6px;padding:8px;cursor:pointer;text-align:left;" onclick="startTrainingBattle('ev')">
        <div style="font-weight:bold;color:#f472b6;font-size:11px;">${lang==='en'?'EV Training I':'Entraînement EV I'}</div>
        <div style="font-size:9px;color:var(--dim);">${lang==='en'?'Difficulty: ★':'Difficulté : ★'}★ (Moyen : +2 Nv.)</div>
      </div>
      <div class="pokechill-row" style="background:#261f18;border:1px solid #4a3c2e;border-radius:6px;padding:8px;cursor:pointer;text-align:left;" onclick="startTrainingBattle('level')">
        <div style="font-weight:bold;color:#ffd700;font-size:11px;">${lang==='en'?'Level Training':'Entraînement Niveau'}</div>
        <div style="font-size:9px;color:var(--dim);">${lang==='en'?'Difficulty: ★':'Difficulté : ★'}★ (Moyen : +3 Nv.)</div>
      </div>
      <div class="pokechill-row" style="grid-column:1/-1;background:#261826;border:1px solid #4a2e4a;border-radius:6px;padding:8px;cursor:pointer;text-align:left;" onclick="startTrainingBattle('hidden_ability')">
        <div style="font-weight:bold;color:#f87171;font-size:11px;">${lang==='en'?'Hidden Ability Training ✨':'Entraînement Talent Caché ✨'}</div>
        <div style="font-size:9px;color:var(--dim);">${lang==='en'?'Difficulty: ★':'Difficulté : ★'}★★ (Expert : +6 Nv. & Boss)</div>
      </div>
    </div>
  `;
}
function startTrainingBattle(mode='ev'){
  if(typeof battle !== 'undefined' && battle && battle.active){
    notify("❌ Combat en cours ! Terminez ou quittez d'abord le combat actuel.", "var(--red)");
    return;
  }
  const trainee = getTraineePoke();
  if(!trainee){ setMsg("❌ Aucun Pokémon à entraîner !"); return; }

  if(mode === 'level' && trainee.level >= 100){
    notify("❌ Ce Pokémon est déjà au Niveau 100 maximum !", "var(--red)");
    return;
  }
  if(mode === 'ev'){
    if(!trainee.evs) trainee.evs = {hp:0, atk:0, def:0, spa:0, spd:0, spe:0};
    const totEv = Object.values(trainee.evs).reduce((a,b)=>a+b, 0);
    if(totEv >= 36){
      notify("❌ Ce Pokémon possède déjà 6 étoiles EV sur toutes ses statistiques (36/36) !", "var(--red)");
      return;
    }
  }
  if(mode === 'move'){
    const pool = learnableMoves(trainee);
    if(!pool || !pool.length){
      notify("❌ Ce Pokémon connaît ou a déjà débloqué toutes les capacités disponibles pour son espèce !", "var(--red)");
      return;
    }
  }

  battle.isTraining = true;
  battle.trainingStage = 0;
  battle.trainee = trainee;
  battle.trainingMode = mode;

  let offset = 0;
  if(mode === 'move') offset = -2;
  else if(mode === 'ability') offset = -1;
  else if(mode === 'ev') offset = 0;
  else if(mode === 'level') offset = 1;
  else if(mode === 'hidden_ability') offset = 2;

  const bLv = Math.max(3, (trainee.level || 15) + offset);
  const b1 = createPoke(132, bLv, false); // Métamorph Hologramme
  const b2 = createPoke(137, bLv, false); // Porygon Hologramme
  const b3 = createPoke(113, bLv, false); // Leveinard Sac de Frappe
  if(b1){ b1.name = "Holo-Métamorph"; }
  if(b2){ b2.name = "Holo-Porygon"; }
  if(b3){ b3.name = "Sac de Frappe"; }
  const bots = [b1, b2, b3].filter(Boolean);

  addBattleLog(`⚡ SALLE D'ENTRAÎNEMENT (${mode.toUpperCase()}) - Round 1/3 : ${bots[0].name} Nv.${bLv} !`);
  startBattle(null, true, 'training', bots);
}

