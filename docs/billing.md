# Billing

Plans are bought **only** through Google Play Billing and Apple In-App Purchase. Apple requires In-App Purchase for subscriptions that unlock features inside an iOS app (App Review Guideline 3.1.1), and SaaS is a listed valid subscription type (3.1.2(a)). The reader-app and enterprise exceptions do not fit this product. Outside the US storefront the iOS app must not point to other payment methods.

## Products

3 plans (basic, standard, pro) x monthly or yearly = 6 subscription products per store, one subscription group on Apple, one subscription with base plans on Google. The 14-day free trial is an introductory offer configured in the stores. Product ids live in `plans.store_products`, for example `dukaan_standard_monthly`.

## Flow

1. Owner picks a plan in onboarding or Subscription.
2. The app opens the store purchase sheet. `shop_id` is passed as Apple `appAccountToken` and Google `obfuscatedAccountId` so purchases map to a shop.
3. The store sends notifications to the backend (Google Real-time Developer Notifications through Pub/Sub; Apple App Store Server Notifications V2).
4. The backend calls `apply_subscription_event(...)` (service role). It is idempotent on `(store, external_id)` and ordered by the event's own time, so late older notifications never undo a renewal.
5. The database derives access. The app calls `get_entitlement(shop)` and caches the result in storage for up to 7 days offline.

## Status model

| Status | Access | Notes |
|---|---|---|
| trial, active | full | |
| grace | full until `grace_until` | Store is retrying a failed charge. |
| cancelled | full until period end | Will not renew. |
| hold, expired, refunded | read_only | Data stays visible and exportable. |

Read-only is enforced in the database (write policies and the money functions check `app.access`), not just hidden in the UI. Admin overrides: complimentary days and policy suspension (`entitlement_overrides`). An admin cannot mark a shop as paid.

## Screens

Plan picker, store purchase sheet (native), pending, declined and cancelled results, Subscription (manage in store, change plan, restore purchases, terms and privacy links), billing banners on Home, paywall when expired. Prototype: `design/prototype.html`. In the app, the plan screen saves the choice only; the purchase is wired in the billing phase (needs a development build and the store products).

## Rules

- Only the owner can buy or change a plan; staff see "ask the owner".
- Provide Restore purchases and links to terms and privacy (Apple requires them).
- Pricing shown is the store's own price in local currency. The Rs figures in the app are sample prices.
- Stores take about 15% (Small Business Program on Apple, reduced rate on Google). Price plans with that in mind.
- RevenueCat in front of both stores is an option to cut custom code. Decide in the billing phase.

## To verify before building

- Play Console: Pakistan merchant profile can sell subscriptions today, and which payment methods Pakistani shopkeepers can use (cards, carrier billing, gift cards). Carrier billing has been interrupted before.
- App Store Connect: PKR price points, Small Business Program enrollment.
- Real sandbox purchase on a Pakistani SIM before the billing phase is scoped.
- Launch on Android first; most shops are Android.
