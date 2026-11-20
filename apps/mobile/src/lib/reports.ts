// Report math: periods, buckets and khata aging. Pure functions over plain data, all money in paisa.

export type PeriodKind = 'day' | 'week' | 'month';
const DAY = 86_400_000;

const startOfDay = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };

/**
 * The period `offset` steps back from now (0 = current, -1 = previous). Weeks start on Monday.
 * `to` is exclusive.
 */
export function range(kind: PeriodKind, offset = 0, now = Date.now()) {
  const d = new Date(startOfDay(now));
  if (kind === 'day') {
    d.setDate(d.getDate() + offset);
    const from = d.getTime();
    return { from, to: startOfDay(from + DAY + 3_600_000) };
  }
  if (kind === 'week') {
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offset * 7);
    const from = d.getTime();
    const e = new Date(from); e.setDate(e.getDate() + 7);
    return { from, to: e.getTime() };
  }
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  const from = d.getTime();
  const e = new Date(from); e.setMonth(e.getMonth() + 1);
  return { from, to: e.getTime() };
}

/** Chart buckets: 3-hour blocks for a day, days for a week or month. Returns [start, end) pairs. */
export function buckets(kind: PeriodKind, from: number, to: number): [number, number][] {
  const out: [number, number][] = [];
  if (kind === 'day') { for (let i = 0; i < 8; i++) out.push([from + i * 3 * 3_600_000, from + (i + 1) * 3 * 3_600_000]); return out; }
  for (let s = from; s < to;) { const e = startOfDay(s + DAY + 3_600_000); out.push([s, Math.min(e, to)]); s = e; }
  return out;
}

export const within = (at: number, r: { from: number; to: number }) => at >= r.from && at < r.to;
export const sumBy = <T>(xs: T[], f: (x: T) => number) => xs.reduce((a, x) => a + f(x), 0);

/** Group and total, biggest first. */
export function totalsBy<T>(xs: T[], key: (x: T) => string, val: (x: T) => number) {
  const m = new Map<string, number>();
  xs.forEach((x) => m.set(key(x), (m.get(key(x)) ?? 0) + val(x)));
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

export type AgeBuckets = { d30: number; d60: number; d90: number; older: number };

/**
 * How old the money a customer owes is. Payments settle the oldest credit first (FIFO), the usual khata rule,
 * so what is left is the newest credit. Entries: amount > 0 credit given, < 0 payment.
 */
export function aging(entries: { at: number; amount: number }[], now = Date.now()): AgeBuckets {
  const sorted = [...entries].sort((a, b) => a.at - b.at);
  let paid = -sumBy(sorted.filter((e) => e.amount < 0), (e) => e.amount);
  const open: { at: number; left: number }[] = [];
  for (const e of sorted.filter((x) => x.amount > 0)) {
    const used = Math.min(paid, e.amount);
    paid -= used;
    if (e.amount - used > 0) open.push({ at: e.at, left: e.amount - used });
  }
  const b: AgeBuckets = { d30: 0, d60: 0, d90: 0, older: 0 };
  for (const o of open) {
    const days = (now - o.at) / DAY;
    if (days <= 30) b.d30 += o.left; else if (days <= 60) b.d60 += o.left; else if (days <= 90) b.d90 += o.left; else b.older += o.left;
  }
  return b;
}

/** Margin percent, rounded; 0 when there were no sales. */
export const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

/**
 * Cost of goods for a sale. ponytail: uses today's cost price of each item; the sync phase stores the cost on
 * each sale line when it is sold, so old profit does not move when a cost changes.
 */
export const saleCost = (lines: { productId?: string; qty: number; price: number }[], costOf: (id: string) => number | undefined) =>
  lines.reduce((a, l) => a + Math.round(l.qty * ((l.productId ? costOf(l.productId) : undefined) ?? l.price)), 0);
