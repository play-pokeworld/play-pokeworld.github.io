
// ─── Unified weather/status/terrain badge system ───
// Generates consistent colored badges across ALL info panels
var WEATHER_COLORS = {
  sunny:'#FBA64C', rainy:'#539DDF', sandstorm:'#DA7C4D', hail:'#76D1C1',
  electric:'#F2D94E', grassy:'#60BE58', misty:'#EF90E6', psychic:'#FA8582',
  burn:'#f08030', freeze:'#98d8d8', para:'#f8d030', poison:'#a040a0',
  sleep:'#705898', confuse:'#FA8582', flinch:'#d3524b', slow:'#539DDF'
};
function badgeHtml(text, type) {
  var color = WEATHER_COLORS[type] || WEATHER_COLORS[type.toLowerCase()] || '#888';
  return '<span class="move-desc-badge" data-style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:bold;color:white;background:var(--type-color,#888);text-shadow:0 1px 2px rgba(0,0,0,0.3);" data-type-color="' + color + '">' + text + '</span>';
}
var STATUS_BADGES = {
  burn: badgeHtml('Brûlure','burn'), freeze: badgeHtml('Gel','freeze'),
  para: badgeHtml('Paralysie','para'), poison: badgeHtml((typeof t==='function'?t('status_toxic'):'Toxic'),'poison'),
  sleep: badgeHtml('Sommeil','sleep'), confuse: badgeHtml('Confusion','confuse'),
  sunny: badgeHtml('Soleil','sunny'), rainy: badgeHtml('Pluie','rainy'),
  sand: badgeHtml((typeof t==='function'?t('weather_sandstorm'):'Sandstorm'),'sandstorm'), hail: badgeHtml('Grêle','hail'),
  eterrain: badgeHtml((typeof t==='function'?t('terrain_electric'):'Electric Terrain'),'electric'),
  gterrain: badgeHtml('Champ Herbu','grassy'),
  mterrain: badgeHtml('Champ Brumeux','misty'),
  pterrain: badgeHtml('Champ Psychique','psychic')
};
var EN_STATUS_BADGES = {
  burn: badgeHtml('Burn','burn'), freeze: badgeHtml('Freeze','freeze'),
  para: badgeHtml('Paralysis','para'), poison: badgeHtml('Poisoned','poison'),
  sleep: badgeHtml('Sleep','sleep'), confuse: badgeHtml('Confused','confuse'),
  sunny: badgeHtml('Sunny','sunny'), rainy: badgeHtml('Rainy','rainy'),
  sand: badgeHtml('Sandstorm','sandstorm'), hail: badgeHtml('Hail','hail'),
  eterrain: badgeHtml('Electric Terrain','electric'),
  gterrain: badgeHtml('Grassy Terrain','grassy'),
  mterrain: badgeHtml('Misty Terrain','misty'),
  pterrain: badgeHtml('Psychic Terrain','psychic')
};
function getBadgeHtml(text, lang) {
  var lower = text.toLowerCase().replace(/[\s-]/g,'');
  var langKey = lang || (typeof currentLang === 'function' ? currentLang() : 'fr');
  var dict = langKey === 'en' ? EN_STATUS_BADGES : STATUS_BADGES;
  if (dict[lower]) return dict[lower];
  // Try partial match
  for (var k in dict) { if (lower.includes(k) || k.includes(lower)) return dict[k]; }
  return text;
}
function replaceWeatherTerms(desc) {
  if (!desc || typeof desc !== 'string') return desc || '';
  var r = desc;
  // USE CALLBACK FUNCTIONS so $1 is the actual match! (not evaluated at array creation time)
  r = r.replace(/\b(Sunny|Soleil|soleil)\b/gi, function(m){ return badgeHtml(m,'sunny'); });
  r = r.replace(/\b(Rainy|Rain|Pluie|pluie)\b/gi, function(m){ return badgeHtml(m,'rainy'); });
  r = r.replace(/Sandstorm|sandstorm|T[eéèêë]mp[eéèêë]te d[eéèêë] Sabl[eéèêë]|t[eéèêë]mp[eéèêë]te d[eéèêë] sabl[eéèêë]/gi, function(m){ return badgeHtml(m,'sandstorm'); });
  r = r.replace(/\b(Hail|hail|Gr[eéèêë]l[eéèêë]|gr[eéèêë]l[eéèêë])\b/gi, function(m){ return badgeHtml(m,'hail'); });
  r = r.replace(/Electric Terrain|electric terrain|Champ [EeéèêëÉÈÊ]lectrifi[eéèêëÉÈÊ]|champ [eéèêë]lectrifi[eéèêë]/gi, function(m){ return badgeHtml(m,'electric'); });
  r = r.replace(/\b(Grassy Terrain|grassy terrain|Champ Herbu|champ herbu)\b/gi, function(m){ return badgeHtml(m,'grassy'); });
  r = r.replace(/\b(Misty Terrain|misty terrain|Champ Brumeux|champ brumeux)\b/gi, function(m){ return badgeHtml(m,'misty'); });
  r = r.replace(/\b(Psychic Terrain|psychic terrain|Champ Psychique|champ psychique)\b/gi, function(m){ return badgeHtml(m,'psychic'); });
  return r;
}
// Passe 24 : même traitement couleur pour les mots de STATUT (brûlure, poison,
// paralysie, gel, sommeil, confusion) dans les descriptions — avant, seuls la
// météo et les champs étaient mis en couleur. Couvre les formes conjuguées
// (« brûler », « paralyser », « endormir », « geler », « empoisonner »…).
function replaceStatusTerms(desc) {
  if (!desc || typeof desc !== 'string') return desc || '';
  var r = desc;
  r = r.replace(/\b(Empoisonnement grave|empoisonnement grave)\b/g, function(m){ return badgeHtml(m,'poison'); });
  r = r.replace(/\b(Brûlure|brûlure|Brûlé|brûlé|Brûler|brûler|Burn|burn|Burned|burned)\b/g, function(m){ return badgeHtml(m,'burn'); });
  r = r.replace(/\b(Paralysie|paralysie|Paralyser|paralyser|Paralysé|paralysé|Paralysis|paralysis|Paralyzed|paralyzed)\b/g, function(m){ return badgeHtml(m,'para'); });
  r = r.replace(/\b(Poisonned|Poisoned|Poison|poison|Empoisonnement|empoisonnement|Empoisonner|empoisonner|Empoisonné|empoisonné)\b/g, function(m){ return badgeHtml(m,'poison'); });
  r = r.replace(/\b(Geler|geler|Gelé|gelé|Freeze|freeze|Frozen|frozen|Gel)\b/gi, function(m){ return badgeHtml(m,'freeze'); });
  r = r.replace(/\b(Endormissement|endormissement|Endormir|endormir|Endormi|endormi|Sommeil|sommeil|Sleep|sleep|Asleep|asleep)\b/g, function(m){ return badgeHtml(m,'sleep'); });
  r = r.replace(/\b(Confusion|confusion|Confus|confus|Confuse|confuse|Confused|confused)\b/g, function(m){ return badgeHtml(m,'confuse'); });
  return r;
}
if (typeof window !== 'undefined') {
  window.badgeHtml = badgeHtml;
  window.STATUS_BADGES = STATUS_BADGES;
  window.EN_STATUS_BADGES = EN_STATUS_BADGES;
  window.getBadgeHtml = getBadgeHtml;
  window.replaceWeatherTerms = replaceWeatherTerms;
  window.replaceStatusTerms = replaceStatusTerms;
}
