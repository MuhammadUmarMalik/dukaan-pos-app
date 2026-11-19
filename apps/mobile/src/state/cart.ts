import { create } from 'zustand';
import { PRODUCTS } from '@/data/seed';
import { totals } from '@/lib/money';

export type PayMode = 'cash' | 'jazz' | 'easy' | 'bank' | 'khata';
export type Discount = { kind: 'amount'; value: number } | { kind: 'pct'; value: number };
type Line = { productId: string; qty: number };
export type Sale = {
  bill: string; at: number; customerId: string | null; mode: PayMode;
  lines: { name: string; ur: string; qty: number; price: number }[];
  subtotal: number; discount: number; total: number; received: number;
};

type S = {
  lines: Line[]; customerId: string | null; discount: Discount; mode: PayMode; received: number | null;
  last: Sale | null;
  add: (id: string) => void;
  step: (id: string, d: number) => void;
  clear: () => void;
  set: (p: Partial<Pick<S, 'customerId' | 'discount' | 'mode' | 'received'>>) => void;
  complete: (bill: string) => void;
};

const NONE: Discount = { kind: 'amount', value: 0 };
const price = (id: string) => PRODUCTS.find((p) => p.id === id)!.price;

export const useCart = create<S>((set, get) => ({
  lines: [], customerId: null, discount: NONE, mode: 'cash', received: null, last: null,
  add: (id) => set((s) => ({
    lines: s.lines.some((l) => l.productId === id)
      ? s.lines.map((l) => (l.productId === id ? { ...l, qty: l.qty + 1 } : l))
      : [...s.lines, { productId: id, qty: 1 }],
  })),
  step: (id, d) => set((s) => ({
    lines: s.lines.map((l) => (l.productId === id ? { ...l, qty: l.qty + d } : l)).filter((l) => l.qty > 0),
  })),
  clear: () => set({ lines: [], customerId: null, discount: NONE, mode: 'cash', received: null }),
  set: (p) => set(p),
  complete: (bill) => {
    const s = get();
    const t = cartTotals(s);
    set({
      last: {
        bill, at: Date.now(), customerId: s.customerId, mode: s.mode, ...t,
        lines: s.lines.map((l) => {
          const p = PRODUCTS.find((x) => x.id === l.productId)!;
          return { name: p.name, ur: p.ur, qty: l.qty, price: p.price };
        }),
        received: s.mode === 'cash' ? s.received ?? t.total : t.total,
      },
    });
    get().clear();
  },
}));

export function cartTotals(s: Pick<S, 'lines' | 'discount'>) {
  const t = totals(s.lines.map((l) => ({ qty: l.qty, price: price(l.productId) })), s.discount.kind === 'pct' ? { pct: s.discount.value } : s.discount.value);
  return { subtotal: t.subtotal, discount: t.discount, total: t.total };
}
