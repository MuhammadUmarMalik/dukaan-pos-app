# Product

**Dukaan** is a subscription mobile POS for small local shops in Pakistan. One app serves any shop type; the shop's category picks a template that sets up units, categories, barcode and expiry defaults and special features.

## Who it is for

Owner-run shops: grocery (karyana), bakery, milk and dairy, shoes, garments, fruit and vegetables, pharmacy, mobile shops, hardware, and an "other" template. Owners often work on cheap Android phones, with unreliable internet, and trust cash and khata more than cards.

## In scope

- Selling: scan or tap items, discounts, hold bills, split payment (cash, JazzCash, Easypaisa, bank, khata), returns, 58 mm Bluetooth receipts, WhatsApp bills.
- Khata: customers and suppliers, ledger, payments, reminders, statements.
- Stock: products, barcode scan to add, variants, stock levels, low-stock and expiry alerts, adjustments.
- Buying: purchases, supplier payables, purchase orders from reorder suggestions.
- Money: expenses, daily cash closing.
- Reports: sales, profit, khata aging, stock, payment mix, export.
- People: owner, manager, cashier with permissions (see cost, edit sales, give discounts), audit log.
- Growth: online catalog link, loyalty points, backup and export.
- Urdu and English with right-to-left layout, light and dark.
- Admin panel for the seller: shops, subscriptions from the stores, plans, templates, reports.

## Not in scope (yet)

Multiple branches, GST or FBR filing, a marketplace, restaurant table management, in-app payment outside the stores.

## Plans

Basic, Standard, Pro, monthly or yearly, 14-day free trial, bought in the app through the stores. Limits live in the `plans` table. See [billing.md](billing.md).

## Design

The approved prototype is `design/prototype.html`: a clickable phone prototype of the shopkeeper app plus the admin panel, English and Urdu, light and dark, Android and iOS purchase sheets. Look and feel: "Quiet Tech", cool graphite neutrals, one emerald accent, hairline borders, restrained motion.
