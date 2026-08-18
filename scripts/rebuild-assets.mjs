import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function decodeChunks(sourceDir) {
  const files = fs.readdirSync(sourceDir).filter((name) => name.endsWith('.txt')).sort();
  if (!files.length) throw new Error(`No asset chunks found in ${sourceDir}`);
  const raw = files.map((name) => fs.readFileSync(path.join(sourceDir, name), 'utf8').replace(/\s+/g, '')).join('');
  const bytes = Buffer.from(raw, 'base64');
  console.log(`Decoded ${path.relative(root, sourceDir)} from ${files.length} chunks (${bytes.length} bytes)`);
  return bytes;
}

const source = path.join(root, 'asset-source', 'victorian', 'board');
const outputDir = path.join(root, 'public', 'themes', 'victorian');
fs.mkdirSync(outputDir, { recursive: true });
const bytes = decodeChunks(source);

if (bytes.length < 40000) {
  throw new Error(`Victorian board art is unexpectedly small: ${bytes.length} bytes`);
}
const riff = bytes.subarray(0, 4).toString('ascii');
const webp = bytes.subarray(8, 12).toString('ascii');
if (riff !== 'RIFF' || webp !== 'WEBP') {
  throw new Error(`Victorian board art is not a valid WebP file (RIFF=${riff}, WEBP=${webp})`);
}

fs.writeFileSync(path.join(outputDir, 'board-art.webp'), bytes);
fs.writeFileSync(path.join(outputDir, 'board-bg.jpg'), bytes);
console.log(`Victorian board assets verified and written (${bytes.length} bytes)`);
