import fs from 'node:fs'; import path from 'node:path';
const ROOT='/home/user/project/src';
const walk=(d)=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]).filter(f=>f.endsWith('.js'));
const files=walk(ROOT);
const src=Object.fromEntries(files.map(f=>[f,fs.readFileSync(f,'utf8')]));
const dir=process.argv[2]||'application/combat';
const targets=files.filter(f=>f.includes('/'+dir+'/'));
const guards={}; 
for(const f of targets){ for(const m of src[f].matchAll(/typeof\s+([A-Za-z_$][\w$]*)\s*(?:===|!==|==|!=)\s*['"]function['"]/g)){ const s=m[1]; (guards[s]??={n:0,files:new Set()}); guards[s].n++; guards[s].files.add(path.basename(f)); } }
// definitions
function defs(sym){ const out=[]; for(const f of files){ const t=src[f]; const re=new RegExp(`(?:^|\\n)\\s*(?:export\\s+)?(?:async\\s+)?function\\s+${sym}\\s*\\(|(?:^|\\n)\\s*(?:export\\s+)?(?:const|let|var)\\s+${sym}\\s*=|(?:^|\\n)\\s*(?:window|globalThis)\\.${sym}\\s*=`); if(re.test(t)){ const exported=new RegExp(`export\\s+(?:async\\s+)?(?:function|const|let|class)\\s+${sym}\\b`).test(t)||new RegExp(`export\\s*\\{[^}]*\\b${sym}\\b[^}]*\\}`,'s').test(t); out.push(path.relative(ROOT,f)+(exported?'':' (NOEXP)')); } } return out; }
const rows=Object.entries(guards).sort((a,b)=>b[1].n-a[1].n).map(([s,v])=>[s,v.n,[...v.files].join(','),defs(s).join(' | ')||'??']);
let total=0; for(const r of rows){ total+=r[1]; console.log(String(r[1]).padStart(3), r[0].padEnd(34), (r[3]).padEnd(70).slice(0,70), r[2]); }
console.log('TOTAL',total,'symbols',rows.length);
