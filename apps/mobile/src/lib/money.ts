// Money is integer paisa everywhere (Rs 1 = 100), same as the database. Never floats.

/** 145000 -> "Rs 1,450". South Asian grouping (1,84,500). Hermes' Intl is not reliable for en-IN, so do it by hand. */
export function rs(paisa: number): string {
  const sign = paisa < 0 ? '-' : '';
  const rupees = String(Math.round(Math.abs(paisa) / 100));
  const last3 = rupees.slice(-3);
  const rest = rupees.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${sign}Rs ${rest ? rest + ',' : ''}${last3}`;
}

export type Line = { qty: number; price: number };

/** Line total in paisa: qty can be fractional (weight), rounded once, same rule as the database check. */
export const lineTotal = (l: Line) => Math.round(l.qty * l.price);

/** Discount: a number is paisa, `{ pct }` is a percentage of the subtotal. Never exceeds the subtotal. */
export function totals(lines: Line[], discount: number | { pct: number }) {
  const subtotal = lines.reduce((a, l) => a + lineTotal(l), 0);
  const raw = typeof discount === 'number' ? discount : Math.round((subtotal * discount.pct) / 100);
  const disc = Math.min(Math.max(raw, 0), subtotal);
  return { subtotal, discount: disc, total: subtotal - disc, count: lines.reduce((a, l) => a + l.qty, 0) };
}
