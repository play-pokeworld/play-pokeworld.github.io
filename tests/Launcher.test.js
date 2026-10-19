/**
 * @file Launcher.test.js
 * @brief Windows launcher and local server regressions (the v0 start.bat did not run).
 */

import { TrainerDB } from '../src/data/trainers/TrainerDB.js';
import { LeagueDB } from '../src/data/trainers/LeagueDB.js';
import fs from 'fs';
import path from 'path';
import { describe, assert } from './TestRunner.js';
import { listJsFiles, findMatches } from './SourceScanner.js';
import { AssetPaths } from '../src/config/AssetPaths.js';
import { BACKGROUND_SCENES } from '../src/config/LocationBackgrounds.js';
import { PokemonDB } from '../src/data/pokemon/PokemonDB.js';
import { STARTERS_BY_REGION } from '../src/data/pokemon/StarterData.js';

describe('Launcher and server', (test) => {
  const bat = fs.readFileSync('start.bat', 'utf8');

  test('start.bat moves to its own folder and runs node server.js', () => {
    assert.ok(bat.includes('cd /d "%~dp0"'));
    assert.ok(/^node server\.js\r?$/m.test(bat));
  });

  test('start.bat is pure ASCII with CRLF line endings', () => {
    assert.ok(/^[\x00-\x7F]*$/.test(bat), 'ASCII');
    const lines = bat.split('\n').filter((line) => line.length);
    assert.ok(lines.every((line) => line.endsWith('\r')), 'CRLF');
  });

  test('start.bat never reads %errorlevel% inside a ( ) block', () => {
    assert.ok(!/\([^)]*%errorlevel%/is.test(bat.replace(/^rem .*$/gim, '')));
  });

  test('launcher texts are external resources', () => {
    assert.ok(fs.existsSync('tools/launcher/node-missing.txt'));
  });

  test('server messages exist in every language with the same keys', async () => {
    const fr = (await import('../src/localization/fr/server.js')).server;
    const en = (await import('../src/localization/en/server.js')).server;
    assert.deepEqual(Object.keys(fr).sort(), Object.keys(en).sort());
  });
});

describe('Asset paths', (test) => {
  test('image paths are only built by AssetPaths', () => {
    const files = listJsFiles(path.resolve('src'), ['localization', 'data/raw']).filter((f) => f !== 'config/AssetPaths.js');
    assert.empty(findMatches(path.resolve('src'), files, /assets\/images\//), 'hardcoded image path');
  });

  test('AssetPaths follows the root assets/ layout', () => {
    assert.equal(AssetPaths.pokemonSprite('Bulbasaur'), 'assets/images/pokemon/bulbasaur.png');
    assert.ok(AssetPaths.trainerSprite('red').startsWith('assets/images/trainers/'));
    assert.equal(AssetPaths.pokemonSprite('Pikachu', '', true), 'assets/images/pokemon/shiny/pikachu.png');
  });

  test('every species has a sprite and every shiny sprite has a normal one', () => {
    const missing = PokemonDB.getInstance().getAll()
      .map((species) => species.getSpritePath())
      .filter((file) => !fs.existsSync(path.resolve(file)));
    assert.empty(missing, 'missing Pokémon sprites');
    const shinyDir = path.resolve('assets/images/pokemon/shiny');
    const orphans = fs.readdirSync(shinyDir).filter((file) => !fs.existsSync(path.resolve('assets/images/pokemon', file)));
    assert.empty(orphans, 'shiny sprites without a normal sprite');
  });

  test('referenced images exist (trainer, icon, starters, scenes, badges, trainer sprites)', () => {
    const files = [
      AssetPaths.defaultTrainerSprite(),
      AssetPaths.appIcon(),
      ...Object.values(STARTERS_BY_REGION).flat().map((starter) => AssetPaths.pokemonSprite(starter.species)),
      ...BACKGROUND_SCENES.map((scene) => `assets/images/bg/${scene}.png`),
      ...[...TrainerDB.getInstance().getAll(), ...LeagueDB.getInstance().getAll()]
        .filter((entry) => entry.badgeImage).map((entry) => AssetPaths.badge(entry.badgeImage)),
      ...TrainerDB.getInstance().getAll().filter((trainer) => trainer.sprite).map((trainer) => AssetPaths.trainerSprite(trainer.sprite))
    ];
    assert.empty(files.filter((file) => !fs.existsSync(path.resolve(decodeURIComponent(file)))), 'missing images');
  });
});
