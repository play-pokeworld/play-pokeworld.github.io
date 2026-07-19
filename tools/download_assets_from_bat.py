from pathlib import Path
import concurrent.futures
import json
import re
import urllib.parse
import urllib.request

root = Path.cwd()
bat = (root / 'tools/legacy/download_sprites.bat').read_text(errors='ignore')
PA = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites'
PC = 'https://raw.githubusercontent.com/pokeclicker/pokeclicker/develop/src/assets/images/items'


def load_json_if_exists(path: Path):
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding='utf-8'))


def normalize_url(url: str) -> str:
    if not url:
        return url
    parts = urllib.parse.urlsplit(url)
    encoded_path = urllib.parse.quote(parts.path)
    return urllib.parse.urlunsplit((parts.scheme, parts.netloc, encoded_path, parts.query, parts.fragment))


def add_task(tasks, destination: Path, url: str, fallback: str | None = None):
    tasks.append((destination, normalize_url(url), normalize_url(fallback) if fallback else None))


tasks = []

# Pokémon sprites: front/back/shiny/back-shiny
for n, name in re.findall(r'call\s+:getpoke\s+(\d+)\s+([^\s\r\n]+)', bat, flags=re.I):
    base = root / 'src/assets/images/pokemon'
    add_task(tasks, base / 'front' / f'{name}.png', f'{PA}/pokemon/{n}.png')
    add_task(tasks, base / 'back' / f'{name}.png', f'{PA}/pokemon/back/{n}.png')
    add_task(tasks, base / 'frontShiny' / f'{name}.png', f'{PA}/pokemon/shiny/{n}.png')
    add_task(tasks, base / 'backShiny' / f'{name}.png', f'{PA}/pokemon/back/shiny/{n}.png')

# Items from PokeAPI + PokéClicker fallback
special_item_fallbacks = {
    'deep_sea_scale': 'https://raw.githubusercontent.com/pokeclicker/pokeclicker/develop/src/assets/images/items/evolution/Deepsea_scale.png',
    'deep_sea_tooth': 'https://raw.githubusercontent.com/pokeclicker/pokeclicker/develop/src/assets/images/items/evolution/Deepsea_tooth.png',
}
for key, paname in re.findall(r'call\s+:getitem\s+([^\s\r\n]+)\s+([^\s\r\n]+)', bat, flags=re.I):
    fallback = special_item_fallbacks.get(key, f'{PC}/{key}.png')
    add_task(tasks, root / 'src/assets/images/items' / f'{key}.png', f'{PA}/items/{paname}.png', fallback)

# Direct assets declared in the legacy batch script (backgrounds, etc.)
skip_direct_outputs = {
    'src/assets/font/WinkySans-Regular.ttf',
    'src/assets/font/Megrim-Regular.ttf'
}
for out_raw, url in re.findall(r'curl\s+-sSL\s+--fail\s+-o\s+"%ROOT%\\([^"]+)"\s+"(https?://[^"]+)"', bat, flags=re.I):
    out = out_raw.replace('\\', '/')
    if out in skip_direct_outputs:
        continue
    add_task(tasks, root / out, url)

# Static assets manifest: maps, fonts, trainer sprites, overrides, etc.
static_manifest = load_json_if_exists(root / 'tools/static-asset-manifest.json')
if static_manifest:
    for asset in static_manifest.get('assets', []):
        add_task(
            tasks,
            root / asset['output'],
            asset['sourceUrl'],
            asset.get('fallbackUrl'),
        )

for manifest_name in ['trainer-sprite-manifest.json', 'trainer-profile-manifest.json']:
    trainer_manifest = load_json_if_exists(root / 'tools' / manifest_name)
    if not trainer_manifest:
        continue
    output_dir = root / trainer_manifest.get('outputDir', 'src/assets/images/trainers/npcs')
    raw_base = trainer_manifest.get('sourceBase', '')
    for sprite in trainer_manifest.get('sprites', []):
        file_name = sprite['file']
        source_url = sprite.get('sourceUrl')
        if not source_url and raw_base and sprite.get('sourcePath'):
            source_url = raw_base.rstrip('/') + '/' + sprite['sourcePath'].lstrip('/')
        add_task(tasks, output_dir / file_name, source_url, sprite.get('fallbackUrl'))

# De-duplicate by destination, keeping the LAST declared task so manifests can override batch defaults.
seen = {}
for task in tasks:
    seen[str(task[0])] = task
tasks = list(seen.values())
print('tasks', len(tasks))


def fetch_one(task):
    path, url, fallback = task
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.stat().st_size > 100:
        return ('skip', str(path), '')
    last = ''
    for u in [url, fallback]:
        if not u:
            continue
        try:
            req = urllib.request.Request(u, headers={'User-Agent': 'Arena-PokeWorld-asset-fetcher/1.0'})
            with urllib.request.urlopen(req, timeout=30) as response:
                data = response.read()
            if len(data) < 20:
                raise ValueError('tiny response')
            path.write_bytes(data)
            return ('ok', str(path), u)
        except Exception as exc:
            last = f'{u}: {exc}'
    return ('fail', str(path), last)


ok = skip = fail = 0
failed = []
with concurrent.futures.ThreadPoolExecutor(max_workers=28) as executor:
    futures = [executor.submit(fetch_one, task) for task in tasks]
    for index, future in enumerate(concurrent.futures.as_completed(futures), 1):
        status, path, message = future.result()
        if status == 'ok':
            ok += 1
        elif status == 'skip':
            skip += 1
        else:
            fail += 1
            failed.append((path, message))
        if index % 100 == 0 or status == 'fail':
            print(f'{index}/{len(tasks)} ok={ok} skip={skip} fail={fail}')

print('done ok', ok, 'skip', skip, 'fail', fail)
failures_path = root / 'asset_download_failures.txt'
if failed:
    failures_path.write_text('\n'.join(f'{p}\t{m}' for p, m in failed), encoding='utf-8')
    print('failures written asset_download_failures.txt')
elif failures_path.exists():
    failures_path.unlink()
