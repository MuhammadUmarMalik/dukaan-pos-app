// Pure book-keeping rules shared by khata, stock, purchases, cash closing and the sale extras. All money is paisa.

/** One khata line. `amount` > 0 grows the balance (customer owes more / we owe the supplier more), < 0 shrinks it. */
export type Entry = { id: string; at: number; note: string; amount: number; mode?: string };
export type PartyKind = 'customer' | 'supplier';

export const balance = (es: Entry[]) => es.reduce((a, e) => a + e.amount, 0);

/** Oldest first, each row with the balance after it. */
export function running(es: Entry[]) {
  let b = 0;
  return [...es].sort((x, y) => x.at - y.at).map((e) => ({ ...e, bal: (b += e.amount) }));
}

/**
 * "You got" / "You gave" as the shopkeeper sees it, turned into a signed entry.
 * Customer: you got a payment -> balance down; you gave credit -> up.
 * Supplier: you gave a payment -> balance down; you got goods on credit -> up.
 */
export const signed = (party: PartyKind, dir: 'got' | 'gave', paisa: number) =>
  (party === 'customer' ? (dir === 'got' ? -1 : 1) : dir === 'gave' ? -1 : 1) * Math.abs(paisa);

export type AdjustType = 'add' | 'rem' | 'set';
/** Stock after an adjustment, and the movement to log (append-only: a set count is logged as the difference). */
export function adjustStock(now: number, type: AdjustType, q: number) {
  const after = type === 'add' ? now + q : type === 'rem' ? now - q : q;
  return { after, delta: after - now };
}

/** Loose items: rate is paisa per kg. */
export const weighPrice = (ratePerKg: number, grams: number) => Math.round((ratePerKg * grams) / 1000);

/** Suggested order quantity: refill to twice the alert level. */
export const reorderQty = (stock: number, min: number) => Math.max(0, min * 2 - stock);

export function cashExpected(r: { opening: number; cashSales: number; received: number; expenses: number; supplierPaid: number }) {
  return r.opening + r.cashSales + r.received - r.expenses - r.supplierPaid;
}

/** Number pad: works on a rupee string ("1450"), returns the new string. Max 9,999,999. */
export function keypad(cur: string, key: string): string {
  if (key === 'del') return cur.slice(0, -1);
  const next = (cur + key).replace(/^0+/, '');
  return next.length > 7 ? cur : next;
}
export const rupeesToPaisa = (s: string) => (Number(s) || 0) * 100;
