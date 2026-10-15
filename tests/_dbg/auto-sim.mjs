// Simulation du pilote auto : que fait-il avant d'engager le boss ?
function sandbox({ badgeReq = 0, forest = false } = {}) {
  globalThis.G = { money: 0, dungeonsExplored: 0, dungeonRun: null, dungeonClears: { x: 99 }, team: [{ currentHP: 10, maxHP: 10 }] };
  const wallet = { dungeonTokens: 100000 };
  globalThis.ensureWallet = () => wallet;
  globalThis.spendDungeonTokens = (n) => { wallet.dungeonTokens -= n; return true; };
  globalThis.gainDungeonTokens = (n) => { wallet.dungeonTokens += n; };
  globalThis.getLocObj = (id) => ({ name: id, type: 'dungeon', badgeReq, bg: forest ? 'forest' : 'cave' });
  globalThis.dungeonToll = () => 500;
  globalThis.updateHeader = () => {};
  globalThis.notify = () => {};
  globalThis.t = (k) => k; globalThis.tr = (k) => k;
  globalThis.aliveCount = () => 6;
  globalThis.battle = { active: false };
  return wallet;
}
const M = await import('../../src/application/world/dungeon-run.js');
function simulate(mode, opts) {
  sandbox(opts);
  const events = [];
  globalThis.exploreArea = () => {
    const run = M.currentDungeonRun();
    const b = globalThis.battle;
    const tile = run.map.tiles[run.pendingNode];
    events.push('fight:' + (tile ? tile.type : '?'));
    if (b.pendingDungeonBoss) { b.pendingDungeonBoss = false; M.dungeonOnWin(); M.dungeonOnBossDefeated(); return; }
    M.dungeonOnWin();
  };
  const run = M.startDungeonRun('x');
  const depth = run.depth;
  const total = Object.values(run.map.tiles);
  const stat = () => ({
    revealed: total.filter((t) => t.revealed).length + '/' + total.length,
    chests: total.filter((t) => t.type === 'chest' && t.done).length + '/' + total.filter((t) => t.type === 'chest').length,
    combats: total.filter((t) => (t.type === 'combat' || t.type === 'elite') && t.done).length + '/' + total.filter((t) => t.type === 'combat' || t.type === 'elite').length,
  });
  M.dungeonSetAuto(mode);
  let guard = 0, bossAt = null, floorStart = run.floor;
  while (M.currentDungeonRun() && M.currentDungeonRun().floor === floorStart && guard++ < 400) {
    const before = events.length;
    const r = M.currentDungeonRun();
    const bossTileBefore = r.map.tiles[r.bossTile] && r.map.tiles[r.bossTile].type;
    M._dgAutoStep();
    const after = events.slice(before);
    if (after.includes('fight:boss') && !bossAt) bossAt = stat();
    if (!M.currentDungeonRun()) break;
  }
  const r = M.currentDungeonRun();
  console.log(mode, opts, 'depth', depth, '| état au moment du boss :', bossAt, '| fin :', r ? { floor: r.floor, ...stat() } : 'run terminé (donjon clos)', '| steps', guard);
  if (r) M.dungeonAbandon();
}
for (const mode of ['farm', 'chest', 'boss']) {
  simulate(mode, { badgeReq: 0, forest: true });
  simulate(mode, { badgeReq: 3, forest: false });
}
