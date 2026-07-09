// ============================================================
// Item name/desc helpers (resolve via localization t())
// ============================================================
function getItemName(key){
  const v = (typeof t==='function') ? t('items.'+key+'.name') : key;
  return v || key;
}
function getItemDesc(key){
  return (typeof t==='function') ? (t('items.'+key+'.desc') || '') : '';
}
