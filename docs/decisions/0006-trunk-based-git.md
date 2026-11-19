# 0006: Trunk-based git with squash-merged pull requests

Status: accepted

**Context.** Small team, one app, one database, frequent small changes. Git-flow's `develop` and release branches add ceremony without benefit here.

**Decision.** `main` is always releasable. Short-lived branches (`feat/`, `fix/`, `db/`, `docs/`, `chore/`), Conventional Commits, squash-merged pull requests with CI, releases as `vX.Y.Z` tags, SemVer. A `release/x.y` branch exists only to patch an old release.

**Consequences.** Linear history and an automatic changelog source. Features that are not ready ship behind code that is not reachable, not behind a long-lived branch. Details in `docs/git-workflow.md` and `docs/versioning.md`.
