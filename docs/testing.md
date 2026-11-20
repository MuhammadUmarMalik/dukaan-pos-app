# Testing

| What | Command | Covers |
|---|---|---|
| Typecheck | `cd apps/mobile && npm run typecheck` | Types for the whole app. |
| Unit tests | `cd apps/mobile && npm test` | `src/lib/*.test.ts`: money formatting, line totals, discounts. Uses Node's built-in test runner. |
| Visual | `cd apps/mobile && npx expo start --web` | Layout, English and Urdu, light and dark, in a browser. |

## Rules and functions

Not set up yet: Firestore Security Rules start as deny-all, and each feature adds rules with tests that run against the Firebase emulator.

## Not covered yet

Anything on a real device (Bluetooth printing, barcode camera, store purchases), a real Firebase project, and end-to-end tests of the app. Say so when a change needs one of these and you could not run it.

## CI

`.github/workflows/ci.yml` runs typecheck and unit tests on every pull request.
