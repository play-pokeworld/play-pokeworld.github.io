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


// --- Migrated to ES module, globals exposed ---
if (typeof rand !== 'undefined' && typeof window !== 'undefined') window.rand = rand;
if (typeof chance !== 'undefined' && typeof window !== 'undefined') window.chance = chance;
if (typeof clamp !== 'undefined' && typeof window !== 'undefined') window.clamp = clamp;
if (typeof notify !== 'undefined' && typeof window !== 'undefined') window.notify = notify;
if (typeof setMsg !== 'undefined' && typeof window !== 'undefined') window.setMsg = setMsg;
if (typeof addBattleLog !== 'undefined' && typeof window !== 'undefined') window.addBattleLog = addBattleLog;
if (typeof clearBattleLog !== 'undefined' && typeof window !== 'undefined') window.clearBattleLog = clearBattleLog;
if (typeof typeClass !== 'undefined' && typeof window !== 'undefined') window.typeClass = typeClass;
if (typeof typeSpan !== 'undefined' && typeof window !== 'undefined') window.typeSpan = typeSpan;
if (typeof hpColor !== 'undefined' && typeof window !== 'undefined') window.hpColor = hpColor;

export {};
