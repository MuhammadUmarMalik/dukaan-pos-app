// Pure product logic: price parsing, margin, barcode rules, form validation. Same rules as save_product in the database.

export const BARCODE_RE = /^[0-9A-Za-z-]{4,64}$/;

/** "1,450" -> 145000, "12.5" -> 1250, "Rs 90" -> 9000. null when empty or not a number (max 2 decimals). */
export function parsePaisa(text: string): number | null {
  const s = text.replace(/rs|,|\s/gi, '');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [rupees, frac = ''] = s.split('.');
  return Number(rupees) * 100 + Number((frac + '00').slice(0, 2));
}

/** 145000 -> "1450", 12550 -> "125.50". For filling inputs back from stored paisa. */
export const paisaText = (paisa: number) => (paisa % 100 === 0 ? String(paisa / 100) : (paisa / 100).toFixed(2));

/** Quantity with up to 3 decimals (kg, litre). Empty means 0. null when invalid. */
export function parseQty(text: string): number | null {
  const s = text.trim();
  if (s === '') return 0;
  return /^\d+(\.\d{1,3})?$/.test(s) ? Number(s) : null;
}

export function margin(cost: number, price: number) {
  const amount = price - cost;
  return { amount, pct: price > 0 ? Math.round((amount * 100) / price) : 0 };
}

/** UPC-A (12 digits) and the same code as EAN-13 (leading 0) are one code. Matches find_by_barcode in the database. */
export function sameCode(a: string, b: string) {
  const norm = (x: string) => x.trim().replace(/^0(?=\d{12}$)/, '');
  return a.trim() === b.trim() || norm(a) === norm(b);
}

export type Draft = { name: string; unit: string; cost: string; price: string; stock: string; min: string; expiry: string; barcode: string };
export type ErrorKey = 'name' | 'price' | 'cost' | 'stock' | 'min' | 'expiry' | 'barcode';
export type Errors = Partial<Record<ErrorKey, 'required' | 'invalid' | 'duplicate'>>;

const isRealDate = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

/** `other(code)` returns the name of another product that already uses the code, if any. */
export function validateDraft(d: Draft, other: (code: string) => string | undefined, expiryOn: boolean): Errors {
  const e: Errors = {};
  if (!d.name.trim()) e.name = 'required';
  if (d.price.trim() === '') e.price = 'required';
  else if (parsePaisa(d.price) === null) e.price = 'invalid';
  if (d.cost.trim() !== '' && parsePaisa(d.cost) === null) e.cost = 'invalid';
  if (parseQty(d.stock) === null) e.stock = 'invalid';
  if (parseQty(d.min) === null) e.min = 'invalid';
  if (expiryOn && d.expiry.trim() !== '' && !isRealDate(d.expiry.trim())) e.expiry = 'invalid';
  const code = d.barcode.trim();
  if (code) {
    if (!BARCODE_RE.test(code)) e.barcode = 'invalid';
    else if (other(code)) e.barcode = 'duplicate';
  }
  return e;
}
