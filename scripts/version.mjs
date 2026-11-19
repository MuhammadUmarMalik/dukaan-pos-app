/** 'patch' | 'minor' | 'major' | '1.2.3' (or 1.2.3-rc.1) -> next version string, or null if the argument is not valid. */
export function nextVersion(current, arg) {
  if (/^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$/.test(arg ?? '')) return arg;
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(current);
  if (!m) return null;
  const [major, minor, patch] = m.slice(1).map(Number);
  if (arg === 'major') return `${major + 1}.0.0`;
  if (arg === 'minor') return `${major}.${minor + 1}.0`;
  if (arg === 'patch') return `${major}.${minor}.${patch + 1}`;
  return null;
}

/** Turns "## [Unreleased]" into an empty Unreleased plus a dated heading for the new version. */
export function stampChangelog(text, version, date) {
  if (!text.includes('## [Unreleased]')) throw new Error('CHANGELOG.md has no "## [Unreleased]" heading');
  return text.replace('## [Unreleased]', `## [Unreleased]\n\n## [${version}] - ${date}`);
}
