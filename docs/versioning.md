# Versioning

## Product version

[Semantic Versioning](https://semver.org): `MAJOR.MINOR.PATCH`. The version lives in the root `package.json`, mirrored by `apps/mobile/package.json` and `apps/mobile/app.json` (`expo.version`). Change it only with `npm run bump`. Only the owner bumps the version, on `develop`, just before merging `develop` into `main` (see [git-workflow.md](git-workflow.md)).

- **0.y.z** until the first public store release. During 0.x, MINOR may include breaking changes.
- **1.0.0** is the first release in the Play Store.
- After 1.0: MAJOR for an incompatible change between app and backend, MINOR for features, PATCH for fixes.
- Pre-releases: `0.3.0-rc.1` tags for release candidates.

```bash
npm run bump -- patch        # 0.1.0 -> 0.1.1
npm run bump -- minor        # 0.1.0 -> 0.2.0
npm run bump -- 1.0.0        # exact
npm run bump -- minor --dry  # show what would change
```

The script updates the three files and turns `## [Unreleased]` in `CHANGELOG.md` into a dated version heading. It does not commit or tag; see [git-workflow.md](git-workflow.md).

## Store build numbers

Android `versionCode` and iOS `buildNumber` are not the product version. They come from EAS remote auto-increment (`appVersionSource: remote`, to be added with `eas.json` when builds start). Never edit them by hand.

## Changelog

[Keep a Changelog](https://keepachangelog.com) format in `CHANGELOG.md`. Every pull request that changes behavior adds a line under `[Unreleased]` in `Added`, `Changed`, `Fixed`, `Removed` or `Security`.

## Backend (Firebase)

- Firestore rules and Cloud Functions deploy from `main` only.
- Phones in the field run older app versions for weeks. Keep the server backward compatible with the previous two releases: add a new function or column instead of changing a signature or meaning; remove old ones only after a minimum app version has moved past them.
- A minimum supported app version will live in a server config document so old apps can be asked to update (planned).
- Business templates have an integer `version`. Publishing an edit creates a new version; shops stay pinned to theirs until they sync.

## API

The Express API is versioned in the path (`/v1`). Additive changes stay in `v1`; a breaking change creates `v2` and keeps `v1` until the minimum app version has moved on. Not built yet.

## Design

`design/prototype.html` is the visual source of truth and changes with the app version it describes. Note design changes in the changelog under `Changed`.
