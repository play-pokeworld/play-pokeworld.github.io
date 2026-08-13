#!/usr/bin/env node
/**
 * T2-D (wave 36): generic VM-harness bundler.
 *
 * Problem it removes: integration harnesses evaluate production files as RAW
 * TEXT through vm.runInContext(readFileSync(f)). That forbids any import/
 * export statement in those files — the hard lock blocking the ESM
 * conversion of the remaining classic modules (T2). This tool builds ONE
 * esbuild IIFE per harness file list that reproduces vm.runInContext
 * semantics byte-for-byte while REAL ESM files bundle natively:
 *
 *   - ESM files (contain top-level import/export) become genuine bundle
 *     entries (their wired imports resolve for real);
 *   - contiguous runs of CLASSIC files are concatenated into temp modules
 *     whose body is a sequence of indirect `eval` calls — an indirect eval
 *     executes a sloppy script in GLOBAL scope, exactly like vm.runInContext:
 *     top-level `function` declarations attach to the global object,
 *     `const/let` live in the shared global lexical environment across the
 *     run. Identical observable semantics (T1's globalThis idiom covers the
 *     const-cross-file case in both worlds).
 *
 * buildSync forbids plugins → the virtual entry + concat modules are written
 * as REAL temp files (mkdtemp, removed at process exit).
 *
 * Usage (test files):
 *   import { harnessBundleSource } from '../tools/harness-bundle.mjs';
 *   vm.runInContext(harnessBundleSource(SANDBOX_FILES), sandbox, { filename: '<family> [iife]' });
 */
import { buildSync } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const cache = new Map();

/** Exposed for the hybrid loops: classiques = vm directe (const inter-fichiers
 *  préservés), converts ESM = bundle. */
export function harnessIsEsm(text) {
  return isEsm(text);
}

/**
 * Wave 40 — mixed-order scheduler for concat-style harnesses.
 *
 * The legacy harnesses evaluate `A + '\n' + B + …` in ONE vm.runInContext:
 * files share ONE script scope, so top-level const/let cross files freely.
 * Once a data file becomes ESM (`export const …`), that concat is a
 * SyntaxError. Instead of rewriting every harness by hand, this helper cuts
 * the ORDERED file list into contiguous segments and returns the sources to
 * execute IN THE SAME ORDER:
 *
 *   - classic segment  → the plain text concatenation (one runInContext:
 *     const inter-fichiers preserved — byte-parity with the old evaluation);
 *   - ESM file          → an isolated harnessBundleSource([file]) IIFE.
 *
 * The harness keeps ITS OWN sandbox and just runs each segment:
 *   for (const seg of harnessRunMixed(FILES, R))
 *     vm.runInContext(seg.source, sandbox, { filename: seg.filename });
 *
 * @param {string[]} orderedFiles — labels used only inside segment filenames.
 * @param {(label: string, index: number) => string} readText — the harness's
 *   own reader (R), so url resolution stays identical to the old code.
 * @returns {{ filename: string, source: string }[]}
 */
export function harnessRunMixed(orderedFiles, readText) {
  const segments = [];
  let classicSrc = [];
  let classicFirst = '';
  const flush = () => {
    if (!classicSrc.length) return;
    segments.push({
      filename: classicFirst + (classicSrc.length > 1 ? ` +${classicSrc.length - 1} classic file(s)` : ''),
      source: classicSrc.join('\n'),
    });
    classicSrc = [];
  };
  orderedFiles.forEach((f, i) => {
    const text = readText(f, i);
    if (isEsm(text)) {
      flush();
      // Bundle by path when it is a real production-relative path (the
      // bundler re-reads from disk); otherwise fall back to in-memory eval —
      // harnesses always pass real paths, so keep the fallback loud.
      segments.push({ filename: f + ' [iife]', source: harnessBundleSource([f]) });
    } else {
      if (!classicSrc.length) classicFirst = f;
      classicSrc.push(text);
    }
  });
  flush();
  return segments;
}

function isEsm(text) {
  return /^\s*(import\s+(?![("'])[\s\S]*?from\s+["']|import\s+["']|export\s+(?:const|let|var|function|class|default|\{|async))/m.test(text);
}

function classicRunSource(files) {
  const lines = ['// classic concat run — vm.runInContext parity (indirect eval = global script semantics)'];
  for (const f of files) {
    const text = fs.readFileSync(path.join(ROOT, f), 'utf8');
    lines.push('(0, eval)(' + JSON.stringify(text + '\n//# sourceURL=' + f) + ');');
  }
  return lines.join('\n');
}

/**
 * @param {string[]} orderedFiles — production-relative paths in the EXACT
 *   evaluation order the harness used (R() lists / SANDBOX_FILES).
 * @returns {string} IIFE source to hand to vm.runInContext.
 */
export function harnessBundleSource(orderedFiles) {
  const key = orderedFiles.join('|');
  if (cache.has(key)) return cache.get(key);

  // Split into ordered runs: ESM files individually, classic files per
  // contiguous run (one temp module = one shared scope segment).
  const runs = [];
  let cur = null;
  for (const f of orderedFiles) {
    const text = fs.readFileSync(path.join(ROOT, f), 'utf8');
    if (isEsm(text)) { if (cur) { runs.push(cur); cur = null; } runs.push({ esm: true, file: f }); }
    else { if (!cur) { cur = { esm: false, files: [] }; runs.push(cur); } cur.files.push(f); }
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-harness-'));
  process.on('exit', () => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) {} });

  const entryLines = [];
  runs.forEach((r, i) => {
    if (r.esm) entryLines.push(`import ${JSON.stringify(path.join(ROOT, r.file))};`);
    else {
      const name = path.join(tmp, `classic-run-${i}.js`);
      fs.writeFileSync(name, classicRunSource(r.files));
      entryLines.push(`import ${JSON.stringify(name)};`);
    }
  });
  const entry = path.join(tmp, 'entry.js');
  fs.writeFileSync(entry, entryLines.join('\n'));

  const result = buildSync({
    entryPoints: [entry],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    write: false,
    logLevel: 'silent',
    minify: false,
  });
  const out = result.outputFiles[0].text;
  cache.set(key, out);
  return out;
}

