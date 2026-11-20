# Dukaan

Multi-tenant mobile POS for local shops in Pakistan: sales, khata (credit ledger), stock, reports and Bluetooth receipts, in Urdu and English, sold as a subscription through Google Play and the App Store.

Status: foundation. See [docs/roadmap.md](docs/roadmap.md).

## Quick start

```bash
npm run setup                 # once per clone: enables git hooks
cd apps/mobile
npm install
npx expo start --web          # preview in a browser (Android/iOS need a dev build for native features)
npm run typecheck && npm test
```

Database tests (Windows, PostgreSQL 18 binaries, throwaway cluster):

```bash
```

Open `design/prototype.html` in a browser for the approved clickable design.

## Where things are

| Path | What |
|---|---|
| `apps/mobile` | Expo app |
| `firebase/` | Firestore Security Rules (deny all until features land) |
| `design/` | UI prototype |
| `docs/` | Architecture, database, billing, frontend, git workflow, versioning, decisions |

Read [RULES.md](RULES.md) before contributing, and [docs/git-workflow.md](docs/git-workflow.md) before your first branch. AI agents: [AGENTS.md](AGENTS.md) and [CLAUDE.md](CLAUDE.md).
