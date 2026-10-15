// V7 · P0a · LNT-01 — `no-undef` is an ERROR on the WHOLE `src/` tree.
//
// Before: half of src/ (ui/game, application/combat, application/world…) ran
// with `no-undef: off` because the classic modules resolve game functions
// through the shared window surface. That blind spot let
// `startLegendaryEncounter` ship with a reference to a variable that exists
// nowhere (BUG-01, every legendary encounter crashed).
//
// Now: `tools/gen-src-globals.mjs` extracts every symbol that REALLY exists
// on the shared surface (top-level declarations + window./globalThis.
// assignments) into `tools/src-globals.json`; that list is declared as
// globals here. A bare identifier that is in no file at all is reported.
// Regenerate after adding a top-level function:  node tools/gen-src-globals.mjs
import fs from 'node:fs';

const SRC_GLOBALS = JSON.parse(fs.readFileSync(new URL('./tools/src-globals.json', import.meta.url), 'utf8'));

const BROWSER_GLOBALS = [
  'window', 'document', 'globalThis', 'console', 'navigator', 'MutationObserver', 'fetch', 'URL',
  'process', 'Buffer', 'HTMLElement', 'HTMLButtonElement', 'HTMLSpanElement', 'HTMLImageElement',
  'HTMLInputElement', 'HTMLDivElement', 'HTMLSelectElement', 'HTMLTextAreaElement', 'HTMLAnchorElement',
  'HTMLCanvasElement', 'HTMLTemplateElement', 'HTMLStyleElement', 'HTMLLinkElement', 'HTMLScriptElement',
  'HTMLTableElement', 'HTMLUListElement', 'HTMLLIElement', 'HTMLLabelElement', 'HTMLParagraphElement',
  'HTMLHeadingElement', 'HTMLTableRowElement', 'HTMLTableCellElement', 'SVGElement', 'CanvasRenderingContext2D',
  'ImageData', 'OffscreenCanvas', 'createImageBitmap', 'Path2D', 'DOMRect', 'DOMMatrix',
  'MouseEvent', 'KeyboardEvent', 'PointerEvent', 'TouchEvent', 'Event', 'CustomEvent', 'DragEvent',
  'DataTransfer', 'ClipboardEvent', 'FocusEvent', 'InputEvent', 'WheelEvent', 'AnimationEvent',
  'TransitionEvent', 'ErrorEvent', 'PromiseRejectionEvent', 'EventTarget',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame',
  'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback', 'queueMicrotask', 'structuredClone',
  'getComputedStyle', 'performance', 'PerformanceObserver', 'Audio', 'AudioContext', 'webkitAudioContext',
  'Image', 'localStorage', 'sessionStorage', 'alert', 'confirm', 'prompt', 'location', 'history', 'screen',
  'Node', 'NodeList', 'Element', 'Text', 'Comment', 'DocumentFragment', 'ShadowRoot', 'Range', 'Selection',
  'getSelection', 'DOMParser', 'XMLSerializer', 'Blob', 'FileReader', 'URLSearchParams', 'TextEncoder',
  'TextDecoder', 'AbortController', 'IntersectionObserver', 'ResizeObserver', 'matchMedia', 'MediaQueryList',
  'crypto', 'WeakRef', 'FinalizationRegistry', 'Intl', 'atob', 'btoa', 'FormData', 'Response', 'Request',
  'Headers', 'Worker', 'WebSocket', 'Notification', 'devicePixelRatio', 'innerWidth', 'innerHeight',
  'outerWidth', 'outerHeight', 'scrollY', 'scrollX', 'pageXOffset', 'pageYOffset', 'scrollTo', 'scrollBy',
  'visualViewport', 'open', 'close', 'focus', 'blur', 'self', 'origin', 'isSecureContext', 'customElements',
  'CSS', 'CSSStyleSheet', 'StyleSheet', 'reportError', 'speechSynthesis', 'SpeechSynthesisUtterance',
  'module', 'require', '__dirname', '__filename', 'exports', 'global', 'define',
];

const gameGlobals = Object.fromEntries(SRC_GLOBALS.map((n) => [n, 'writable']));
const browserGlobals = Object.fromEntries(BROWSER_GLOBALS.map((n) => [n, 'readonly']));

export default [
  {
    files: [
      'src/**/*.js',
      'tools/**/*.js',
      'tools/**/*.mjs',
      '*.js',
    ],
    ignores: [
      'src/legacy-es/**',
      'src/legacy/**',
      'dist/**',
      'node_modules/**',
      'src/ui/input/inline-handler-sanitizer.js',
      'src/localization/**',
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...browserGlobals,
        ...gameGlobals,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    rules: {
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_|^o$',
          varsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-undef': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-var': 'warn',
      'prefer-const': 'warn',
    },
  },
];
