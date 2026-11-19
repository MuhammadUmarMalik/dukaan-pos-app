import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nextVersion, stampChangelog } from './version.mjs';

test('nextVersion bumps and accepts exact versions', () => {
  assert.equal(nextVersion('0.1.0', 'patch'), '0.1.1');
  assert.equal(nextVersion('0.1.9', 'minor'), '0.2.0');
  assert.equal(nextVersion('0.9.9', 'major'), '1.0.0');
  assert.equal(nextVersion('0.1.0', '1.0.0'), '1.0.0');
  assert.equal(nextVersion('0.1.0', '0.3.0-rc.1'), '0.3.0-rc.1');
  assert.equal(nextVersion('0.1.0', 'huge'), null);
  assert.equal(nextVersion('0.1.0', undefined), null);
});

test('stampChangelog keeps an empty Unreleased and dates the release', () => {
  const out = stampChangelog('# Changelog\n\n## [Unreleased]\n\n### Added\n- x\n', '0.2.0', '2026-12-01');
  assert.match(out, /## \[Unreleased\]\n\n## \[0\.2\.0\] - 2026-12-01\n\n### Added/);
  assert.throws(() => stampChangelog('# nothing', '0.2.0', '2026-12-01'));
});
