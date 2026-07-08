
// ===== extracted from src/scripts/gameplay/world.js =====
function rand(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function chance(pct){return Math.random()*100<pct;}
function clamp(v,lo,hi){return Math.max(lo,Math.min(hi,v));}
function notify(msg, color='var(--green)'){
  const el=document.getElementById('notif');
  el.textContent=translateNotif(msg); el.style.background=color; el.style.display='block';
  clearTimeout(el._t); el._t=setTimeout(()=>el.style.display='none',2500);
}
function setMsg(msg){
  document.getElementById('msg-log').textContent=translateNotif(msg);
}
function addBattleLog(msg){
  if(!battle.log) battle.log=[];
  battle.log.push(msg);
  if(battle.log.length>60) battle.log.shift();
  const modal=document.getElementById('battle-summary-modal');
  if(modal&&modal.classList.contains('open')) renderBattleSummary();
}
function clearBattleLog(){ battle.log=[]; }
function translateNotif(m){
  if(typeof G === 'undefined' || !G || G.lang !== 'en' || !m || typeof m !== 'string') return m;
  return m
    .replace("🏥 Équipe soignée au Centre Pokémon !", "🏥 Party healed at Pokémon Center!")
    .replace("💊 Tous vos Pokémon ont été soignés !", "💊 All your Pokémon have been healed!")
    .replace("Vos Pokémon sont déjà en pleine forme !", "Your Pokémon are already at full health!")
    .replace("❌ Vous n'avez pas de Pokémon !", "❌ You don't have any Pokémon!")
    .replace("Aucun Pokémon sauvage ici.", "No wild Pokémon here.")
    .replace("🔒 Action impossible : l'équipe est bloquée pendant un combat actif.", "🔒 Action disabled: party is locked during live combat.")
    .replace("🔒 Action impossible : impossible d'échanger l'équipe en plein combat.", "🔒 Action disabled: cannot swap party during live combat.")
    .replace("🔒 Action impossible en combat : quittez le combat d'abord !", "🔒 Action disabled during combat: leave combat first!")
    .replace("rejoint votre équipe !", "joined your party!")
    .replace("est envoyé dans la boîte", "was sent to the PC box")
    .replace("est maintenant votre partenaire !", "is now your partner!")
    .replace("⚡ Énergie insuffisante ! Combattez des Pokémon sauvages pour recharger.", "⚡ Not enough energy! Fight wild Pokémon to recharge.")
    .replace("⛏️ Trouvé :", "⛏️ Found:")
    .replace("Vendu", "Sold").replace("pour +", "for +")
    .replace("Pas assez d'argent !", "Not enough money!")
    .replace("achété !", "purchased!")
    .replace("acheté !", "purchased!")
    .replace("Vous possédez déjà cette espèce !", "You already own this species!")
    .replace("Erreur lors de la création du Pokémon.", "Error creating Pokémon.")
    .replace("déclenche une évolution :", "triggered an evolution:")
    .replace("apparaît dans la boîte PC !", "appears in the PC box!")
    .replace("aurait évolué en", "would have evolved into")
    .replace("déjà possédé !", "already owned!")
    .replace("obtenu !", "obtained!")
    .replace("Revanche remportée contre", "Rematch won against")
    .replace("Vous abandonnez le combat contre", "You forfeited the battle against")
    .replace("Vous pourrez le redéfier à tout moment.", "You can challenge them again anytime.")
    .replace("🚪 Vous quittez le combat.", "🚪 You left the combat.")
    .replace("entrera en jeu dès que possible...", "will enter combat as soon as possible...")
    .replace("oublie", "forgot")
    .replace("apprend", "learned")
    .replace("💾 Partie sauvegardée !", "💾 Game saved!")
    .replace("📂 Partie chargée !", "📂 Game loaded!")
    .replace("🔄 Sauvegarde supprimée, nouvelle partie !", "🔄 Save deleted, new game!")
    .replace("⬇️ Sauvegarde exportée !", "⬇️ Save exported!")
    .replace("⬆️ Sauvegarde importée !", "⬆️ Save imported!")
    .replace("Erreur de sauvegarde.", "Save error.")
    .replace("Erreur de chargement.", "Load error.")
    .replace("Erreur lors de l'export.", "Export error.")
    .replace("Fichier de sauvegarde invalide.", "Invalid save file.")
    .replace("Erreur : fichier illisible.", "Error: unreadable file.")
    .replace("Un Pokémon doit conserver au moins une capacité.", "A Pokémon must keep at least one move.")
    .replace("Capacités pleines (4). Oubliez-en une d'abord.", "Moves full (4). Forget one first.")
    .replace("Cet objet n'a aucun effet sur ce Pokémon.", "This item has no effect on this Pokémon.")
    .replace("Espèce déjà possédée.", "Species already owned.")
    .replace("Pierre manquante.", "Missing evolution stone.")
    .replace("Votre équipe est déjà pleine (6/6). Retirez un Pokémon d'abord.", "Your party is full (6/6). Remove a Pokémon first.")
    .replace("Espèce déjà dans l'équipe.", "Species already in party.")
    .replace("Conflit boîte.", "Box conflict.")
    .replace("Vous devez garder au moins un Pokémon dans l'équipe.", "You must keep at least one Pokémon in the party.")
    .replace("Cette espèce est déjà dans la boîte.", "This species is already in the box.");
}
function typeSpan(type){
  return `<span class="type-badge" style="background:${TYPE_COLORS[type]||'#888'}">${type}</span>`;
}
function hpColor(pct){
  if(pct>0.5) return 'var(--green)';
  if(pct>0.25) return 'var(--yellow)';
  return 'var(--red)';
}

