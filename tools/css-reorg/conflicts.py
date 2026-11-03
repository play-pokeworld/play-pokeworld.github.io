"""
Cascade-preserving placement.

Moving a rule from sheet A to sheet B changes who wins when the same selector appears in both. The
legacy sheets were one cascade, so the generator must keep, per selector, the effective declaration
block it used to have. This module:

  1. computes the effective block of every selector in the legacy cascade (order + !important),
  2. moves every selector whose rules landed in several sheets to the LAST of those sheets, keeping
     the legacy order among its rules,
  3. reports the selectors whose effective block still differs, so the sheet order can be fixed.
"""
import re
from collections import defaultdict


def declarations(body):
    """[(property, value, important)] for one declaration block."""
    out = []
    for part in split_top_level(body):
        if ':' not in part:
            continue
        prop, value = part.split(':', 1)
        value = value.strip()
        important = value.lower().endswith('!important')
        if important:
            value = value[: -len('!important')].strip()
        out.append((prop.strip().lower(), value, important))
    return out


def split_top_level(body):
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
            parts.append(current.strip())
            current = ''
            continue
        current += char
    if current.strip():
        parts.append(current.strip())
    return [part for part in parts if part]


def effective(sequence):
    """Merged declaration block for an ordered list of declaration lists."""
    merged = {}
    for index, block in enumerate(sequence):
        for prop, value, important in block:
            previous = merged.get(prop)
            if previous and previous[2] and not important:
                continue
            merged[prop] = (value, index, important)
    return {prop: (value, important) for prop, (value, _index, important) in merged.items()}


def key(block):
    return ';'.join(f'{prop}:{value}{"!" if important else ""}' for prop, (value, important) in sorted(block.items()))


def legacy_map(blocks):
    """selector → effective block, following the legacy document order."""
    per_selector = defaultdict(list)
    for block in blocks:
        if block['kind'] != 'rule':
            continue
        media = ' and '.join(block.get('media') or [])
        for selector in split_selectors(block['selector']):
            per_selector[(media, selector)].append(declarations(block['body']))
    return {name: effective(parts) for name, parts in per_selector.items()}


def split_selectors(text):
    from extract import split_selector_list
    return split_selector_list(text)


def resolver(blocks, order_index, assignment):
    """
    Returns a new `assignment` (block id → sheet) where every selector lives in one sheet: the last
    one in cascade order among the sheets it was spread over.
    """
    per_selector = defaultdict(list)
    for position, block in enumerate(blocks):
        if block['kind'] != 'rule':
            continue
        for selector in split_selectors(block['selector']):
            per_selector[(' and '.join(block.get('media') or []), selector)].append(position)

    new_assignment = dict(assignment)
    for name, positions in per_selector.items():
        if any(position not in new_assignment for position in positions):
            continue
        sheets = {new_assignment[position] for position in positions}
        if len(sheets) > 1:
            target = max(sheets, key=lambda sheet: order_index[sheet])
            for position in positions:
                new_assignment[position] = target
    return new_assignment
