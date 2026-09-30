// Fails if any tracked file contains a GitHub token prefix. EasyOTA's plugin
// zip ships a PHP file with a hardcoded GitHub personal access token for its
// update checker; only the JS and CSS builds may be vendored. Runs first in
// `npm test`:
//   npm run test:secrets

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
// Built from parts so this file never matches itself.
const PREFIXES = [['github', 'pat', ''].join('_'), ['ghp', ''].join('_')];

const files = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

const hits = [];
for (const file of files) {
  const full = path.join(ROOT, file);
  // Tracked but deleted in the working tree: nothing on disk to scan.
  if (!fs.existsSync(full)) continue;
  const text = fs.readFileSync(full).toString('latin1');
  text.split('\n').forEach((line, i) => {
    if (PREFIXES.some((prefix) => line.includes(prefix))) hits.push(`${file}:${i + 1}`);
  });
}

if (hits.length) {
  console.error(`check-secrets: GitHub token prefix found in ${hits.length} place(s):`);
  hits.forEach((hit) => console.error(`  ${hit}`));
  process.exit(1);
}
console.log(`check-secrets: ${files.length} tracked files clean.`);
