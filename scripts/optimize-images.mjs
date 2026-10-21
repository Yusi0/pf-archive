// Converts PNGs in public/uploads and public/image*.png to WebP (max 1440px wide, quality 85)
// and rewrites the references in content/*.md. Original PNGs are kept: delete them yourself
// (`--delete-originals`) once the posts have been checked.
//
//   node scripts/optimize-images.mjs [--quality=85] [--width=1440] [--delete-originals]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split('=')[1]) : fallback;
};
const QUALITY = arg('quality', 85);
const MAX_WIDTH = arg('width', 1440);
const DELETE = process.argv.includes('--delete-originals');

const publicDir = path.join(root, 'public');
const uploadsDir = path.join(publicDir, 'uploads');
const contentDir = path.join(root, 'content');

const targets = [
  ...(fs.existsSync(uploadsDir)
    ? fs.readdirSync(uploadsDir).filter((f) => /\.png$/i.test(f)).map((f) => path.join(uploadsDir, f))
    : []),
  ...fs.readdirSync(publicDir).filter((f) => /^image.*\.png$/i.test(f)).map((f) => path.join(publicDir, f)),
];

const converted = []; // { png, webp, name }
let before = 0;
let after = 0;

for (const png of targets) {
  const webp = png.replace(/\.png$/i, '.webp');
  const input = fs.readFileSync(png);
  const out = await sharp(input)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer();
  fs.writeFileSync(webp, out);
  before += input.length;
  after += out.length;
  converted.push({ png, webp, name: path.basename(png, path.extname(png)) });
}

// Update references (paths like /uploads/NAME.png, [[image31.png]], and alt text) -> .webp
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let refsUpdated = 0;
for (const file of fs.readdirSync(contentDir).filter((f) => f.endsWith('.md'))) {
  const p = path.join(contentDir, file);
  const original = fs.readFileSync(p, 'utf8');
  let text = original;
  for (const { name } of converted) {
    text = text.replace(new RegExp(`(?<![\\w.-])(${escapeRegExp(name)})\\.png\\b`, 'g'), (_, head) => {
      refsUpdated++;
      return `${head}.webp`;
    });
  }
  if (text !== original) fs.writeFileSync(p, text);
}

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
console.log(`Converted ${converted.length} images: ${kb(before)} -> ${kb(after)} (${((1 - after / before) * 100).toFixed(1)}% smaller)`);
console.log(`Updated ${refsUpdated} references in content/*.md`);

if (DELETE) {
  for (const { png } of converted) fs.unlinkSync(png);
  console.log(`Deleted ${converted.length} original PNGs`);
} else {
  console.log('Originals kept. Re-run with --delete-originals after checking the posts.');
}
