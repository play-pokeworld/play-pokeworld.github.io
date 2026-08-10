#!/usr/bin/env python3
"""Passe 53 — completes the autotiling table by HORIZONTAL SYMMETRY.

User feedback: "the tiles next to the door are still not the
right ones". Root cause: the `autotile-walls.json` table was LEARNED on the
24 canon maps of the decompilation; it therefore only covers the
neighborhoods that Game Freak actually used. Our floor rooms, taller and
more carved, produce legitimate neighborhoods ABSENT from the table — the
baker then falls back to its fallback tile (solid rock) and the wall
"does not wrap".

Rather than inventing tiles, we EXPLOIT a verified property of the
table: it is symmetric. For every (mask, mirror mask) pair already
present, the metatiles match exactly —

    0x201<->0x203   0x205<->0x207   0x209<->0x20b   0x20d<->0x20f
    0x211<->0x213   0x202, 0x20c, 0x210, 0x212: self-symmetric

(14 correspondences observed, 0 counter-example). We can therefore safely
DERIVE the metatile of a missing mask from its known mirror: it is the
same canon rule, read the other way around.

Output: autotile-walls.json enriched (learned entries unchanged).
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(HERE, 'emerald-ref', 'autotile-walls.json')

# bits : 0=NW 1=N 2=NE 3=W 4=E 5=SW 6=S 7=SE
def mirror_mask(m):
    b = [(m >> i) & 1 for i in range(8)]
    nb = [b[2], b[1], b[0], b[4], b[3], b[7], b[6], b[5]]
    return sum(v << i for i, v in enumerate(nb))


def main():
    raw = json.load(open(P))
    at = {int(k): int(v) for k, v in raw.items()}
    learned = dict(at)

    # 1) metatile correspondence table, INFERRED from known pairs
    pair = {}
    for m, v in learned.items():
        mm = mirror_mask(m)
        if mm in learned:
            other = learned[mm]
            if v in pair and pair[v] != other:
                raise SystemExit(f'incoherent symmetry: {hex(v)} -> {hex(pair[v])} and {hex(other)}')
            pair[v] = other
    print(f'{len(pair)} metatile correspondences derived from the learned pairs')

    # 2) completion: any mask whose mirror is known becomes derivable
    added = 0
    for m in range(256):
        if m in at:
            continue
        mm = mirror_mask(m)
        if mm in learned and learned[mm] in pair:
            at[m] = pair[learned[mm]]
            added += 1

    json.dump({str(k): at[k] for k in sorted(at)}, open(P, 'w'), indent=1)
    print(f'{len(learned)} learned entries + {added} derived by mirror = {len(at)}')


if __name__ == '__main__':
    main()
