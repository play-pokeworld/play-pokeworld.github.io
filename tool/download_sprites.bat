@echo off
REM ==============================================================
REM   PokeWorld - re-download all sprites (Pokemon + Items)
REM   Source: PokeAPI (https://github.com/PokeAPI/sprites)
REM   Fallback source for items: pokeclicker (see notes below)
REM   Requires: Windows 10 1803+ (ships curl.exe). No Python needed.
REM
REM   Placement: put this file in <project>/tool/download_sprites.bat
REM   Run: double-click the .bat OR from a cmd prompt in this folder.
REM ==============================================================
setlocal enabledelayedexpansion
pushd "%~dp0.."
set "ROOT=%CD%"
set "POKEDIR=%ROOT%\src\assets\images\pokemon"
set "ITEMDIR=%ROOT%\src\assets\images\items"
set "PA=https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites"
set "PC=https://raw.githubusercontent.com/pokeclicker/pokeclicker/develop/src/assets/images/items"

if not exist "%POKEDIR%\front"       mkdir "%POKEDIR%\front"
if not exist "%POKEDIR%\back"        mkdir "%POKEDIR%\back"
if not exist "%POKEDIR%\frontShiny"  mkdir "%POKEDIR%\frontShiny"
if not exist "%POKEDIR%\backShiny"   mkdir "%POKEDIR%\backShiny"
if not exist "%ITEMDIR%"             mkdir "%ITEMDIR%"

where curl >nul 2>&1
if errorlevel 1 (
  echo [ERROR] curl.exe not found. Requires Windows 10 1803+ or install curl manually.
  pause
  exit /b 1
)

echo.
echo ============================================================
echo Step 1/2 : Downloading 251 Pokemon (front/back/shiny x2)
echo ============================================================

call :getpoke 1 bulbasaur
call :getpoke 2 ivysaur
call :getpoke 3 venusaur
call :getpoke 4 charmander
call :getpoke 5 charmeleon
call :getpoke 6 charizard
call :getpoke 7 squirtle
call :getpoke 8 wartortle
call :getpoke 9 blastoise
call :getpoke 10 caterpie
call :getpoke 11 metapod
call :getpoke 12 butterfree
call :getpoke 13 weedle
call :getpoke 14 kakuna
call :getpoke 15 beedrill
call :getpoke 16 pidgey
call :getpoke 17 pidgeotto
call :getpoke 18 pidgeot
call :getpoke 19 rattata
call :getpoke 20 raticate
call :getpoke 21 spearow
call :getpoke 22 fearow
call :getpoke 23 ekans
call :getpoke 24 arbok
call :getpoke 25 pikachu
call :getpoke 26 raichu
call :getpoke 27 sandshrew
call :getpoke 28 sandslash
call :getpoke 29 nidoran-f
call :getpoke 30 nidorina
call :getpoke 31 nidoqueen
call :getpoke 32 nidoran-m
call :getpoke 33 nidorino
call :getpoke 34 nidoking
call :getpoke 35 clefairy
call :getpoke 36 clefable
call :getpoke 37 vulpix
call :getpoke 38 ninetales
call :getpoke 39 jigglypuff
call :getpoke 40 wigglytuff
call :getpoke 41 zubat
call :getpoke 42 golbat
call :getpoke 43 oddish
call :getpoke 44 gloom
call :getpoke 45 vileplume
call :getpoke 46 paras
call :getpoke 47 parasect
call :getpoke 48 venonat
call :getpoke 49 venomoth
call :getpoke 50 diglett
call :getpoke 51 dugtrio
call :getpoke 52 meowth
call :getpoke 53 persian
call :getpoke 54 psyduck
call :getpoke 55 golduck
call :getpoke 56 mankey
call :getpoke 57 primeape
call :getpoke 58 growlithe
call :getpoke 59 arcanine
call :getpoke 60 poliwag
call :getpoke 61 poliwhirl
call :getpoke 62 poliwrath
call :getpoke 63 abra
call :getpoke 64 kadabra
call :getpoke 65 alakazam
call :getpoke 66 machop
call :getpoke 67 machoke
call :getpoke 68 machamp
call :getpoke 69 bellsprout
call :getpoke 70 weepinbell
call :getpoke 71 victreebel
call :getpoke 72 tentacool
call :getpoke 73 tentacruel
call :getpoke 74 geodude
call :getpoke 75 graveler
call :getpoke 76 golem
call :getpoke 77 ponyta
call :getpoke 78 rapidash
call :getpoke 79 slowpoke
call :getpoke 80 slowbro
call :getpoke 81 magnemite
call :getpoke 82 magneton
call :getpoke 83 farfetchd
call :getpoke 84 doduo
call :getpoke 85 dodrio
call :getpoke 86 seel
call :getpoke 87 dewgong
call :getpoke 88 grimer
call :getpoke 89 muk
call :getpoke 90 shellder
call :getpoke 91 cloyster
call :getpoke 92 gastly
call :getpoke 93 haunter
call :getpoke 94 gengar
call :getpoke 95 onix
call :getpoke 96 drowzee
call :getpoke 97 hypno
call :getpoke 98 krabby
call :getpoke 99 kingler
call :getpoke 100 voltorb
call :getpoke 101 electrode
call :getpoke 102 exeggcute
call :getpoke 103 exeggutor
call :getpoke 104 cubone
call :getpoke 105 marowak
call :getpoke 106 hitmonlee
call :getpoke 107 hitmonchan
call :getpoke 108 lickitung
call :getpoke 109 koffing
call :getpoke 110 weezing
call :getpoke 111 rhyhorn
call :getpoke 112 rhydon
call :getpoke 113 chansey
call :getpoke 114 tangela
call :getpoke 115 kangaskhan
call :getpoke 116 horsea
call :getpoke 117 seadra
call :getpoke 118 goldeen
call :getpoke 119 seaking
call :getpoke 120 staryu
call :getpoke 121 starmie
call :getpoke 122 mr-mime
call :getpoke 123 scyther
call :getpoke 124 jynx
call :getpoke 125 electabuzz
call :getpoke 126 magmar
call :getpoke 127 pinsir
call :getpoke 128 tauros
call :getpoke 129 magikarp
call :getpoke 130 gyarados
call :getpoke 131 lapras
call :getpoke 132 ditto
call :getpoke 133 eevee
call :getpoke 134 vaporeon
call :getpoke 135 jolteon
call :getpoke 136 flareon
call :getpoke 137 porygon
call :getpoke 138 omanyte
call :getpoke 139 omastar
call :getpoke 140 kabuto
call :getpoke 141 kabutops
call :getpoke 142 aerodactyl
call :getpoke 143 snorlax
call :getpoke 144 articuno
call :getpoke 145 zapdos
call :getpoke 146 moltres
call :getpoke 147 dratini
call :getpoke 148 dragonair
call :getpoke 149 dragonite
call :getpoke 150 mewtwo
call :getpoke 151 mew
call :getpoke 152 chikorita
call :getpoke 153 bayleef
call :getpoke 154 meganium
call :getpoke 155 cyndaquil
call :getpoke 156 quilava
call :getpoke 157 typhlosion
call :getpoke 158 totodile
call :getpoke 159 croconaw
call :getpoke 160 feraligatr
call :getpoke 161 sentret
call :getpoke 162 furret
call :getpoke 163 hoothoot
call :getpoke 164 noctowl
call :getpoke 165 ledyba
call :getpoke 166 ledian
call :getpoke 167 spinarak
call :getpoke 168 ariados
call :getpoke 169 crobat
call :getpoke 170 chinchou
call :getpoke 171 lanturn
call :getpoke 172 pichu
call :getpoke 173 cleffa
call :getpoke 174 igglybuff
call :getpoke 175 togepi
call :getpoke 176 togetic
call :getpoke 177 natu
call :getpoke 178 xatu
call :getpoke 179 mareep
call :getpoke 180 flaaffy
call :getpoke 181 ampharos
call :getpoke 182 bellossom
call :getpoke 183 marill
call :getpoke 184 azumarill
call :getpoke 185 sudowoodo
call :getpoke 186 politoed
call :getpoke 187 hoppip
call :getpoke 188 skiploom
call :getpoke 189 jumpluff
call :getpoke 190 aipom
call :getpoke 191 sunkern
call :getpoke 192 sunflora
call :getpoke 193 yanma
call :getpoke 194 wooper
call :getpoke 195 quagsire
call :getpoke 196 espeon
call :getpoke 197 umbreon
call :getpoke 198 murkrow
call :getpoke 199 slowking
call :getpoke 200 misdreavus
call :getpoke 201 unown
call :getpoke 202 wobbuffet
call :getpoke 203 girafarig
call :getpoke 204 pineco
call :getpoke 205 forretress
call :getpoke 206 dunsparce
call :getpoke 207 gligar
call :getpoke 208 steelix
call :getpoke 209 snubbull
call :getpoke 210 granbull
call :getpoke 211 qwilfish
call :getpoke 212 scizor
call :getpoke 213 shuckle
call :getpoke 214 heracross
call :getpoke 215 sneasel
call :getpoke 216 teddiursa
call :getpoke 217 ursaring
call :getpoke 218 slugma
call :getpoke 219 magcargo
call :getpoke 220 swinub
call :getpoke 221 piloswine
call :getpoke 222 corsola
call :getpoke 223 remoraid
call :getpoke 224 octillery
call :getpoke 225 delibird
call :getpoke 226 mantine
call :getpoke 227 skarmory
call :getpoke 228 houndour
call :getpoke 229 houndoom
call :getpoke 230 kingdra
call :getpoke 231 phanpy
call :getpoke 232 donphan
call :getpoke 233 porygon2
call :getpoke 234 stantler
call :getpoke 235 smeargle
call :getpoke 236 tyrogue
call :getpoke 237 hitmontop
call :getpoke 238 smoochum
call :getpoke 239 elekid
call :getpoke 240 magby
call :getpoke 241 miltank
call :getpoke 242 blissey
call :getpoke 243 raikou
call :getpoke 244 entei
call :getpoke 245 suicune
call :getpoke 246 larvitar
call :getpoke 247 pupitar
call :getpoke 248 tyranitar
call :getpoke 249 lugia
call :getpoke 250 ho-oh
call :getpoke 251 celebi

echo.
echo ============================================================
echo Step 2/2 : Downloading items
echo ============================================================

call :getitem greatball great-ball
call :getitem ultraball ultra-ball
call :getitem pokeball poke-ball
call :getitem potion potion
call :getitem superpotion super-potion
call :getitem fullrestore full-restore
call :getitem revive revive
call :getitem antidote antidote
call :getitem paralyzeheal paralyze-heal
call :getitem burnheal burn-heal
call :getitem iceheal ice-heal
call :getitem awakening awakening
call :getitem repel repel
call :getitem superrepel super-repel
call :getitem nugget nugget
call :getitem rarecandy rare-candy
call :getitem rarcandy rare-candy
call :getitem firestone fire-stone
call :getitem waterstone water-stone
call :getitem thunderstone thunder-stone
call :getitem leafstone leaf-stone
call :getitem moonstone moon-stone
call :getitem sunstone sun-stone
call :getitem berry oran-berry
call :getitem berry_oran oran-berry
call :getitem berry_sitrus sitrus-berry
call :getitem berry_ceriz cheri-berry
call :getitem berry_prine pecha-berry
call :getitem leftovers leftovers
call :getitem choice_band choice-band
call :getitem choice_specs choice-specs
call :getitem choice_scarf choice-scarf
call :getitem life_orb life-orb
call :getitem muscle_band muscle-band
call :getitem focus_lens wise-glasses
call :getitem power_gem power-herb
call :getitem metal_coat metal-coat
call :getitem soft_sand soft-sand
call :getitem chroma_charm shiny-charm
call :getitem kings_rock kings-rock
call :getitem dragon_scale dragon-scale
call :getitem up_grade up-grade
call :getitem deep_sea_scale deepseascale
call :getitem deep_sea_tooth deepseatooth
call :getitem black_belt black-belt
call :getitem black_glasses black-glasses
call :getitem charcoal charcoal
call :getitem dragon_fang dragon-fang
call :getitem miracle_seed miracle-seed
call :getitem mystic_water mystic-water
call :getitem never_melt_ice never-melt-ice
call :getitem hard_stone hard-stone
call :getitem magnet magnet
call :getitem silk_scarf silk-scarf
call :getitem poison_barb poison-barb
call :getitem sharp_beak sharp-beak
call :getitem spell_tag spell-tag
call :getitem thick_club thick-club
call :getitem twisted_spoon twisted-spoon
call :getitem silver_wing silver-wing
call :getitem rainbow_wing rainbow-wing
call :getitem assault_vest assault-vest
call :getitem eviolite eviolite
call :getitem stardust stardust
call :getitem pearl pearl
call :getitem swift_charm shell-bell
call :getitem fossil helix-fossil
call :getitem helix_fossil helix-fossil
call :getitem dome_fossil dome-fossil
call :getitem old_amber old-amber
call :getitem root_fossil root-fossil
call :getitem claw_fossil claw-fossil

echo.
echo ============================================================
echo Done. Sprites written under:
echo   %POKEDIR%
echo   %ITEMDIR%
echo ============================================================
popd
pause
exit /b 0

:getpoke
set "N=%~1"
set "NAME=%~2"
echo   [poke] #%N% %NAME%
curl -sSL --fail -o "%POKEDIR%\front\%NAME%.png"       "%PA%/pokemon/%N%.png"        || echo     ! failed front %N%
curl -sSL --fail -o "%POKEDIR%\back\%NAME%.png"        "%PA%/pokemon/back/%N%.png"   || echo     ! failed back %N%
curl -sSL --fail -o "%POKEDIR%\frontShiny\%NAME%.png"  "%PA%/pokemon/shiny/%N%.png"  || echo     ! failed frontShiny %N%
curl -sSL --fail -o "%POKEDIR%\backShiny\%NAME%.png"   "%PA%/pokemon/back/shiny/%N%.png" || echo     ! failed backShiny %N%
exit /b 0

:getitem
set "KEY=%~1"
set "PANAME=%~2"
echo   [item] %KEY% ^<- %PANAME%
curl -sSL --fail -o "%ITEMDIR%\%KEY%.png" "%PA%/items/%PANAME%.png"
if errorlevel 1 (
  REM PokeAPI miss - try pokeclicker as fallback (name in PascalCase, may fail; edit manually if needed)
  curl -sSL --fail -o "%ITEMDIR%\%KEY%.png" "%PC%/%KEY%.png" 2>nul || echo     ! failed item %KEY% (edit tool/download_sprites.bat to fix URL)
)
exit /b 0
