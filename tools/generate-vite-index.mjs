import fs from 'node:fs';

let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/\s*<link rel="stylesheet" href="src\/assets\/css\/style\.css">\n/, '\n');
html = html.replace(/\s*<link rel="stylesheet" href="src\/assets\/styles\/mobile-accessibility\.css">\n/, '\n');
html = html.replace(/\s*<link rel="stylesheet" href="src\/assets\/styles\/extracted-index\.css">\n/, '\n');
html = html.replace(/\s*<link rel="stylesheet" href="src\/assets\/styles\/extracted-templates\.css">\n/, '\n');
html = html.replace(/\s*<link rel="stylesheet" href="src\/assets\/styles\/extracted-bridges\.css">\n/, '\n');
html = html.replace(/\s*<link rel="stylesheet" href="src\/assets\/styles\/cleaned-components\.css">\n/, '\n');
html = html.replace(/\s*<script src="src\/file-preflight\.js"><\/script>\s*<script src="src\/legacy-loader\.js"><\/script>\s*<script src="src\/file-postboot\.js"><\/script>/, '\n  <script type="module" src="/src/main.js"></script>');
fs.writeFileSync('index.vite.html', html, 'utf8');
console.log('Generated index.vite.html for Vite build.');
