import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function rebuildChunkedAsset(sourceDir, output, minBytes) {
  if (!fs.existsSync(sourceDir)) throw new Error(`Missing asset chunks: ${sourceDir}`);
  const files = fs.readdirSync(sourceDir).filter((name) => name.endsWith('.txt')).sort();
  if (!files.length) throw new Error(`No asset chunks found: ${sourceDir}`);
  const raw = files.map((name) => fs.readFileSync(path.join(sourceDir, name), 'utf8').replace(/\s+/g, '')).join('');
  const bytes = Buffer.from(raw, 'base64');
  if (bytes.length < minBytes) throw new Error(`Decoded asset is unexpectedly small (${bytes.length} bytes): ${sourceDir}`);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, bytes);
  console.log(`Rebuilt ${path.relative(root, output)} from ${files.length} chunks (${bytes.length} bytes)`);
}

rebuildChunkedAsset(
  path.join(root, 'asset-source', 'victorian', 'board'),
  path.join(root, 'public', 'themes', 'victorian', 'board-bg.jpg'),
  45000,
);
