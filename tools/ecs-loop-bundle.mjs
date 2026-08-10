#!/usr/bin/env node
/**
 * Bundles the real ECS-driven battle loop (src/application/battle-loop.js —
 * engine ECS core + gameplay systems + domain tick) into a single classic
 * script (IIFE) so the vm sandboxes used by the integration suites and by
 * tools/sim_battles.mjs execute the SAME production code the browser gets
 * through Vite. The result is cached for the process lifetime.
 *
 * Usage:
 *   import { ecsBattleLoopSource } from '../tools/ecs-loop-bundle.mjs';
 *   vm.runInContext(ecsBattleLoopSource(), sandbox, { filename: 'battle-loop [iife]' });
 */
import { buildSync } from 'esbuild';
import { fileURLToPath } from 'node:url';

let cachedSource = null;

export function ecsBattleLoopSource() {
  if (cachedSource) return cachedSource;
  const entry = fileURLToPath(new URL('../src/application/battle-loop.js', import.meta.url));
  cachedSource = bundleEntry(entry);
  return cachedSource;
}

let cachedGameplaySource = null;

/**
 * Bundles the FULL ECS gameplay layer (src/application/gameplay-bundle.js —
 * battle loop + world:encounter + breeding:hatch + economy:market with all
 * orchestrators and domain rules) into one classic IIFE. Vm sandboxes use
 * this so every K.O.-chain/spawn/hatch/purchase path they replay is the SAME
 * production code the browser executes through Vite (wave 33).
 */
export function ecsGameplayBundleSource() {
  if (cachedGameplaySource) return cachedGameplaySource;
  const entry = fileURLToPath(new URL('../src/application/gameplay-bundle.js', import.meta.url));
  cachedGameplaySource = bundleEntry(entry);
  return cachedGameplaySource;
}

function bundleEntry(entry) {
  const result = buildSync({
    entryPoints: [entry],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    write: false,
    logLevel: 'silent',
  });
  return result.outputFiles[0].text;
}
