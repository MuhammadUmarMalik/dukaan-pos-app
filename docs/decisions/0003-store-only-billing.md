# 0003: Subscriptions only through Google Play and the App Store

Status: accepted

**Context.** Apple requires In-App Purchase for subscriptions that unlock features in an iOS app; Google requires Play Billing for digital goods. A manual JazzCash or slip flow inside the app would not pass review.

**Decision.** Sell plans only through the stores. The backend learns about purchases from store notifications and derives access in the database. No in-app payment outside the stores.

**Consequences.** About 15% store fee. No payment gateway to build. Pakistani payment-method availability in the stores is a risk to verify with a real purchase. Details in `docs/billing.md`.
