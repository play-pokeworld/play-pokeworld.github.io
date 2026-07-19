function rand(min,max){return window.PokeWorldCore.randomInt(min,max);}
function chance(pct){return window.PokeWorldCore.chancePercent(pct);}
function clamp(v,lo,hi){return window.PokeWorldCore.clamp(v,lo,hi);}
function notify(msg, color='var(--green)'){
 const el=document.getElementById('notif');
 el.textContent=msg; el.style.background=color; el.style.display='block';
 clearTimeout(el._t); el._t=setTimeout(()=>el.style.display='none',2500);
}
function setMsg(msg){
 
 
 notify(msg);
}
function addBattleLog(msg){
 if(!battle.log) battle.log=[];
 battle.log.push(msg);
 if(battle.log.length>60) battle.log.shift();
 const modal=document.getElementById('battle-summary-modal');
 if(modal&&modal.classList.contains('open')) renderBattleSummary();
}
function clearBattleLog(){ battle.log=[]; }


function typeClass(type){return 'type-' + String(type || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-');}
function typeSpan(type){
 return `<span class="type-badge ${typeClass(type)}">${type}</span>`;
}
function hpColor(pct){
 if(pct>0.5) return 'var(--green)';
 if(pct>0.25) return 'var(--light2)';
 return 'var(--red)';
}

