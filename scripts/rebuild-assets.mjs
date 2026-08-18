import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const jobs = [
  {
    source: path.join(root, 'asset-source', 'victorian', 'board-landscape.b64'),
    output: path.join(root, 'public', 'themes', 'victorian', 'board-generated.webp'),
    minBytes: 40000,
  },
];

for (const job of jobs) {
  if (!fs.existsSync(job.source)) {
    throw new Error(`Missing asset source: ${job.source}`);
  }
  const raw = fs.readFileSync(job.source, 'utf8').replace(/\s+/g, '');
  const bytes = Buffer.from(raw, 'base64');
  if (bytes.length < job.minBytes) {
    throw new Error(`Decoded asset is unexpectedly small (${bytes.length} bytes): ${job.source}`);
  }
  fs.mkdirSync(path.dirname(job.output), { recursive: true });
  fs.writeFileSync(job.output, bytes);
  console.log(`Rebuilt ${path.relative(root, job.output)} (${bytes.length} bytes)`);
}
