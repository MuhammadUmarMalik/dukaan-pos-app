import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { PRODUCTS, type Product } from '@/data/seed';
import { sameCode } from '@/lib/product';

// ponytail: persisted on the phone only. In the sync phase this becomes a view over the local database and
// upsert() calls the save_product function; the Product shape already matches it.
export type Move = { id: string; at: number; productId: string; delta: number; why: string };
type S = {
  items: Product[];
  moves: Move[];
  /** Change stock and log the movement (append-only log, the count is a cache). */
  move: (productId: string, delta: number, why: string) => void;
  archive: (id: string) => void;
  upsert: (p: Product) => void;
  byCode: (code: string) => Product | undefined;
  /** Take sold quantities out of stock. */
  consume: (lines: { productId: string; qty: number }[], why?: string) => void;
};

export const useProducts = create<S>()(
  persist(
    (set, get) => ({
      items: PRODUCTS,
      moves: [],
      move: (productId, delta, why) => set((s) => ({
        items: s.items.map((p) => (p.id === productId ? { ...p, stock: Math.round((p.stock + delta) * 1000) / 1000 } : p)),
        moves: [{ id: newId(), at: Date.now(), productId, delta, why }, ...s.moves].slice(0, 1000),
      })),
      archive: (id) => set((s) => ({ items: s.items.map((p) => (p.id === id ? { ...p, archived: true } : p)) })),
      upsert: (p) => set((s) => ({ items: s.items.some((x) => x.id === p.id) ? s.items.map((x) => (x.id === p.id ? p : x)) : [...s.items, p] })),
      byCode: (code) => get().items.find((p) => p.codes.some((c) => sameCode(c, code))),
      consume: (lines, why = 'Sale') => lines.forEach((l) => get().move(l.productId, -l.qty, why)),
    }),
    { name: 'dukaan-products', storage: createJSONStorage(() => AsyncStorage), partialize: (s) => ({ items: s.items, moves: s.moves }) },
  ),
);

/** Client-made id. The database accepts any uuid, so the sync phase swaps this for a real uuid v7. */
export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
