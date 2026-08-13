#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Passe 2 — Suppression des derniers styles inline des templates JS.
Convention : statique -> data-style (extrait en classe par file-postboot.js),
dynamique -> variables CSS sur style= + data-style avec var(--x).
"""
import io, sys

ROOT = '/home/user/pokeworld_refactor/'

# (fichier, old, new, nb_min_attendu)
JOBS = [
 # --------------------------------------------------------------------------
 ('src/data/items-helpers.js',
  '<div style="margin-top:10px;padding:8px 10px;background:var(--dark3);border-radius:6px;font-size:11px;color:var(--light1);"><span style="font-weight:bold;display:block;margin-bottom:4px;">',
  '<div data-style="margin-top:10px;padding:8px 10px;background:var(--dark3);border-radius:6px;font-size:11px;color:var(--light1);"><span data-style="font-weight:bold;display:block;margin-bottom:4px;">', 1),
 ('src/data/items-helpers.js',
  '\'<div style="padding:10px 12px;background:var(--dark3);border-radius:8px;font-size:12px;line-height:1.6;color:var(--light2);">\'',
  '\'<div data-style="padding:10px 12px;background:var(--dark3);border-radius:8px;font-size:12px;line-height:1.6;color:var(--light2);">\'', 1),
 ('src/data/items-helpers.js',
  '\'<div style="margin-top:6px;padding:6px 10px;background:rgba(77,166,255,0.1);border-radius:6px;font-size:11px;color:var(--light1);">⚡ \'',
  '\'<div data-style="margin-top:6px;padding:6px 10px;background:rgba(77,166,255,0.1);border-radius:6px;font-size:11px;color:var(--light1);">⚡ \'', 1),
 ('src/data/items-helpers.js',
  "return '<span style=\"display:flex;align-items:center;justify-content:center;width:'+size+'px;height:'+size+'px;font-size:'+(size-4)+'px;\">' + icon + '</span>';",
  "return '<span data-style=\"display:flex;align-items:center;justify-content:center;width:var(--ii-size);height:var(--ii-size);font-size:var(--ii-fs);\" style=\"--ii-size:'+size+'px;--ii-fs:'+(size-4)+'px;\">' + icon + '</span>';", 1),

 # --------------------------------------------------------------------------
 ('src/engine/data/poke-core.js',
  "return '<span style=\"display:flex;align-items:center;justify-content:center;width:'+size+'px;height:'+size+'px;font-size:'+(size-4)+'px;\">' + icon + '</span>';",
  "return '<span data-style=\"display:flex;align-items:center;justify-content:center;width:var(--ii-size);height:var(--ii-size);font-size:var(--ii-fs);\" style=\"--ii-size:'+size+'px;--ii-fs:'+(size-4)+'px;\">' + icon + '</span>';", 1),

 # --------------------------------------------------------------------------
 ('src/engine/data/badge-helper.js',
  'style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:bold;color:white;background:',
  'data-style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:bold;color:white;background:var(--type-color,#888);" data-type-color="', 1),

 # --------------------------------------------------------------------------
 ('src/engine/item-engine.js',
  '\'<span class="type-badge type-\' + key + \'" style="background:\' + color + \';color:white;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:bold;">\'',
  '\'<span class="type-badge type-\' + key + \'" data-type-color="\' + color + \'" data-style="color:white;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:bold;">\'', 1),
 ('src/engine/item-engine.js',
  '\'<span style="color:white;cursor:help;padding:0.1rem 0.7rem;border-radius:0.2rem;font-size:1.1rem;width:auto;background:\' + color + \'">\'',
  '\'<span data-type-color="\' + color + \'" data-style="color:white;cursor:help;padding:0.1rem 0.7rem;border-radius:0.2rem;font-size:1.1rem;width:auto;background:var(--type-color,#888);">\'', 1),

 # --------------------------------------------------------------------------
 ('src/engine/renderer/Badge.js',
  'style="display:inline-block;padding:${pd};border-radius:4px;font-size:${fs};\n      font-weight:${this.bold ? \'bold\' : \'400\'};color:white;background:${this.color};\n      text-shadow:0 1px 2px rgba(0,0,0,0.3);${[\'electric\',\'normal\',\'ground\'].includes(this.type) ? \'color:#222;\' : \'\'}"',
  'data-style="display:inline-block;padding:var(--badge-pd);border-radius:4px;font-size:var(--badge-fs);\n      font-weight:${this.bold ? \'bold\' : \'400\'};color:white;background:var(--badge-bg);\n      text-shadow:0 1px 2px rgba(0,0,0,0.3);${[\'electric\',\'normal\',\'ground\'].includes(this.type) ? \'color:#222;\' : \'\'}" style="--badge-pd:${pd};--badge-fs:${fs};--badge-bg:${this.color};"', 1),

 ('src/engine/renderer/Button.js',
  'if (this.color) attrs.push(`style="--btn-color:${this.color};border-color:${this.color};"`);',
  'if (this.color) attrs.push(`data-style="border-color:var(--btn-color);" style="--btn-color:${this.color};"`);', 1),

 ('src/engine/renderer/List.js',
  'style="background:rgba(0,0,0,0.24);color:var(--light2);border:1px solid rgba(236,222,183,0.16);border-radius:10px;padding:8px 10px;min-height:36px;"',
  'data-style="background:rgba(0,0,0,0.24);color:var(--light2);border:1px solid rgba(236,222,183,0.16);border-radius:10px;padding:8px 10px;min-height:36px;"', 1),

 # --------------------------------------------------------------------------
 ('src/engine/renderer/ProgressBar.js',
  'const txt = this.showText ? `<span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:10px;font-weight:bold;color:white;text-shadow:0 1px 2px rgba(0,0,0,0.5);">${Math.floor(this._value)}/${this._max}</span>` : \'\';',
  'const txt = this.showText ? `<span class="poke-progressbar-text">${Math.floor(this._value)}/${this._max}</span>` : \'\';', 1),
 ('src/engine/renderer/ProgressBar.js',
  'return `<div class="poke-progressbar" style="position:relative;width:${typeof this.w === \'number\' ? this.w + \'px\' : this.w};height:${this.h}px;background:${this.bgColor};border-radius:${this.h/2}px;overflow:hidden;">',
  'return `<div class="poke-progressbar" data-style="width:var(--pb-w);height:var(--pb-h);background:var(--pb-bg);border-radius:var(--pb-r);" style="--pb-w:${typeof this.w === \'number\' ? this.w + \'px\' : this.w};--pb-h:${this.h}px;--pb-bg:${this.bgColor};--pb-r:${this.h/2}px;">', 1),
 ('src/engine/renderer/ProgressBar.js',
  '<div class="poke-progressbar-fill" style="width:${p}%;height:100%;background:${c};border-radius:${this.h/2}px;${anim}"></div>',
  '<div class="poke-progressbar-fill${this.animated ? \' is-animated\' : \'\'}" data-style="background:var(--pb-c);border-radius:var(--pb-r);" data-pct="${p}" style="--pb-c:${c};--pb-r:${this.h/2}px;"></div>', 1),

 # --------------------------------------------------------------------------
 ('src/engine/renderer/Sprite.js',
  '''    const style = `width:${this.w}px;height:${this.h}px;${
      this.pixelated ? 'image-rendering:pixelated;image-rendering:crisp-edges;' : ''
    }object-fit:contain;`;
    return `<img src="${this.src}" style="${style}" ''',
  '''    return `<img src="${this.src}" ${this.pixelated ? 'class="pw-img-pixelated" ' : ''}data-style="width:var(--sp-w);height:var(--sp-h);object-fit:contain;" style="--sp-w:${this.w}px;--sp-h:${this.h}px;" ''', 1),
 ('src/engine/renderer/Sprite.js',
  '<span style="display:none;align-items:center;justify-content:center;width:${this.w}px;height:${this.h}px;font-size:20px;">${this.fallback}</span>',
  '<span data-style="display:none;align-items:center;justify-content:center;width:var(--sp-w);height:var(--sp-h);font-size:20px;" style="--sp-w:${this.w}px;--sp-h:${this.h}px;">${this.fallback}</span>', 1),

 ('src/engine/renderer/Text.js',
  '''  toHTML() {
    const style = [
      `font-size:${this.size}px`,
      `color:${this.color}`,
      `font-weight:${this.bold ? 'bold' : '400'}`,
      `text-align:${this.align}`,
      `font-family:${this.font}`,
      `letter-spacing:${this.letterSpacing}`,
      `line-height:${this.lineHeight}`,
    ];
    if (this.shadow) style.push('text-shadow:0 1px 3px rgba(0,0,0,0.3)');
    const text = this.uppercase ? this.content.toUpperCase() : this.content;
    const cls = this.className ? ` class="${this.className}"` : '';
    return `<span${cls} style="${style.join(';')}">${text}</span>`;
  }''',
  '''  toHTML() {
    const vars = [
      `--pw-t-size:${this.size}px`,
      `--pw-t-color:${this.color}`,
      `--pw-t-weight:${this.bold ? 'bold' : '400'}`,
      `--pw-t-align:${this.align}`,
      `--pw-t-font:${this.font}`,
      `--pw-t-spacing:${this.letterSpacing}`,
      `--pw-t-height:${this.lineHeight}`,
    ];
    const text = this.uppercase ? this.content.toUpperCase() : this.content;
    const cls = this.className ? ` class="${this.className}${this.shadow ? ' pw-text-shadow' : ''}"` : (this.shadow ? ' class="pw-text-shadow"' : '');
    return `<span${cls} data-style="font-size:var(--pw-t-size);color:var(--pw-t-color);font-weight:var(--pw-t-weight);text-align:var(--pw-t-align);font-family:var(--pw-t-font);letter-spacing:var(--pw-t-spacing);line-height:var(--pw-t-height);" style="${vars.join(';')}">${text}</span>`;
  }''', 1),

 # --------------------------------------------------------------------------
 ('src/game/combat/battle-team-ui.js',
  'infoBlocks.push(\'<div style="display:inline-flex;align-items:center;gap:4px;">\' + weatherLabel + \' <span style="font-size:10px;color:var(--light2);">(\' + battle.weatherTurns + \' \' + turnsAbbrev + \')</span></div>\');',
  'infoBlocks.push(\'<div data-style="display:inline-flex;align-items:center;gap:4px;">\' + weatherLabel + \' <span data-style="font-size:10px;color:var(--light2);">(\' + battle.weatherTurns + \' \' + turnsAbbrev + \')</span></div>\');', 1),
 ('src/game/combat/battle-team-ui.js',
  'infoBlocks.push(\'<div style="display:inline-flex;align-items:center;gap:4px;">\' + terrainLabel + \' <span style="font-size:10px;color:var(--light2);">(\' + battle.terrainTurns + \' \' + turnsAbbrev + \')</span></div>\');',
  'infoBlocks.push(\'<div data-style="display:inline-flex;align-items:center;gap:4px;">\' + terrainLabel + \' <span data-style="font-size:10px;color:var(--light2);">(\' + battle.terrainTurns + \' \' + turnsAbbrev + \')</span></div>\');', 1),

 # --------------------------------------------------------------------------
 ('src/game/display/poke-modal.js',
  'style="opacity:0.7;border:1px dashed var(--light1);"',
  'data-style="opacity:0.7;border:1px dashed var(--light1);"', 2),
 ('src/game/display/poke-modal.js',
  '<div style="margin-top:6px;font-size:12px;color:var(--light2);line-height:1.5;">',
  '<div data-style="margin-top:6px;font-size:12px;color:var(--light2);line-height:1.5;">', 1),
 ('src/game/display/poke-modal.js',
  'style="width:calc(100% - 24px);margin:8px auto 4px;display:block;"',
  'data-style="width:calc(100% - 24px);margin:8px auto 4px;display:block;"', 1),
 ('src/game/display/poke-modal.js',
  'return `<div style="background:${bg};border:${border};color:${color};padding:8px 12px;border-radius:8px;font-size:12.5px;font-weight:bold;margin:6px 0;display:',
  'return `<div data-style="background:var(--pm-note-bg);border:var(--pm-note-border);color:var(--pm-note-c);padding:8px 12px;border-radius:8px;font-size:12.5px;font-weight:bold;margin:6px 0;display:', 1),
 ('src/game/display/poke-modal.js',
  'style="font-size:10px;margin-left:auto;"', 'data-style="font-size:10px;margin-left:auto;"', 1),
 ('src/game/display/poke-modal.js',
  'style="font-size:11px;color:var(--light1);font-weight:400;"',
  'data-style="font-size:11px;color:var(--light1);font-weight:400;"', 1),
 ('src/game/display/poke-modal.js',
  'style="font-size:12px;color:var(--light1);font-weight:400;"',
  'data-style="font-size:12px;color:var(--light1);font-weight:400;"', 1),
 ('src/game/display/poke-modal.js',
  '<div class="poke-detail-moves-block" style="max-height:70vh;overflow-y:auto;padding:0 4px;">',
  '<div class="poke-detail-moves-block" data-style="max-height:70vh;overflow-y:auto;padding:0 4px;">', 1),
 ('src/game/display/poke-modal.js',
  '<div class="pw-flex-center pw-gap-sm" style="margin-top:8px;">',
  '<div class="pw-flex-center pw-gap-sm" data-style="margin-top:8px;">', 1),

 # --------------------------------------------------------------------------
 ('src/game/economy/inventory.js',
  '` <span style="color:var(--green);font-size:10px">\\u2713 ${equipped.name}</span>`',
  '` <span data-style="color:var(--green);font-size:10px">\\u2713 ${equipped.name}</span>`', 1),

 # --------------------------------------------------------------------------
 ('src/game/ui/Components.js',
  "var w = opts.w ? ' style=\"max-width:' + opts.w + 'px\"' : '';",
  "var w = opts.w ? ' data-style=\"max-width:var(--pw-modal-w);\" style=\"--pw-modal-w:' + opts.w + 'px\"' : '';", 1),
 ('src/game/ui/Components.js',
  "var style = opts.style ? ' style=\"' + opts.style + '\"' : '';",
  "var style = opts.style ? ' data-style=\"' + opts.style + '\"' : '';", 1),
 ('src/game/ui/Components.js',
  "return '<span style=\"font-size:' + size + 'px;\">\\u2753</span>';",
  "return '<span data-style=\"font-size:var(--ii-fs);\" style=\"--ii-fs:' + size + 'px;\">\\u2753</span>';", 1),
 ('src/game/ui/Components.js',
  "return '<div class=\"pw-grid\" style=\"display:grid;grid-template-columns:repeat(' + cols + ');gap:12px;\">' +",
  "return '<div class=\"pw-grid\" data-style=\"display:grid;grid-template-columns:repeat(' + cols + ');gap:12px;\">' +", 1),
 ('src/game/ui/Components.js',
  "return '<div class=\"pw-header-row\" style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;\">' +",
  "return '<div class=\"pw-header-row\" data-style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;\">' +", 1),
 ('src/game/ui/Components.js',
  "return '<div class=\"pw-actions\" style=\"display:flex;gap:8px;margin-top:8px;\">' +",
  "return '<div class=\"pw-actions\" data-style=\"display:flex;gap:8px;margin-top:8px;\">' +", 1),
]

def main():
    total_ok = 0
    fails = []
    cache = {}
    for path, old, new, min_count in JOBS:
        if path not in cache:
            cache[path] = io.open(ROOT + path, encoding='utf-8').read()
        src = cache[path]
        n = src.count(old)
        if n < min_count:
            fails.append((path, old[:70], n, min_count))
            continue
        src = src.replace(old, new)
        cache[path] = src
        total_ok += 1
    for path, src in cache.items():
        io.open(ROOT + path, 'w', encoding='utf-8').write(src)
    print('remplacements OK:', total_ok, '/', len(JOBS))
    for f in fails:
        print('ÉCHEC:', f)
    return 1 if fails else 0

if __name__ == '__main__':
    sys.exit(main())


