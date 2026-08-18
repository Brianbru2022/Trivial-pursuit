import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function decodeChunks(sourceDir) {
  const files = fs.readdirSync(sourceDir).filter((name) => name.endsWith('.txt')).sort();
  const raw = files.map((name) => fs.readFileSync(path.join(sourceDir, name), 'utf8').replace(/\s+/g, '')).join('');
  const bytes = Buffer.from(raw, 'base64');
  console.log(`Decoded ${path.relative(root, sourceDir)} from ${files.length} chunks (${bytes.length} bytes)`);
  return bytes;
}

const source = path.join(root, 'asset-source', 'victorian', 'board');
const outputDir = path.join(root, 'public', 'themes', 'victorian');
fs.mkdirSync(outputDir, { recursive: true });
const bytes = decodeChunks(source);
fs.writeFileSync(path.join(outputDir, 'board-art.webp'), bytes);
// Legacy path retained until the board component is switched to the explicit WebP URL.
fs.writeFileSync(path.join(outputDir, 'board-bg.jpg'), bytes);
console.log(`Victorian board assets written (${bytes.length} bytes)`);
