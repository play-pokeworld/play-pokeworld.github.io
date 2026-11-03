"""
One-off CSS reorganisation tool (run from the repository root).

Splits every legacy sheet into individual rules, classifies each rule by the UI object it styles,
and rewrites the tree as one file per object. Run with --dry to print the classification report.
"""
import glob
import json
import re
import sys
from collections import Counter, OrderedDict

import os
CSS_DIR = os.environ.get('CSS_SRC', 'assets/css')


def manifest_order(root=CSS_DIR):
    """The sheets in cascade order: the order the browser applies them, read from style.css.

    Reading a directory and sorting it is NOT the cascade: `components/ui-modal.css` comes after
    `design-system/pass-22.css` in the manifest even though it sorts before it.
    """
    entry = os.path.join(root, 'style.css')
    order = []
    pending = [entry] if os.path.exists(entry) else []
    seen = set()
    while pending:
        current = pending.pop(0)
        if current in seen:
            continue
        seen.add(current)
        text = open(current, encoding='utf-8').read()
        imports = re.findall(r'@import\s+url\(["\']?([^"\')]+)["\']?\)', text)
        if imports:
            base = os.path.dirname(current)
            pending = [os.path.normpath(os.path.join(base, href)) for href in imports] + pending
            continue
        order.append(current)
    return order


LEGACY = manifest_order()


def strip_comments(text):
    return re.sub(r'/\*.*?\*/', '', text, flags=re.S)


def parse(text):
    """Returns a flat list of blocks: {kind, media, supports, selector, body, comment, order}."""
    blocks = []
    order = 0
    pending_comment = ''
    i = 0
    n = len(text)
    media = []
    while i < n:
        if text.startswith('/*', i):
            end = text.index('*/', i) + 2
            pending_comment = text[i:end]
            i = end
            continue
        if text[i] in ' \t\r\n':
            i += 1
            continue
        if text[i] == '@':
            # at-rule: read the prelude up to { or ;
            j = i
            depth = 0
            while j < n:
                if text[j] == '{':
                    break
                if text[j] == ';' and depth == 0:
                    break
                j += 1
            prelude = text[i:j].strip()
            if j < n and text[j] == ';':
                blocks.append({'kind': 'at-simple', 'prelude': prelude, 'media': list(media),
                               'body': '', 'comment': pending_comment, 'order': order})
                order += 1
                pending_comment = ''
                i = j + 1
                continue
            # read the block body, supporting nesting for @media/@supports
            k = j + 1
            depth = 1
            while k < n and depth:
                if text[k] == '{':
                    depth += 1
                elif text[k] == '}':
                    depth -= 1
                k += 1
            inner = text[j + 1:k - 1]
            name = prelude.split()[0].lower()
            if name in ('@media', '@supports', '@layer', '@container'):
                media.append(prelude)
                blocks.extend(parse_with_context(inner, media, order))
                order += 1
                media.pop()
            else:
                blocks.append({'kind': 'at-block', 'prelude': prelude, 'media': list(media),
                               'body': inner.strip(), 'comment': pending_comment, 'order': order})
                order += 1
            pending_comment = ''
            i = k
            continue
        # normal rule
        j = i
        while j < n and text[j] != '{':
            j += 1
        selector = re.sub(r'/\*.*?\*/', '', text[i:j], flags=re.S).strip()
        k = j + 1
        depth = 1
        while k < n and depth:
            if text[k] == '{':
                depth += 1
            elif text[k] == '}':
                depth -= 1
            k += 1
        body = text[j + 1:k - 1]
        blocks.append({'kind': 'rule', 'selector': selector, 'media': list(media), 'body': body,
                       'comment': pending_comment, 'order': order})
        order += 1
        pending_comment = ''
        i = k
    return blocks


def parse_with_context(text, media, start_order):
    out = []
    i = 0
    n = len(text)
    pending = ''
    order = start_order
    while i < n:
        if text.startswith('/*', i):
            end = text.index('*/', i) + 2
            pending = text[i:end]
            i = end
            continue
        if text[i] in ' \t\r\n':
            i += 1
            continue
        j = i
        while j < n and text[j] != '{':
            j += 1
        selector = re.sub(r'/\*.*?\*/', '', text[i:j], flags=re.S).strip()
        k = j + 1
        depth = 1
        while k < n and depth:
            if text[k] == '{':
                depth += 1
            elif text[k] == '}':
                depth -= 1
            k += 1
        inner = text[j + 1:k - 1]
        name = selector.split()[0].lower() if selector else ''
        if name in ('@media', '@supports', '@layer', '@container'):
            out.extend(parse_with_context(inner, media + [selector], order))
        else:
            out.append({'kind': 'rule', 'selector': selector, 'media': list(media), 'body': inner,
                        'comment': pending, 'order': order})
            order += 1
        pending = ''
        i = k
    return out


def all_blocks():
    blocks = []
    for path in LEGACY:
        text = open(path, encoding='utf-8').read()
        for block in parse(text):
            block['source'] = path
            blocks.append(block)
    return blocks


def split_selector_list(text):
    """Split a selector list on top-level commas only.

    `:where(.a, .b)` and `:is(.a, .b)` carry commas that belong to ONE selector: splitting there
    would turn a single compound selector into two broken ones.
    """
    parts = []
    depth = 0
    quote = None
    current = []
    for char in text or '':
        if quote:
            current.append(char)
            if char == quote:
                quote = None
            continue
        if char in '"\'':
            quote = char
        elif char in '([':
            depth += 1
        elif char in ')]':
            depth -= 1
        elif char == ',' and depth == 0:
            parts.append(''.join(current).strip())
            current = []
            continue
        current.append(char)
    if current:
        parts.append(''.join(current).strip())
    return [part for part in parts if part]


if __name__ == '__main__':
    blocks = all_blocks()
    print('files', len(LEGACY), 'blocks', len(blocks))
    kinds = Counter(b['kind'] for b in blocks)
    print(kinds)
    root = Counter()
    for b in blocks:
        if b['kind'] != 'rule':
            continue
        for part in b['selector'].split(','):
            toks = re.findall(r'[.#][A-Za-z0-9_-]+', part)
            root[toks[0] if toks else part.strip().split()[0] if part.strip() else part] += 1
    print('roots', len(root))
    if '--dry' in sys.argv:
        for name, count in root.most_common():
            print(f'{count:4d} {name}')
