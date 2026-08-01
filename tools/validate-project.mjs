import fs from 'node:fs';
import path from 'node:path';

const required = ['index.html', 'src/loader.js', 'src/data/sprites.js', 'src/assets/css/style.css'];
const missing = required.filter((file) => !fs.existsSync(path.resolve(file)));
if (missing.length) {
  console.error('Missing required files:', missing.join(', '));
  process.exit(1);
}
console.log('Project structure OK');

