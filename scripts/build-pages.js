// Re-renders the shared blocks (head, header, footer, scripts and the
// generated content blocks) in every root page. Run after editing
// scripts/lib/site.js, any data file, or the image set:
//   npm run build:pages

const fs = require('fs');
const path = require('path');
const site = require('./lib/site');
require('./lib/blocks');
const { processImages } = require('./lib/images');

let changed = 0;
for (const page of site.PAGES) {
  const file = path.join(site.ROOT, page.file);
  const before = fs.readFileSync(file, 'utf8');
  const after = processImages(site.applyBlocks(before, page));
  if (after !== before) {
    fs.writeFileSync(file, after);
    changed += 1;
  }
}
console.log(`build-pages: ${site.PAGES.length} pages checked, ${changed} updated.`);
