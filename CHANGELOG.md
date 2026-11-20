# Changelog

All notable changes to this project. Format: [Keep a Changelog](https://keepachangelog.com), versions follow [SemVer](https://semver.org). Add a line under `[Unreleased]` in every pull request that changes behavior.

## [Unreleased]

### Changed
- Backend is now Firebase instead of Supabase. The Postgres schema, RLS and tests were removed (history keeps them).

### Added
- Sign-in with email and password (verified email required), Google and Apple through Firebase Authentication, with password reset. Session is kept in the phone Keychain/Keystore.
- Firestore Security Rules that deny everything until features add rules, and ADR 0007.
- All remaining shopkeeper screens from the prototype: khata ledger with record entry, WhatsApp reminders and statements; add customer or supplier; held bills, split payment and weigh item; stock, adjust stock and product detail; purchases, new purchase and purchase orders; expenses, day closing and sale returns; reports; staff and permissions; settings, printer and receipt designer; online catalog, loyalty, backup and export, help and alerts; subscription, store purchase and paywall.
- Sales now go to a local history and to the customer's khata; stock changes keep a movement log. Book-keeping rules (khata signs, stock adjustment, weighing, reorder, cash expected) have unit tests.
- Product add and edit, barcode scan (camera on phone, typed code everywhere), barcode search in Sell and Items.

## [0.1.0] - 2026-11-19

First foundation. Not a store release.

### Added
- Approved UI prototype (`design/prototype.html`): shopkeeper app and admin panel, English and Urdu, light and dark, store purchase flows.
- Database (`supabase/`): multi-tenant schema with row level security, roles, subscriptions and entitlements from store events, server functions for sales, khata, returns and voids, append-only ledger and stock, sync cursor, audit log. 110 automated checks.
- Mobile app foundation (`apps/mobile`): design tokens, Urdu right-to-left, onboarding with shop category setup, Home, Sell to Cart to Pay to Receipt on seed data, Items, Khata and More screens.
- Money helpers with unit tests.
- Project docs, rules, git workflow, versioning and CI.
