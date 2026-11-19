# Changelog

All notable changes to this project. Format: [Keep a Changelog](https://keepachangelog.com), versions follow [SemVer](https://semver.org). Add a line under `[Unreleased]` in every pull request that changes behavior.

## [Unreleased]

## [0.1.0] - 2026-11-19

First foundation. Not a store release.

### Added
- Approved UI prototype (`design/prototype.html`): shopkeeper app and admin panel, English and Urdu, light and dark, store purchase flows.
- Database (`supabase/`): multi-tenant schema with row level security, roles, subscriptions and entitlements from store events, server functions for sales, khata, returns and voids, append-only ledger and stock, sync cursor, audit log. 110 automated checks.
- Mobile app foundation (`apps/mobile`): design tokens, Urdu right-to-left, onboarding with shop category setup, Home, Sell to Cart to Pay to Receipt on seed data, Items, Khata and More screens.
- Money helpers with unit tests.
- Project docs, rules, git workflow, versioning and CI.
