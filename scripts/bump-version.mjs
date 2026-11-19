// Usage: npm run bump -- patch|minor|major|x.y.z [--dry]
// Updates root package.json, apps/mobile/package.json, apps/mobile/app.json and CHANGELOG.md. Does not commit or tag.
import { readFileSync, writeFileSync } from 'node:fs';
import { nextVersion, stampChangelog } from './version.mjs';

const arg = process.argv[2];
const dry = process.argv.includes('--dry');
const json = (p) => JSON.parse(readFileSync(p, 'utf8'));
const save = (p, v) => writeFileSync(p, JSON.stringify(v, null, 2) + '\n');

const root = json('package.json');
const next = nextVersion(root.version, arg);
if (!next) {
  console.error('Usage: npm run bump -- patch|minor|major|x.y.z [--dry]');
  process.exit(1);
}
console.log(`${root.version} -> ${next}${dry ? ' (dry run)' : ''}`);
if (dry) process.exit(0);

root.version = next;
save('package.json', root);
const pkg = json('apps/mobile/package.json');
pkg.version = next;
save('apps/mobile/package.json', pkg);
const app = json('apps/mobile/app.json');
app.expo.version = next.replace(/-.*$/, ''); // store versions are plain x.y.z
save('apps/mobile/app.json', app);
writeFileSync('CHANGELOG.md', stampChangelog(readFileSync('CHANGELOG.md', 'utf8'), next, new Date().toISOString().slice(0, 10)));
console.log(`Next: git commit -am "chore(release): v${next}" && git tag -a v${next} -m "v${next}"`);
