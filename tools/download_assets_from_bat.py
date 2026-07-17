from pathlib import Path
import re, urllib.request, concurrent.futures, time

root = Path.cwd()
bat = (root/'tools/legacy/download_sprites.bat').read_text(errors='ignore')
PA = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites'
PC = 'https://raw.githubusercontent.com/pokeclicker/pokeclicker/develop/src/assets/images/items'

tasks=[]
for n,name in re.findall(r'call\s+:getpoke\s+(\d+)\s+([^\s\r\n]+)', bat, flags=re.I):
    base = root/'src/assets/images/pokemon'
    tasks += [
        (base/'front'/f'{name}.png', f'{PA}/pokemon/{n}.png', None),
        (base/'back'/f'{name}.png', f'{PA}/pokemon/back/{n}.png', None),
        (base/'frontShiny'/f'{name}.png', f'{PA}/pokemon/shiny/{n}.png', None),
        (base/'backShiny'/f'{name}.png', f'{PA}/pokemon/back/shiny/{n}.png', None),
    ]
for key, paname in re.findall(r'call\s+:getitem\s+([^\s\r\n]+)\s+([^\s\r\n]+)', bat, flags=re.I):
    tasks.append((root/'src/assets/images/items'/f'{key}.png', f'{PA}/items/{paname}.png', f'{PC}/{key}.png'))
# extra direct assets from bat
for out_raw, url in re.findall(r'curl\s+-sSL\s+--fail\s+-o\s+"%ROOT%\\([^"]+)"\s+"(https?://[^"]+)"', bat, flags=re.I):
    out = out_raw.replace('\\','/')
    tasks.append((root/out, url, None))

# De-duplicate by destination, keeping first successful URL/fallback pair.
seen={}
for t in tasks:
    seen.setdefault(str(t[0]), t)
tasks=list(seen.values())
print('tasks', len(tasks))

def fetch_one(task):
    path, url, fallback = task
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.stat().st_size > 100:
        return ('skip', str(path), '')
    last=''
    for u in [url, fallback]:
        if not u: continue
        try:
            req=urllib.request.Request(u, headers={'User-Agent':'Arena-PokeWorld-asset-fetcher/1.0'})
            with urllib.request.urlopen(req, timeout=25) as r:
                data=r.read()
            if len(data) < 20:
                raise ValueError('tiny response')
            path.write_bytes(data)
            return ('ok', str(path), u)
        except Exception as e:
            last=f'{u}: {e}'
    return ('fail', str(path), last)

ok=skip=fail=0
failed=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=28) as ex:
    futs=[ex.submit(fetch_one,t) for t in tasks]
    for i,f in enumerate(concurrent.futures.as_completed(futs),1):
        status,path,msg=f.result()
        if status=='ok': ok+=1
        elif status=='skip': skip+=1
        else:
            fail+=1; failed.append((path,msg))
        if i%100==0 or status=='fail':
            print(f'{i}/{len(tasks)} ok={ok} skip={skip} fail={fail}')
print('done ok',ok,'skip',skip,'fail',fail)
if failed:
    (root/'asset_download_failures.txt').write_text('\n'.join(f'{p}\t{m}' for p,m in failed))
    print('failures written asset_download_failures.txt')
