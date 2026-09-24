// Generates responsive image variants with sharp:
//   name-640.webp ... name-2400.webp   widths, never upscaled past the source
//   hero-4x5-640.webp, hero-4x5-1024.webp   centre crops for mobile heroes
//   og/<page>.jpg   1200x630 social cards for every page's og:image
// and writes assets/images/manifest.json, which build-pages.js reads to add
// srcset/width/height. Originals are never modified. Skips work that is
// already up to date.
//   npm run build:images

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const site = require('./lib/site');

const IMAGES = path.join(site.ROOT, 'assets/images');
const OG_DIR = path.join(IMAGES, 'og');
// 160 is an addition to the spec for the 64px mega-menu thumbnails.
const WIDTHS = [160, 640, 1024, 1600, 2400];
const CROP_WIDTHS = [640, 1024];
const VARIANT_RE = /-(\d+|4x5-\d+)\.webp$/;
const SKIP_RE = /^tot-wa-|^manifest\.json$/;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const full = path.join(dir, d.name);
    if (d.isDirectory()) return d.name === 'og' ? [] : walk(full);
    if (!/\.(webp|jpe?g|png)$/i.test(d.name) || VARIANT_RE.test(d.name) || SKIP_RE.test(d.name)) return [];
    return [full];
  });
}

const fresh = (out, src) => fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs;
const rel = (file) => path.relative(IMAGES, file).replace(/\\/g, '/');
const variant = (file, suffix) => file.replace(/\.[a-z]+$/i, `-${suffix}.webp`);

async function main() {
  const manifest = {};
  let written = 0;

  for (const file of walk(IMAGES)) {
    const meta = await sharp(file).metadata();
    const w = meta.width;
    const h = meta.height;
    const widths = WIDTHS.filter((target) => target < w);
    for (const target of widths) {
      const out = variant(file, target);
      if (fresh(out, file)) continue;
      await sharp(file).resize({ width: target }).webp({ quality: 78 }).toFile(out);
      written += 1;
    }
    const entry = { w, h, widths };

    // Page heroes get a 4:5 centre crop for mobile art direction.
    if (path.basename(file).startsWith('hero.')) {
      const cropH = Math.min(h, Math.round((w * 5) / 4));
      const cropW = Math.round((cropH * 4) / 5);
      const box = { left: Math.round((w - cropW) / 2), top: Math.round((h - cropH) / 2), width: cropW, height: cropH };
      // Also keep the crop at its full width when it falls between steps,
      // so portrait tablets never upscale the 640 file.
      const cropWidths = CROP_WIDTHS.filter((target) => target <= cropW);
      if (!cropWidths.includes(cropW) && cropW < CROP_WIDTHS[CROP_WIDTHS.length - 1]) cropWidths.push(cropW);
      for (const target of cropWidths) {
        const out = variant(file, `4x5-${target}`);
        if (fresh(out, file)) continue;
        await sharp(file).extract(box).resize({ width: target }).webp({ quality: 78 }).toFile(out);
        written += 1;
      }
      entry.crops = { '4x5': cropWidths };
    }
    manifest[rel(file)] = entry;
  }

  // Social cards for every page, including the generated tour pages.
  fs.mkdirSync(OG_DIR, { recursive: true });
  const ogSources = new Set(site.PAGES.map((p) => p.ogImage));
  site.tourPackages().forEach((pkg) => { if (pkg.image) ogSources.add(pkg.image.src); });
  for (const src of ogSources) {
    const input = path.join(site.ROOT, src);
    const out = path.join(OG_DIR, `${site.ogName(src)}.jpg`);
    if (fresh(out, input)) continue;
    await sharp(input).resize(1200, 630, { fit: 'cover', position: 'attention' }).jpeg({ quality: 80, mozjpeg: true }).toFile(out);
    written += 1;
  }

  fs.writeFileSync(path.join(IMAGES, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`build-images: ${Object.keys(manifest).length} sources, ${written} files written.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
