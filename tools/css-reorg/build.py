"""
One-off generator: rewrites assets/css as one sheet per UI object.

Steps
  1. parse every legacy sheet into individual blocks (rules, at-rules, keyframes) in document order
  2. classify each block into its owner sheet (tools/css-reorg/classify.py + vocabulary.py)
  3. drop rules whose classes are referenced nowhere in the code (dead generated classes)
  4. write the new tree, then the manifest, in the folder order declared by classify.TREE

Run from the repository root:  python3 tools/css-reorg/build.py --report
                              python3 tools/css-reorg/build.py --write
"""
import glob
import json
import os
import re
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extract import all_blocks, split_selector_list  # noqa: E402
from classify import TREE, classify  # noqa: E402
from vocabulary import owner_from_code  # noqa: E402
from conflicts import key, legacy_map, resolver  # noqa: E402

TRANSLATIONS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'comments.json')

# A comment is kept only when it explains a constraint (why a rule exists). Changelog markers are
# dropped: the phase documents already record what changed when.
EXPLAIN = re.compile(
    r'\b(root cause|cause racine|do not|don\'t|never|must|avoid|instead|because|car sinon|sinon|'
    r'keep|conserve|only|jamais|ne pas|ne doit|obligatoire|attention|gotcha|why|sinon)\b',
    re.I,
)
CHANGELOG = re.compile(r'\b(wave|passe|phase|v7|ds2\d{3}|r1 #|#\d+\b)', re.I)


def norm_comment(text):
    text = re.sub(r'^/\*+|\*/$', '', text or '').strip()
    text = re.sub(r'^[\s\-=*─═]+', '', text)
    text = re.sub(r'[\s\-=*─═]+$', '', text)
    return ' '.join(text.split())


def keep_comment(text):
    plain = norm_comment(text)
    if len(plain) < 40:
        return False
    if not EXPLAIN.search(plain):
        return False
    return True


CODE_FIRST = os.environ.get('CSS_OWNER', 'code') == 'code'


def owner_of(kind, selector, body=''):
    """Who owns this selector: the module that writes it in the code, else the declared map.

    The code is the authority: a class is written by the component that renders it, so the module
    that mentions it names the sheet. The regex map only fills the gap for selectors that no module
    writes (element resets, attribute selectors, generated states).
    """
    mapped = classify({'kind': kind, 'selector': selector, 'body': body})
    if not CODE_FIRST:
        return mapped
    from_code = owner_from_code(selector)
    if from_code and from_code != 'DELETE':
        return from_code
    return mapped


def main(write=False):
    blocks = all_blocks()
    targets = {folder + '/' + name: [] for folder, names in TREE for name in names}
    order = list(targets)
    dead = []
    orphans = []
    kept_comments = {}

    if os.path.exists(TRANSLATIONS):
        kept_comments = json.load(open(TRANSLATIONS, encoding='utf-8'))

    position_of = {}
    if os.environ.get('CSS_SPLIT', '1') == '1':
        blocks = split_shared_rules(blocks)
    else:
        for index, block in enumerate(blocks):
            block['order'] = index
    for block in blocks:
        owner = owner_of(block['kind'], block.get('selector') or block.get('prelude') or '', block.get('body') or '')
        if owner is None:
            owner = owner_from_code(block.get('selector') or block.get('prelude') or '')
        if owner is None:
            if is_dead(block):
                dead.append(block)
            else:
                orphans.append(block)
            continue
        if owner == 'DELETE':
            dead.append(block)
            continue
        if owner not in targets:
            orphans.append(block)
            continue
        position_of[block['order']] = len(targets[owner])
        targets[owner].append(block)

    # --- manifest order ------------------------------------------------------------------------
    # Zero-specificity `:where()` rules make the sheet order observable: two rules that both target
    # an element tie, and the later sheet wins. CSS_ORDER=median therefore orders the sheets by the
    # median document position of their blocks in the legacy tree, the closest linear approximation
    # of the historical order; the folder grouping alone does not preserve those ties.
    order_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'order.txt')
    if os.environ.get('CSS_ORDER', 'file') == 'file' and os.path.exists(order_file):
        declared = [line.strip() for line in open(order_file, encoding='utf-8') if line.strip()]
        order = [path for path in declared if path in targets] + [path for path in order if path not in declared]
        missing = [path for path in targets if path not in order]
        if missing:  # a sheet added after the order was measured goes last until it is placed
            print('order: not placed yet ->', ', '.join(missing))
            order += sorted(missing)

    if os.environ.get('CSS_ORDER') == 'median':
        positions = {path: sorted(block['order'] for block in targets[path]) for path in order}
        order = sorted(order, key=lambda path: (positions[path][len(positions[path]) // 2]
                                               if positions[path] else 10 ** 9, path))

    # --- cascade preservation: one sheet per selector, in the legacy effective order -----------
    order_index = {path: index for index, path in enumerate(order)}
    owned = {}
    for path in order:
        for block in targets[path]:
            owned[block['order']] = path
    fixed = resolver(blocks, order_index, owned)
    moved = sum(1 for position, path in fixed.items() if owned.get(position) != path)
    regrouped = {path: [] for path in order}
    for block in blocks:
        path = fixed.get(block['order'])
        if path:
            regrouped[path].append(block)
    # A moved rule must keep the document position it had in the legacy tree, otherwise it lands
    # after rules it used to precede and silently wins a tie it used to lose.
    targets = {path: sorted(items, key=lambda block: block['order']) for path, items in regrouped.items()}
    print(f'cascade: {moved} rule(s) moved to the last sheet of their selector')

    reference = legacy_map(blocks)
    produced = legacy_map([block for path in order for block in targets[path]])
    dropped = [name for name in reference if name not in produced]
    mismatched = [name for name in reference if name in produced and key(reference[name]) != key(produced[name])]
    print(f'cascade: {len(dropped)} selector(s) dropped with their dead rules')
    print(f'cascade: {len(mismatched)} selector(s) differ from the legacy effective block')
    for name in mismatched[:20]:
        print('   ', name[1])

    if orphans:
        print(f'{len(orphans)} rule(s) have no owner sheet — add them to tools/css-reorg/classify.py:')
        for block in orphans:
            print('  ', (block.get('selector') or block.get('prelude'))[:100])

    if '--map' in sys.argv:
        owned_by = {}
        for path in order:
            for block in targets[path]:
                for selector in split_selector_list(block.get('selector') or ''):
                    owned_by.setdefault(selector, path)
        json.dump(owned_by, open(os.environ.get('CSS_MAP_OUT', '/tmp/css-map.json'), 'w'))
        print('selector map →', os.environ.get('CSS_MAP_OUT', '/tmp/css-map.json'), len(owned_by), 'selectors')
        return

    if '--report' in sys.argv:
        print('blocks', len(blocks), '| owned', sum(len(v) for v in targets.values()),
              '| dead', len(dead), '| orphans', len(orphans))
        for path in order:
            if targets[path]:
                print(f'  {path:34s} {len(targets[path]):4d} blocks')
        for block in orphans[:40]:
            print('ORPHAN', (block.get('selector') or block.get('prelude'))[:90])
        return

    if orphans and write:
        print('refusing to write while rules have no owner')
        return

    if not write:
        print('nothing written (pass --write)')
        return

    # fresh tree
    root = 'assets/css'
    for entry in os.listdir(root):
        if entry != 'style.css':
            shutil.rmtree(os.path.join(root, entry)) if os.path.isdir(os.path.join(root, entry)) else os.remove(os.path.join(root, entry))

    manifest = ['/*',
                ' * PokéWorld — stylesheet manifest',
                ' * ---------------------------------------------------------------------------',
                ' * This file holds NO rule: it declares the cascade, once, in import order.',
                ' *   core/        design tokens, fonts, base elements, themes, animations',
                ' *   layout/      page skeleton, header bar, dashboard grid, window chrome, mobile',
                ' *   components/  one sheet per reusable widget',
                ' *   panels/      one sheet per game window',
                ' * Adding a sheet = writing it in the right folder AND adding one line here.',
                ' */',
                '']
    for path in order:
        items = targets[path]
        folder, name = path.split('/')
        os.makedirs(os.path.join(root, folder), exist_ok=True)
        text = rebuild_with_media(items, kept_comments, TITLES.get(name, ''), folder, name)
        open(os.path.join(root, folder, name), 'w', encoding='utf-8').write(text)
        manifest.append(f'@import url("./{folder}/{name}");')

    manifest.append('')
    open(os.path.join(root, 'style.css'), 'w', encoding='utf-8').write('\n'.join(manifest))
    print('written', sum(1 for path in order if targets[path]), 'sheets')


def split_shared_rules(blocks):
    """A rule whose selectors belong to several sheets is split, so every selector keeps its order."""
    out = []
    counter = 0
    for block in blocks:
        if block['kind'] != 'rule':
            block['order'] = counter
            counter += 1
            out.append(block)
            continue
        selectors = split_selector_list(block['selector'])
        groups = {}
        for selector in selectors:
            owner = owner_of('rule', selector, block['body'])
            if owner is None:
                from vocabulary import owner_from_code
                owner = owner_from_code(selector)
            groups.setdefault(owner or '', []).append(selector)
        if len(groups) <= 1:
            block['order'] = counter
            counter += 1
            out.append(block)
            continue
        for group in groups.values():
            copy = dict(block)
            copy['selector'] = ', '.join(group)
            copy['order'] = counter
            counter += 1
            out.append(copy)
    return out


CODE_CORPUS = ''


def load_corpus():
    """Every class name that appears anywhere in the code, to prove a rule is dead before dropping it."""
    global CODE_CORPUS
    if not CODE_CORPUS:
        files = glob.glob('src/**/*.js', recursive=True) + ['index.html']
        files += glob.glob('tests/**/*.js', recursive=True) + glob.glob('tests/**/*.mjs', recursive=True)
        CODE_CORPUS = '\n'.join(open(path, encoding='utf-8').read() for path in files)
    return CODE_CORPUS


def is_dead(block):
    """True when none of the selector's class names is referenced by the code, tests or index.html."""
    selector = (block.get('selector') or '').lower()
    names = re.findall(r'\.([a-z][a-z0-9_-]*)', selector)
    ids = re.findall(r'#([a-z][a-z0-9_-]*)', selector)
    if not names and not ids:
        return False
    corpus = load_corpus()
    if names and any(re.search(r'\b' + re.escape(name) + r'\b', corpus) for name in names):
        return False
    if ids and any(re.search(r'\b' + re.escape(name) + r'\b', corpus) for name in ids):
        return False
    return True


FRENCH = re.compile(
    r'\b(les|des|une|dans|pour|avec|est|sont|cette|cettes|être|doit|doivent|pas|plus|sur|par|que|qui|'
    r'mais|comme|tout|tous|toute|toutes|elle|nous|vous|aux|leur|leurs|aussi|déjà|jamais|toujours|'
    r'selon|donc|ainsi|afin|lors|entre|sans|sous|vers|chez|néanmoins|cependant|aujourd|était|étaient|'
    r'il|elle|ont|avoir|fait|peut|peuvent|même|chaque|aucun|aucune|car|néanmoins)\b',
    re.I,
)
ACCENT = re.compile(r'[àâäçéèêëîïôöùûüÿœæ]', re.I)


def is_english(text):
    """The stylesheets are English-only: a comment with French vocabulary or accents is dropped."""
    if ACCENT.search(text):
        return False
    return len(FRENCH.findall(text)) < 2


def split_declarations(body):
    """Splits a declaration block on the top-level semicolons (strings and parentheses respected)."""
    body = re.sub(r'/\*.*?\*/', ' ', body or '', flags=re.S)
    parts = []
    current = ''
    depth = 0
    quote = ''
    for char in body:
        if quote:
            current += char
            if char == quote:
                quote = ''
            continue
        if char in '\'"':
            quote = char
            current += char
            continue
        if char in '([{':
            depth += 1
        elif char in ')]}':
            depth -= 1
        if char == ';' and depth <= 0:
            parts.append(current)
            current = ''
            continue
        current += char
    if current.strip():
        parts.append(current)
    return [part.strip() for part in parts if part.strip()]


def indent_body(body):
    """One declaration per line, two-space indent: the sheets stay readable after the move."""
    return '\n'.join('  ' + part + ';' for part in split_declarations(body))


def rebuild_with_media(items, kept_comments, title, folder, name):
    """Writes the blocks of one sheet, re-opening the enclosing at-rules when the group changes."""
    out = ['/*', f' * {folder}/{name}', ' * ' + '-' * 75]
    if title:
        out.append(' * ' + title)
    out.append(' * One file, one object: the rules below all belong to this sheet, whatever era they were written in.')
    out.append(' */')
    out.append('')
    out.append('')

    current_media = ()

    for block in items:
        media = tuple(block.get('media', []))
        if media != current_media:
            for _ in current_media:
                out.append('}')
            if current_media:
                out.append('')
            current_media = media
            for query in media:
                out.append(query + ' {')
        comment = ''
        if keep_comment(block.get('comment')):
            plain = norm_comment(block['comment'])
            if is_english(plain):
                comment = ' '.join(plain.split())
        if comment:
            out.append('')
            out.append('/* ' + comment + ' */')
        out.append((block.get('selector') or block.get('prelude')) + ' {')
        out.append(indent_body(block['body']))
        out.append('}')
        out.append('')

    for _ in current_media:
        out.append('}')
    return '\n'.join(out).rstrip() + '\n'


TITLES = {
    'fonts.css': 'Font faces used by the interface.',
    'tokens.css': 'Design tokens (`--pw-*`): palette, spacing, radii, shadows, motion.',
    'variables.css': 'Legacy palette variables (`--dark1`, `--light2`, `--accent`…) still used by the panels.',
    'themes.css': 'Per-theme overrides, scoped with `:root[data-theme="…"]`.',
    'base.css': 'Element defaults and resets (html, body, headings, form controls, selection).',
    'keyframes.css': 'Every animation used by the interface; names are global, so they live in one place.',
    'scrollbars.css': 'Scrollbar styling for the page scroller and the nested scroll regions.',
    'page-shell.css': 'Page skeleton: what wraps the game screen.',
    'header-bar.css': 'Top bar: brand, player card, currencies, update banner.',
    'dashboard-grid.css': 'Dashboard columns and the window stacking order.',
    'window-chrome.css': 'Window frame shared by every panel: header, footer, close control, drag.',
    'mobile.css': 'Mobile layout: stacked windows, compact chrome, touch targets.',
    'mobile-nav.css': 'Bottom navigation bar on mobile.',
    'screens.css': 'Full-screen screens (save menu, game screen) shell.',
}

if __name__ == '__main__':
    main('--write' in sys.argv)
