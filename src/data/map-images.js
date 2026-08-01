const KANTO_MAP_IMG = (typeof PokeCore !== 'undefined' && PokeCore.spriteUrl) ? PokeCore.spriteUrl.map('kanto') : 'src/assets/images/maps/kanto.png';
const JOHTO_MAP_IMG = (typeof PokeCore !== 'undefined' && PokeCore.spriteUrl) ? PokeCore.spriteUrl.map('johto') : 'src/assets/images/maps/johto.png';
const HOENN_MAP_IMG = (typeof PokeCore !== 'undefined' && PokeCore.spriteUrl) ? PokeCore.spriteUrl.map('hoenn') : 'src/assets/images/maps/hoenn.png';

if (typeof KANTO_MAP_IMG !== 'undefined' && typeof window !== 'undefined') window.KANTO_MAP_IMG = KANTO_MAP_IMG;
if (typeof JOHTO_MAP_IMG !== 'undefined' && typeof window !== 'undefined') window.JOHTO_MAP_IMG = JOHTO_MAP_IMG;
if (typeof HOENN_MAP_IMG !== 'undefined' && typeof window !== 'undefined') window.HOENN_MAP_IMG = HOENN_MAP_IMG;


