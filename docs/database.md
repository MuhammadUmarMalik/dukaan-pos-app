# Database

The Postgres schema was removed when the backend moved to Firebase ([ADR 0007](decisions/0007-firebase.md)). It is still in git history (tag `v0.1.0`, branch `db/product-rpcs`) as the reference for the data model: tables, money rules, ledger signs and subscription states carry over to Firestore and Cloud Functions.

The Firestore data model will be written here when the first synced feature is built.
