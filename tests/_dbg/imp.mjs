globalThis.window = globalThis; globalThis.document = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], createElement: () => ({ style: {}, classList: { add(){}, remove(){} }, setAttribute(){}, appendChild(){} }), body: { appendChild(){} }, addEventListener(){} };
globalThis.G = {}; globalThis.battle = {}; globalThis.localStorage = { getItem: () => null, setItem(){}, removeItem(){} };
for (const f of process.argv.slice(2)) {
  try { const m = await import('../../' + f); console.log('OK ', f, Object.keys(m).length, 'exports'); }
  catch (e) { console.log('ERR', f, '→', String(e.message).split('\n')[0]); }
}
