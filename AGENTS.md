# AGENTS.md

Dukaan is a multi-tenant mobile POS SaaS for local shops in Pakistan (grocery, bakery, milk, shoes, pharmacy and more). Shopkeepers get an Urdu/English app for sales, khata (credit ledger), stock, reports and Bluetooth receipt printing, sold as a subscription through Google Play and the App Store.

Read `RULES.md` before changing anything. Docs index: `docs/README.md`. Roadmap and status: `docs/roadmap.md`.

## Layout

| Path | What |
|---|---|
| `apps/mobile` | Expo (React Native, TypeScript) shopkeeper app. Routes in `src/app`, everything else outside it. See `apps/mobile/AGENTS.md` for Expo specifics. |
| `firebase` | Firestore Security Rules (deny all for now) and `firebase.json`. Cloud Functions come later. |
| `design/prototype.html` | Approved UI prototype. The design source of truth. |
| `docs` | Architecture, database, billing, frontend, workflow, ADRs. |
| `apps/api`, `apps/admin` | Not built yet (Express API, admin panel). |

## Stack

Expo SDK 58 with expo-router, React 19, TypeScript strict, Zustand, Firebase (Auth, Firestore, Cloud Functions; see ADR 0007), Express API (planned). Local database for offline sync is planned (expo-sqlite), not in yet.

## Commands

```bash
# Mobile (run in apps/mobile)
npm install
npm run typecheck          # tsc --noEmit
npm test                   # node --test src/lib/*.test.ts (pure money logic)
npx expo start --web       # quick preview in a browser, port 8081
npx expo install <package> # always use this to add packages

# Version bump (root)
npm run bump -- patch|minor|major|x.y.z
```

## Conventions

- Money: integer paisa. `rs(145000)` gives `Rs 1,450`.
- Strings: `const t = useT(); t('Home', 'ہوم')`. Urdu is right-to-left; use `Row`, `Text`, `Icon` from `src/ui`.
- State: Zustand stores in `src/state`. Lists will come from the local database later; stores hold session, UI and drafts.
- Styling: tokens from `src/theme`. Quiet Tech look: cool graphite neutrals, one emerald accent, hairline borders.
- Data now is seed data in `src/data/seed.ts` until the Firestore sync phase.
- Money writes will go through Cloud Functions, not direct client writes (ADR 0007).

## Working on a change

1. Branch from `main`: `git switch -c feat/<scope>-<short>` (see `docs/git-workflow.md`).
2. Make the change, with a test if it touches money, permissions, stock or sync.
3. Run the checks above that apply.
4. Update docs and `CHANGELOG.md` under `[Unreleased]`.
5. Commit with a Conventional Commit message and open a pull request.

## Gotchas

- `expo-router` bundles its own react-navigation: import tab bar types from `expo-router/build/layouts/Tabs`, and the tab bar gets `navigateToTab` and `insets`, not `navigation`.
- `useT()` pairs are tuples; spreading a union of readonly tuples fails typecheck, so type seed data as `[string, string]`.
- `firebase/auth` types do not list `getReactNativePersistence` (the React Native build has it); `src/lib/firebase.ts` casts for that reason.
