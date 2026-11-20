## What and why

<!-- One or two sentences. The PR title is a Conventional Commit and becomes the squash commit. -->

## How it was checked

- [ ] `npm run typecheck` and `npm test` in `apps/mobile`
- [ ] Looked at it in English and Urdu (right-to-left), light and dark (if UI changed)
- [ ] Not run / needs a device or a real Firebase project: <!-- say which -->

## Checklist

- [ ] Money is integer paisa; cashier money writes go through server functions
- [ ] New tenant table has `shop_id`, RLS, tests; applied migrations were not edited
- [ ] Every new visible string has English and Urdu
- [ ] Docs and `CHANGELOG.md` (`[Unreleased]`) updated
- [ ] No secrets, keys or `.env` files

## Screenshots

<!-- UI changes: English and Urdu. -->
