// Responsive image rewriting, driven by assets/images/manifest.json (written
// by scripts/build-images.js). Any <img> with a `sizes` attribute and a
// src under assets/images/ gets a srcset and intrinsic width/height; any
// <source data-src data-crop="4x5"> gets the art-directed crop srcset.
// Without a manifest entry an image is left as-is, so pages still work
// before the image build has run.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MANIFEST_PATH = path.join(ROOT, 'assets/images/manifest.json');

let manifest = null;
function loadManifest() {
  if (manifest) return manifest;
  manifest = fs.existsSync(MANIFEST_PATH) ? JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) : {};
  return manifest;
}

// The 4:5 hero crop serves phones and any portrait screen (tablets held
// upright), where a 16:9 image would be upscaled to fill a tall hero.
const MOBILE_MEDIA = '(max-width: 767px), (orientation: portrait)';
const DESKTOP_MEDIA = '(min-width: 768px) and (orientation: landscape)';

const variantPath = (src, suffix) => src.replace(/\.[a-z]+$/i, `-${suffix}.webp`);
const keyFor = (src) => src.replace(/^assets\/images\//, '');

function srcsetFor(src) {
  const entry = loadManifest()[keyFor(src)];
  if (!entry) return null;
  const parts = entry.widths.map((w) => `${variantPath(src, w)} ${w}w`);
  if (!entry.widths.includes(entry.w)) parts.push(`${src} ${entry.w}w`);
  return { srcset: parts.join(', '), entry };
}

function cropSrcsetFor(src, crop) {
  const entry = loadManifest()[keyFor(src)];
  if (!entry || !entry.crops || !entry.crops[crop]) return null;
  const widths = entry.crops[crop];
  return {
    srcset: widths.map((w) => `${variantPath(src, `${crop}-${w}`)} ${w}w`).join(', '),
    width: widths[widths.length - 1],
    height: Math.round((widths[widths.length - 1] * 5) / 4),
  };
}

const setAttr = (tag, name, value) => {
  const re = new RegExp(`\\s${name}="[^"]*"`);
  return re.test(tag) ? tag.replace(re, ` ${name}="${value}"`) : tag.replace(/\s*\/?>$/, ` ${name}="${value}">`);
};
const hasAttr = (tag, name) => new RegExp(`\\s${name}="`).test(tag);

function processImages(html) {
  let out = html.replace(/<img\b[^>]*>/g, (tag) => {
    const src = (tag.match(/\ssrc="(assets\/images\/[^"]+)"/) || [])[1];
    if (!src || !hasAttr(tag, 'sizes')) return tag;
    const result = srcsetFor(src);
    if (!result) return tag;
    let next = setAttr(tag, 'srcset', result.srcset);
    if (!hasAttr(next, 'width') || !hasAttr(next, 'height')) {
      next = setAttr(next, 'width', String(result.entry.w));
      next = setAttr(next, 'height', String(result.entry.h));
    }
    return next;
  });
  out = out.replace(/<source\b[^>]*\sdata-src="([^"]+)"[^>]*>/g, (tag, src) => {
    const crop = (tag.match(/\sdata-crop="([^"]+)"/) || [])[1];
    const result = crop ? cropSrcsetFor(src, crop) : srcsetFor(src);
    if (!result) return tag;
    let next = setAttr(tag, 'srcset', result.srcset);
    if (result.width) {
      next = setAttr(next, 'width', String(result.width));
      next = setAttr(next, 'height', String(result.height));
    }
    return next;
  });
  return out;
}

function preloadLinks(src) {
  const desktop = srcsetFor(src);
  const mobile = cropSrcsetFor(src, '4x5');
  if (!desktop) return `<link rel="preload" as="image" href="${src}" fetchpriority="high">`;
  const links = [];
  if (mobile) {
    links.push(`<link rel="preload" as="image" imagesrcset="${mobile.srcset}" imagesizes="100vw" media="${MOBILE_MEDIA}" fetchpriority="high">`);
  }
  links.push(`<link rel="preload" as="image" imagesrcset="${desktop.srcset}" imagesizes="100vw"${mobile ? ` media="${DESKTOP_MEDIA}"` : ''} fetchpriority="high">`);
  return links.join('\n');
}

module.exports = { MOBILE_MEDIA, processImages, preloadLinks, srcsetFor, loadManifest };
