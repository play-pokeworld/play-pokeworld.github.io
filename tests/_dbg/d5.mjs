globalThis.G = { money: 0, dungeonsExplored: 0, dungeonRun: null, dungeonClears: { mtmoon: 5 }, team: [{ currentHP: 100, maxHP: 100 }] };
const wallet = { dungeonTokens: 100000, revealed: {} };
globalThis.ensureWallet = () => wallet;
globalThis.spendDungeonTokens = (n) => { wallet.dungeonTokens -= n; return true; };
globalThis.gainDungeonTokens = (n) => { wallet.dungeonTokens += n; };
globalThis.getLocObj = (id) => ({ name: id, type: 'dungeon', badgeReq: 0 });
globalThis.dungeonToll = () => 500; globalThis.updateHeader = () => {}; globalThis.notify = () => {};
globalThis.t = (k) => k; globalThis.tr = (k) => k; globalThis.exploreArea = () => {}; globalThis.aliveCount = () => 6;
const M = await import('../../src/application/world/dungeon-run.js');
M.startDungeonRun('mtmoon');
M.dungeonSetAuto(true);
let guard = 0; let run = M.currentDungeonRun();
const log = [];
while (run && !run.bossDefeated && guard++ < 300) {
  if (run.pendingNode) M.dungeonOnWin();
  run = M.currentDungeonRun();
  if (run && !run.pendingNode) { const before = run.pos; const r = M._dgAutoStep(); log.push(before + '>' + run.pos + (run.pendingNode ? '*' : '') + (r === null ? '(null)' : '')); }
  run = M.currentDungeonRun();
}
const tiles = Object.values(run.map.tiles);
console.log('guard', guard, 'bossDefeated', run.bossDefeated, 'pos', run.pos, 'boss', run.bossTile, 'depth', run.depth, 'floor', run.floor);
console.log('revealed', tiles.filter(t=>t.revealed).length, '/', tiles.length, 'loot left', tiles.filter(t=>!t.done && ['chest','combat','elite'].includes(t.type)).map(t=>t.id+':'+t.type+(t.revealed?'':'?')));
console.log(log.slice(-12).join(' '));
console.log('bossTile', run.map.tiles[run.bossTile]);
