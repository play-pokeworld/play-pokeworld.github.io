#!/usr/bin/env python3
"""PokéWorld — bande-son CC0 livrée (V7-R2 SND-03 · V7-R3b SND-05).

Reconstruit `src/assets/audio/music/*.mp3` (26 boucles) et `src/assets/audio/sfx/*.wav`
(22 effets) à partir des sources **CC0 1.0** de Juhani Junkala publiées sur archive.org :
  - JRPG packs 1–5, « JRPG Theme [Loop Ready] », « Epic Boss Battle » (musiques) ;
  - « The Essential Retro Video Game Sound Effects Collection (512 sounds) » (effets).

Usage :  python3 tools/audio-cc0-pack.py [--music] [--sfx]      (les deux par défaut)
Dépendances : pip install miniaudio lameenc numpy
Sortie : MP3 joint-stéréo 80 kb/s (crête −1 dBFS) ; WAV mono 16 bits 22,05 kHz (crête −9 dBFS).
Ensuite : node tools/audio-manifest.mjs (fait aussi par npm run build). Crédits : docs/CREDITS.md.
"""
from __future__ import annotations

import io
import os
import sys
import time
import urllib.parse
import urllib.request
import wave
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MUSIC_DIR = ROOT / 'src/assets/audio/music'
SFX_DIR = ROOT / 'src/assets/audio/sfx'
TMP = Path(os.environ.get('PW_AUDIO_TMP', '/tmp/pw-audio-cc0'))
UA = {'User-Agent': 'PokeWorld-assets/1.0'}

# clé → (identifiant archive.org, nom du fichier source)
MUSIC = {
    'menu': ('JuhaniJunkala-JRPGpack4calm', 'Calm1 - A Place I Call Home.ogg'),
    'map_kanto': ('JuhaniJunkala-JRPGpack1-Exploration', 'Exploration1 - Grasslands.ogg'),
    'map_johto': ('JuhaniJunkala-JRPGpack4calm', 'Calm3 - Peaceful Days.ogg'),
    'map_hoenn': ('JuhaniJunkala-JRPGpack1-Exploration', 'Exploration6 - Tropical Island.ogg'),
    'town': ('JuhaniJunkala-JRPGpack2Town', 'Town1 - Home Town.ogg'),
    'town_johto': ('JuhaniJunkala-JRPGpack4calm', 'Calm6 - Innocence.ogg'),
    'town_hoenn': ('JuhaniJunkala-JRPGpack4calm', 'Calm4 - Sand Castles.ogg'),
    # V7-R3c · SND-06 — diversité des lieux
    'town_home': ('JuhaniJunkala-JRPGpack4calm', 'Calm2 - Childhood Friends.ogg'),
    'town_city': ('JuhaniJunkala-JRPGpack2Town', 'Town4 - Bazaar.ogg'),
    'town_coast': ('JuhaniJunkala-JRPGpack4calm', 'Calm5 - Summer Memories.ogg'),
    'sea': ('JuhaniJunkala-JRPGpack2Town', 'Town3 - Sunshine Coast.ogg'),
    'map_night': ('JuhaniJunkala-JRPGpack1-Exploration', 'Exploration4 - Prairie Nights.ogg'),
    'loc_lavender': ('JuhaniJunkala-JRPGpack3Evil', 'Evil5 - Whispers From Beyond.ogg'),
    'loc_ecruteak': ('JuhaniJunkala-JRPGpack2Town', 'Town2 - Where Time Stands Still.ogg'),
    'battle_wild': ('JuhaniJunkala-JRPGpack5action', 'Action3 - Preparing For Battle.ogg'),
    'battle_trainer': ('JuhaniJunkala-JRPGpack5action', 'Action1 - Encounter With The Witches.ogg'),
    'battle_gym': ('JuhaniJunkala-JRPGpack5action', 'Action2 - Army Approaching.ogg'),
    'battle_league': ('JuhaniJunkala-JRPGThemeLoopReady', 'Juhani Junkala - JRPG Theme [Loop Ready].ogg'),
    'battle_legendary': ('JuhaniJunkala-JRPGpack3Evil', 'Evil1 - Ancient Evil Awakens.ogg'),
    'battle_roaming': ('JuhaniJunkala-JRPGpack3Evil', 'Evil3 - Apocalypse.ogg'),
    'battle_boss': ('JuhaniJunkala-EpicBossBattleSeamlesslyLooping', 'Juhani Junkala - Epic Boss Battle [Seamlessly Looping].ogg'),
    'dungeon': ('JuhaniJunkala-JRPGpack1-Exploration', "Exploration3 - Tha'el Mines.ogg"),
    'dungeon_tower': ('JuhaniJunkala-JRPGpack3Evil', 'Evil2 - Catacombs.ogg'),
    'dungeon_forest': ('JuhaniJunkala-JRPGpack1-Exploration', 'Exploration5 - Sneaking Around.ogg'),
    'dungeon_plant': ('JuhaniJunkala-JRPGpack1-Exploration', 'Exploration2 - Military Base.ogg'),
    'dungeon_lair': ('JuhaniJunkala-JRPGpack3Evil', "Evil4 - Witch's Lair.ogg"),
}
SFX_ZIP = ('TheEssentialRetroVideoGameSoundEffectsCollection512Sounds',
           'The Essential Retro Video Game Sound Effects Collection [512 sounds].zip')
# événement → chemin dans la collection (sous « …/By Juhani Junkala/ »)
SFX = {
    'click': 'General Sounds/Menu Sounds/sfx_menu_move2.wav',
    'open': 'General Sounds/Pause Sounds/sfx_sounds_pause1_in.wav',
    'notify': 'General Sounds/Interactions/sfx_sounds_interaction14.wav',
    'error': 'General Sounds/Negative Sounds/sfx_sounds_error10.wav',
    'buy': 'General Sounds/Coins/sfx_coin_double3.wav',
    'ko': 'General Sounds/Impacts/sfx_sounds_impact12.wav',
    'faint': 'Movement/Falling Sounds/sfx_sounds_falling6.wav',
    'levelup': 'General Sounds/Positive Sounds/sfx_sounds_powerup8.wav',
    'evolve': 'Movement/Portals and Transitions/sfx_movement_portal1.wav',
    'hatch': 'General Sounds/Positive Sounds/sfx_sounds_powerup3.wav',
    'throw': 'Movement/Jumping and Landing/sfx_movement_jump8.wav',
    'catch': 'General Sounds/Positive Sounds/sfx_sounds_powerup2.wav',
    'catch_fail': 'Explosions/Shortest/sfx_exp_shortest_soft3.wav',
    'badge': 'General Sounds/Fanfares/sfx_sounds_fanfare1.wav',
    'league': 'General Sounds/Positive Sounds/sfx_sounds_powerup4.wav',
    'shiny': 'General Sounds/Weird Sounds/sfx_sound_bling.wav',
    'shiny_catch': 'General Sounds/Positive Sounds/sfx_sounds_powerup12.wav',
    'boss': 'Explosions/Long/sfx_exp_long1.wav',
    'chest': 'General Sounds/Coins/sfx_coin_cluster4.wav',
    'quest': 'General Sounds/Fanfares/sfx_sounds_fanfare2.wav',
    'treasure': 'General Sounds/Coins/sfx_coin_cluster9.wav',
    'roamer': 'General Sounds/Alarms/Alarms/sfx_alarm_loop4.wav',
}
MP3_KBPS = 80
SFX_RATE = 22050


def fetch(ident: str, name: str, out: Path) -> Path:
    if out.exists() and out.stat().st_size > 50_000:
        return out
    url = f'https://archive.org/download/{ident}/{urllib.parse.quote(name)}'
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=180) as r:
                data = r.read()
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_bytes(data)
            return out
        except Exception as e:  # noqa: BLE001
            print(f'  nouvel essai ({e})', file=sys.stderr)
            time.sleep(2 + attempt * 2)
    raise RuntimeError(f'téléchargement impossible : {url}')


def build_music() -> None:
    import numpy as np
    import lameenc
    import miniaudio

    MUSIC_DIR.mkdir(parents=True, exist_ok=True)
    total = 0
    for key, (ident, name) in MUSIC.items():
        src = fetch(ident, name, TMP / 'music' / (key + Path(name).suffix.lower()))
        dec = miniaudio.decode_file(str(src), output_format=miniaudio.SampleFormat.SIGNED16, nchannels=2, sample_rate=44100)
        pcm = np.frombuffer(dec.samples, dtype='<i2')
        peak = int(np.max(np.abs(pcm.astype(np.int32)))) or 1
        target = int(32767 * 0.89)  # −1 dBFS
        if peak > target or peak < target * 0.6:
            pcm = np.clip(pcm.astype(np.float64) * (target / peak), -32768, 32767).astype('<i2')
        enc = lameenc.Encoder()
        enc.set_bit_rate(MP3_KBPS)
        enc.set_in_sample_rate(44100)
        enc.set_channels(2)
        enc.set_quality(2)
        mp3 = enc.encode(pcm.tobytes()) + enc.flush()
        (MUSIC_DIR / f'{key}.mp3').write_bytes(mp3)
        total += len(mp3)
        print(f'  music/{key}.mp3  {len(pcm) / 2 / 44100:6.1f} s  {len(mp3) / 1e6:5.2f} Mo')
    print(f'[cc0] musiques : {len(MUSIC)} pistes, {total / 1e6:.2f} Mo')


def _read_wav(data: bytes):
    import numpy as np

    w = wave.open(io.BytesIO(data))
    sr, ch, sw = w.getframerate(), w.getnchannels(), w.getsampwidth()
    raw = w.readframes(w.getnframes())
    w.close()
    if sw == 2:
        a = np.frombuffer(raw, dtype='<i2').astype(np.float32) / 32768
    elif sw == 1:
        a = (np.frombuffer(raw, dtype='u1').astype(np.float32) - 128) / 128
    elif sw == 3:
        b = np.frombuffer(raw, dtype='u1').reshape(-1, 3)
        a = (b[:, 0].astype(np.int32) | (b[:, 1].astype(np.int32) << 8) | (b[:, 2].astype(np.int32) << 16))
        a = np.where(a >= 1 << 23, a - (1 << 24), a).astype(np.float32) / (1 << 23)
    else:
        raise ValueError('WAV non géré')
    if ch > 1:
        a = a.reshape(-1, ch).mean(axis=1)
    return a, sr


def _resample(a, sr: int, out_sr: int):
    """Ré-échantillonnage par FFT (passe-bas idéal) — suffisant pour des effets courts."""
    import numpy as np

    if sr == out_sr:
        return a
    n_out = int(round(len(a) * out_sr / sr))
    spec = np.fft.rfft(a)
    keep = min(len(spec), n_out // 2 + 1)
    out = np.fft.irfft(spec[:keep], n=n_out) * (n_out / len(a))
    return out.astype(np.float32)


def build_sfx() -> None:
    import numpy as np

    SFX_DIR.mkdir(parents=True, exist_ok=True)
    zpath = fetch(SFX_ZIP[0], SFX_ZIP[1], TMP / 'sfx512.zip')
    z = zipfile.ZipFile(zpath)
    by_tail = {n.split('By Juhani Junkala/')[-1]: n for n in z.namelist()}
    total = 0
    for key, rel in SFX.items():
        a, sr = _read_wav(z.read(by_tail[rel]))
        idx = np.where(np.abs(a) > 0.004)[0]
        a = a[max(0, idx[0] - int(sr * 0.003)):idx[-1] + 1]
        a = _resample(a, sr, SFX_RATE)
        n = min(len(a), int(SFX_RATE * 0.01))
        a[-n:] *= np.linspace(1, 0, n)
        a = a * (0.35 / max(1e-6, float(np.max(np.abs(a)))))  # −9 dBFS
        pcm = np.clip(a * 32767, -32768, 32767).astype('<i2')
        w = wave.open(str(SFX_DIR / f'{key}.wav'), 'wb')
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SFX_RATE)
        w.writeframes(pcm.tobytes())
        w.close()
        size = (SFX_DIR / f'{key}.wav').stat().st_size
        total += size
        print(f'  sfx/{key}.wav  {len(pcm) / SFX_RATE:5.2f} s  {size / 1000:6.1f} Ko  ← {rel}')
    print(f'[cc0] effets : {len(SFX)} fichiers, {total / 1e6:.2f} Mo')


if __name__ == '__main__':
    args = set(sys.argv[1:])
    do_music = '--music' in args or not args
    do_sfx = '--sfx' in args or not args
    TMP.mkdir(parents=True, exist_ok=True)
    if do_music:
        build_music()
    if do_sfx:
        build_sfx()
    print('[cc0] terminé — lancez : node tools/audio-manifest.mjs')
