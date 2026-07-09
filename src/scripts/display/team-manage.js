// ============================================================
// TEAM MANAGE — (split from map.js)
// ============================================================
let _teamDragIdx=null;
let _swapFromTeamIdx=null;

function saveCurrentTeamToPreset(key){
  if(!G.teamPresets) G.teamPresets = { preset1:{name:"Équipe Aventure",uids:[]}, preset2:{name:"Équipe Boss",uids:[]}, preset3:{name:"Équipe Entraînement",uids:[]} };
  if(!G.teamPresets[key]) G.teamPresets[key] = { name: "Preset " + key, uids: [] };
  G.teamPresets[key].uids = G.team.map(p => p && p.uid).filter(Boolean);
  notify(`💾 ${G.teamPresets[key].name} sauvegardée (${G.team.length} Pokémon) !`, 'var(--blue)');
  renderTeamWindow();
  saveGame();
}

function loadTeamFromPreset(key){
  if(typeof battle !== 'undefined' && battle && battle.active){
    notify("🔒 Impossible de changer d'équipe de combat pendant un affrontement !", "var(--red)");
    return;
  }
  const preset = G.teamPresets && G.teamPresets[key];
  if(!preset || !preset.uids || !preset.uids.length){
    notify("❌ Ce preset d'équipe est vide ! Mettez des Pokémon en équipe et cliquez sur Sauvegarder.", "var(--red)");
    return;
  }
  const newTeam = [];
  for(const uid of preset.uids){
    let found = G.team.find(p => p && p.uid === uid);
    if(!found){
      for(const k in (G.collection || {})){
        if(G.collection[k] && G.collection[k].uid === uid){
          found = G.collection[k];
          delete G.collection[k];
          break;
        }
      }
    }
    if(found) newTeam.push(found);
  }
  if(!newTeam.length){
    notify("❌ Aucun Pokémon du preset n'a été trouvé !", "var(--red)");
    return;
  }
  for(const oldP of G.team){
    if(!newTeam.includes(oldP)){
      G.collection[String(oldP.id)] = oldP;
    }
  }
  G.team = newTeam;
  G.activePresetId = key;
  notify(`⚡ ${preset.name} chargée avec succès (${newTeam.length} Pokémon) !`, 'var(--green)');
  renderTeamWindow();
  const tabEl = document.getElementById('tab-content');
  if(tabEl && document.querySelector('.tab[onclick*="team"]')?.classList.contains('active')) renderTeam(tabEl);
  saveGame();
}

function renderTeam(el){
  if(G.team.length===0){
    el.innerHTML=`<div style="text-align:center;padding:40px;color:var(--dim)">
      Vous n'avez pas encore de Pokémon !<br><br>
      ${!G.starter?`<button class="hbtn" onclick="chooseStarter()">Choisir votre Starter !</button>`:'Explorez les routes pour en capturer.'}
    </div>`;
    return;
  }
  const battleLockBanner = battle.active ? `<div style="background:rgba(244,67,54,0.15);border:1px solid var(--red);padding:8px 12px;border-radius:6px;margin-bottom:10px;color:#ff8a80;font-size:11px;display:flex;align-items:center;gap:8px;">
    <span style="font-size:16px;">🔒</span>
    <span><b>Combat en direct en cours :</b> L'équipe active est verrouillée. Vous ne pouvez ni échanger, ni réordonner, ni modifier le stuff pendant le combat.</span>
  </div>` : '';
  el.innerHTML= renderTeamPresetsToolbar() + battleLockBanner + G.team.map((p,i)=>renderPokeCard(p,i)).join('');
}

function onTeamDragStart(ev, i){
  if(battle.active){
    notify("🔒 Action impossible : l'équipe est bloquée pendant un combat actif.", "var(--red)");
    ev.preventDefault(); return;
  }
  _teamDragIdx=i;
  ev.dataTransfer.effectAllowed='move';
  try{ ev.dataTransfer.setData('text/plain', String(i)); }catch(e){}
}

function onTeamDragOver(ev){
  ev.preventDefault();
  ev.dataTransfer.dropEffect='move';
  ev.currentTarget.style.borderColor='var(--accent)';
}

function onTeamDragLeave(ev){ ev.currentTarget.style.borderColor=''; }

function onTeamDrop(ev, j){
  ev.preventDefault();
  ev.currentTarget.style.borderColor='';
  if(battle.active) return;
  const i=_teamDragIdx; _teamDragIdx=null;
  if(i==null||i===j||!G.team[i]||!G.team[j]) return;
  const tmp=G.team[i]; G.team[i]=G.team[j]; G.team[j]=tmp;
  saveGame();
  renderTeamWindow();
}

function onTeamCardClick(ev, i){
  if(ev.defaultPrevented) return;
  if(battle.active){
    notify("🔒 Action impossible : impossible d'échanger l'équipe en plein combat.", "var(--red)");
    return;
  }
  _swapFromTeamIdx=i;
  showTab('box');
}

function cancelBoxSwap(){ _swapFromTeamIdx=null; showTab('box'); renderTeamWindow(); }

// ============================================================
// BOX TAB (Pokémon hors équipe)
// ============================================================

