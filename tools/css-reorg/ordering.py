"""Derive the manifest order from the legacy cascade.

The per-object split is neutral only where the cascade is decided by specificity. When two rules
of the same specificity target the same element with different values, the sheet position alone
decides — so the order of the sheets must reproduce the historical order of the rules they now
hold. tests/browser/CssTies.mjs reports those ties; this module turns them into a sheet order:

  1. every tied selector is located in the legacy tree (file + document index)
  2. a tie whose legacy winner came first means the two sheets are inverted today → one vote
  3. sheets are topologically sorted by decreasing vote weight, foundations pinned first
"""
import collections
import glob
import os

from extract import parse, split_selector_list

FOUNDATION = ['core/fonts.css', 'core/tokens.css', 'core/variables.css', 'core/themes.css']


def legacy_positions(root):
    """selector → mean document index of every legacy rule that carries it."""
    positions = collections.defaultdict(list)
    index = 0
    for path in sorted(glob.glob(os.path.join(root, '**/*.css'), recursive=True)):
        with open(path, encoding='utf-8') as handle:
            for block in parse(handle.read()):
                if block['kind'] != 'rule':
                    continue
                index += 1
                for selector in split_selector_list(block['selector']):
                    positions[selector.strip()].append(index)
    return {selector: sum(values) / len(values) for selector, values in positions.items()}


def votes_from_ties(ties, positions):
    """(before, after) sheet pairs, weighted by how many elements say the legacy order was that way."""
    votes = collections.Counter()
    unknown = 0
    for tie in ties:
        loser = positions.get(tie['loser']['selector'])
        winner = positions.get(tie['winner']['selector'])
        if loser is None or winner is None:
            unknown += 1
            continue
        if loser > winner:
            votes[(tie['winner']['sheet'], tie['loser']['sheet'])] += 1
    return votes, unknown


def sheet_order(paths, tree_order, votes):
    """Minimal repair: keep the declared order, slide a sheet up only where a vote is violated."""
    order = [path for path in tree_order if path in paths]
    order += [path for path in sorted(paths) if path not in order]
    edges = collections.Counter(
        {(before, after): weight for (before, after), weight in votes.items()
         if before in order and after in order and before != after}
    )
    for _ in range(len(order)):
        violated = [(weight, before, after) for (before, after), weight in edges.items()
                    if order.index(before) > order.index(after)]
        if not violated:
            break
        weight, before, after = max(violated)
        order.remove(before)
        order.insert(order.index(after), before)
        del edges[(before, after)]
    return order


def invert_weight(order, votes):
    """Total weight of the voted pairs the order gets wrong."""
    rank = {path: index for index, path in enumerate(order)}
    return sum(weight for (before, after), weight in votes.items()
               if rank.get(before, -1) > rank.get(after, -1))


def optimise(tree_order, votes, rounds=40):
    """Sifting: move one sheet at a time to the position that puts the fewest votes in the wrong order.

    The weighted-inversion count is the exact cost of the manifest: a voted pair the order gets
    wrong is an element whose declared value no longer matches the legacy cascade.
    """
    order = [path for path in tree_order]
    best = invert_weight(order, votes)
    for _ in range(rounds):
        improved = False
        for path in list(order):
            rest = [entry for entry in order if entry != path]
            best_position, best_score = None, best
            for position in range(len(rest) + 1):
                candidate = rest[:position] + [path] + rest[position:]
                score = invert_weight(candidate, votes)
                if score < best_score:
                    best_position, best_score = position, score
            if best_position is not None:
                order = rest[:best_position] + [path] + rest[best_position:]
                best = best_score
                improved = True
        if not improved:
            break
    return order, best


def legacy_rules(root):
    """Every legacy rule, in document order, with its selectors and declared values."""
    rules = []
    index = 0
    for path in sorted(glob.glob(os.path.join(root, '**/*.css'), recursive=True)):
        with open(path, encoding='utf-8') as handle:
            for block in parse(handle.read()):
                if block['kind'] != 'rule':
                    continue
                index += 1
                declared = {}
                for part in block['body'].split(';'):
                    if ':' not in part:
                        continue
                    prop, value = part.split(':', 1)
                    declared[prop.strip().lower()] = ' '.join(value.split())
                rules.append({
                    'index': index,
                    'file': '/'.join(path.replace(root, '').strip('/').split('/')[-2:]),
                    'selectors': split_selector_list(block['selector']),
                    'declared': declared,
                })
    return rules


def last_declaration(rules, selector, prop, value):
    """Document index of the legacy rule that actually paints this declaration, or None."""
    found = None
    for rule in rules:
        if selector not in rule['selectors']:
            continue
        if rule['declared'].get(prop) == value:
            found = rule['index']
    return found


def votes_from_ties(rules, ties):
    """Precise votes: compare the legacy position of the declaration that paints each side.

    A tie is only an inversion when the declaration that wins today sits, in the legacy tree, before
    the declaration it now beats — the value that paints the element then flips.
    """
    votes = collections.Counter()
    unknown = 0
    for tie in ties:
        prop = tie['key'].split('|')[1]
        winner = last_declaration(rules, tie['winner']['selector'], prop, tie['winner']['value'])
        loser = last_declaration(rules, tie['loser']['selector'], prop, tie['loser']['value'])
        if winner is None or loser is None:
            unknown += 1
            continue
        if winner < loser:  # legacy painted the loser: that sheet has to come last
            votes[(tie['loser']['sheet'], tie['winner']['sheet'])] += 1
    return votes, unknown
