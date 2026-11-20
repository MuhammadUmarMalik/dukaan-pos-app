import { create } from 'zustand';
import { totals } from '@/lib/money';
import { useBooks } from './books';
import { useKhata } from './khata';
import { useProducts } from './products';

export type PayMode = 'cash' | 'jazz' | 'easy' | 'bank' | 'khata' | 'split';
export type Discount = { kind: 'amount'; value: number } | { kind: 'pct'; value: number };
export type Split = { cash: number; jazz: number; khata: number };
type Line = { productId: string; qty: number };
export type Sale = {
  bill: string; at: number; customerId: string | null; mode: PayMode;
  lines: { productId?: string; name: string; ur: string; qty: number; price: number }[];
  subtotal: number; discount: number; total: number; received: number; split?: Split;
};

type S = {
  lines: Line[]; customerId: string | null; discount: Discount; mode: PayMode; received: number | null; split: Split;
  last: Sale | null;
  add: (id: string, qty?: number) => void;
  step: (id: string, d: number) => void;
  clear: () => void;
  set: (p: Partial<Pick<S, 'customerId' | 'discount' | 'mode' | 'received' | 'split' | 'lines'>>) => void;
  /** Park the current bill and start a fresh one. */
  hold: () => void;
  resume: (heldId: string) => void;
  complete: (bill: string) => void;
};

const NONE: Discount = { kind: 'amount', value: 0 };
const ZERO: Split = { cash: 0, jazz: 0, khata: 0 };
const find = (id: string) => useProducts.getState().items.find((p) => p.id === id)!;
const price = (id: string) => find(id)?.price ?? 0;
const r3 = (n: number) => Math.round(n * 1000) / 1000;

export const useCart = create<S>((set, get) => ({
  lines: [], customerId: null, discount: NONE, mode: 'cash', received: null, split: ZERO, last: null,
  add: (id, qty = 1) => set((s) => ({
    lines: s.lines.some((l) => l.productId === id)
      ? s.lines.map((l) => (l.productId === id ? { ...l, qty: r3(l.qty + qty) } : l))
      : [...s.lines, { productId: id, qty }],
  })),
  step: (id, d) => set((s) => ({
    lines: s.lines.map((l) => (l.productId === id ? { ...l, qty: r3(l.qty + d) } : l)).filter((l) => l.qty > 0),
  })),
  clear: () => set({ lines: [], customerId: null, discount: NONE, mode: 'cash', received: null, split: ZERO }),
  set: (p) => set(p),
  hold: () => {
    const s = get();
    if (!s.lines.length) return;
    useBooks.getState().hold({ customerId: s.customerId, lines: s.lines });
    get().clear();
  },
  resume: (heldId) => {
    const h = useBooks.getState().held.find((x) => x.id === heldId);
    if (!h) return;
    const cur = get();
    if (cur.lines.length) useBooks.getState().hold({ customerId: cur.customerId, lines: cur.lines }); // never lose the bill on screen
    set({ lines: h.lines, customerId: h.customerId, discount: NONE, mode: 'cash', received: null, split: ZERO });
    useBooks.getState().dropHeld(heldId);
  },
  // ponytail: everything below is local. In the sync phase this is one Cloud Function call (RULES.md #4) that does the same writes in a transaction.
  complete: (bill) => {
    const s = get();
    const t = cartTotals(s);
    const sale: Sale = {
      bill, at: Date.now(), customerId: s.customerId, mode: s.mode, ...t,
      lines: s.lines.map((l) => {
        const p = find(l.productId);
        return { productId: p.id, name: p.name, ur: p.ur, qty: l.qty, price: p.price };
      }),
      received: s.mode === 'cash' ? s.received ?? t.total : t.total,
      split: s.mode === 'split' ? s.split : undefined,
    };
    const onKhata = s.mode === 'khata' ? t.total : s.mode === 'split' ? s.split.khata : 0;
    if (onKhata && s.customerId) useKhata.getState().entry(s.customerId, { note: `Sale ${bill}`, amount: onKhata });
    useProducts.getState().consume(s.lines, `Sale ${bill}`);
    useBooks.getState().addSale(sale);
    set({ last: sale });
    get().clear();
  },
}));

export function cartTotals(s: Pick<S, 'lines' | 'discount'>) {
  const t = totals(s.lines.map((l) => ({ qty: l.qty, price: price(l.productId) })), s.discount.kind === 'pct' ? { pct: s.discount.value } : s.discount.value);
  return { subtotal: t.subtotal, discount: t.discount, total: t.total };
}
