import fs from 'node:fs'; import path from 'node:path';
import * as acorn from 'acorn';
const ROOT='/home/user/project/src/application/combat';
const files=fs.readdirSync(ROOT).filter(f=>f.endsWith('.js'));
const cats={};
for(const f of files){
  const src=fs.readFileSync(path.join(ROOT,f),'utf8');
  let ast; try{ ast=acorn.parse(src,{ecmaVersion:2024,sourceType:'module',locations:true}); }catch(e){ console.log('PARSE FAIL',f,e.message); continue; }
  const stack=[];
  (function walk(n,parent){ if(!n||typeof n.type!=='string')return; n._parent=parent;
    if(n.type==='BinaryExpression'&&n.left.type==='UnaryExpression'&&n.left.operator==='typeof'&&n.right.type==='Literal'&&n.right.value==='function'){
      const p=parent; let k;
      if(p.type==='ConditionalExpression'&&p.test===n)k='ternary';
      else if(p.type==='IfStatement'&&p.test===n)k=p.alternate?'if-else':'if';
      else if(p.type==='LogicalExpression')k='logical-'+p.operator;
      else k='other:'+p.type;
      k+=n.operator==='==='?'':' NEG';
      cats[k]=(cats[k]||0)+1;
      if(k.startsWith('other'))console.log(f,n.loc.start.line,src.slice(n.start-30,n.end+40).replace(/\n/g,' '));
    }
    for(const key of Object.keys(n)){ if(key==='_parent')continue; const v=n[key]; if(Array.isArray(v))v.forEach(c=>walk(c,n)); else if(v&&typeof v.type==='string')walk(v,n); }
  })(ast,null);
}
console.log(cats);
