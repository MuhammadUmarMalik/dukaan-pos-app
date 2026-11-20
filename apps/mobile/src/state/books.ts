import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { newId } from './products';
import type { Sale } from './cart';

// Sales history, held bills, purchases, expenses, returns and day closings. All on the phone until the sync phase.
export type Held = { id: string; at: number; customerId: string | null; lines: { productId: string; qty: number }[] };
export type Purchase = { id: string; no: string; at: number; supplierId: string; lines: { productId: string; qty: number; cost: number }[]; total: number; paid: number };
export type Expense = { id: string; at: number; cat: string; amount: number; from: 'Cash' | 'Bank'; note: string };
export type Return = { id: string; at: number; bill: string; amount: number; how: 'cash' | 'khata' | 'swap'; reason: string };
export type Closing = { id: string; at: number; expected: number; counted: number };

type S = {
  sales: Sale[]; held: Held[]; purchases: Purchase[]; expenses: Expense[]; returns: Return[]; closings: Closing[]; poNo: number;
  addSale: (s: Sale) => void;
  hold: (h: Omit<Held, 'id' | 'at'>) => void;
  dropHeld: (id: string) => void;
  addPurchase: (p: Omit<Purchase, 'id' | 'no' | 'at'>) => Purchase;
  addExpense: (e: Omit<Expense, 'id' | 'at'>) => void;
  addReturn: (r: Omit<Return, 'id' | 'at'>) => void;
  close: (c: Omit<Closing, 'id' | 'at'>) => void;
};

export const useBooks = create<S>()(
  persist(
    (set, get) => ({
      sales: [], held: [], purchases: [], expenses: [], returns: [], closings: [], poNo: 212,
      addSale: (s) => set((x) => ({ sales: [s, ...x.sales].slice(0, 500) })), // ponytail: last 500 on the phone; reports read the server later
      hold: (h) => set((x) => ({ held: [...x.held, { ...h, id: newId(), at: Date.now() }] })),
      dropHeld: (id) => set((x) => ({ held: x.held.filter((h) => h.id !== id) })),
      addPurchase: (p) => {
        const n = get().poNo + 1;
        const row = { ...p, id: newId(), no: `#${n}`, at: Date.now() };
        set((x) => ({ purchases: [row, ...x.purchases], poNo: n }));
        return row;
      },
      addExpense: (e) => set((x) => ({ expenses: [{ ...e, id: newId(), at: Date.now() }, ...x.expenses] })),
      addReturn: (r) => set((x) => ({ returns: [{ ...r, id: newId(), at: Date.now() }, ...x.returns] })),
      close: (c) => set((x) => ({ closings: [{ ...c, id: newId(), at: Date.now() }, ...x.closings] })),
    }),
    { name: 'dukaan-books', storage: createJSONStorage(() => AsyncStorage), partialize: ({ sales, held, purchases, expenses, returns, closings, poNo }) => ({ sales, held, purchases, expenses, returns, closings, poNo }) },
  ),
);

export const isToday = (ms: number) => new Date(ms).toDateString() === new Date().toDateString();
