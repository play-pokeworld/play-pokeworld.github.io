
// ===== extracted from src/scripts/gameplay/world.js =====
function rand(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function chance(pct){return Math.random()*100<pct;}
function clamp(v,lo,hi){return Math.max(lo,Math.min(hi,v));}
function notify(msg, color='var(--green)'){
  const el=document.getElementById('notif');
  el.textContent=msg; el.style.background=color; el.style.display='block';
  clearTimeout(el._t); el._t=setTimeout(()=>el.style.display='none',2500);
}
function setMsg(msg){
  // Unified: all messages go through the ephemeral notification system.
  // The old fixed #msg-log element is retired.
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
// All user-facing text now flows through the localization engine (t()/tr()).
// The legacy translateNotif() chain of .replace() calls has been retired.
function typeSpan(type){
  return `<span class="type-badge" style="background:${TYPE_COLORS[type]||'#888'}">${type}</span>`;
}
function hpColor(pct){
  if(pct>0.5) return 'var(--green)';
  if(pct>0.25) return 'var(--yellow)';
  return 'var(--red)';
}


