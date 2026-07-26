import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from '../src/core/html.js';

test('escapeHtml protects interpolated text', () => {
  assert.equal(
    escapeHtml(`<script>alert('x')</script>`),
    '&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;'
  );
});

test('escapeHtml preserves safe text', () => {
  assert.equal(escapeHtml('Pikachu & Raichu'), 'Pikachu &amp; Raichu');
});
