# 0001: Stack

Status: accepted

**Context.** Small team, Android-first market with cheap phones, need Urdu right-to-left, offline use, and low running cost.

**Decision.** React Native with Expo (development builds, expo-router, TypeScript), Zustand for state, Supabase Postgres with row level security for data and auth, a small Express API for store webhooks and the admin panel, Firebase only for push and crash reports if needed. Not Firestore: per-read billing and no joins or aggregates for ledgers and reports. Not Adonis: Supabase already covers auth, ORM and migrations. Redis cannot run on a phone; the phone cache is key-value storage and later a local SQLite database, and a server Redis (Upstash) is added only when rate limits or queues need it.

**Consequences.** One TypeScript codebase for app, API and admin. Native features (Bluetooth printing, barcode camera, store billing) need development builds, not Expo Go. A local database and sync layer must be built for offline use.
