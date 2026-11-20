import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { CUSTOMERS } from '@/data/seed';
import { balance, type Entry, type PartyKind } from '@/lib/books';
import { newId } from './products';

// ponytail: kept on the phone. In the sync phase entries are written by a Cloud Function (RULES.md #4) and this becomes a cache.
export type Party = { id: string; kind: PartyKind; name: string; ur: string; phone: string; area: string; limit: number; entries: Entry[] };

const DAY = 86_400_000;
const seed: Party[] = [
  ...CUSTOMERS.map((c, i) => ({
    id: c.id, kind: 'customer' as const, name: c.name, ur: c.ur, phone: `0300 55501${40 + i}`, area: c.area, limit: 0,
    entries: c.balance ? [
      { id: `${c.id}a`, at: Date.now() - (20 + i * 3) * DAY, note: 'Sale', amount: c.balance + 300000 },
      { id: `${c.id}b`, at: Date.now() - (6 + i) * DAY, note: 'Cash', amount: -300000, mode: 'Cash' },
    ] : [],
  })),
  { id: 's1', kind: 'supplier', name: 'Al-Noor Traders', ur: 'ال نور ٹریڈرز', phone: '0301 4440011', area: 'Akbari Mandi', limit: 0, entries: [{ id: 's1a', at: Date.now() - 8 * DAY, note: 'Purchase #212', amount: 3800000 }] },
  { id: 's2', kind: 'supplier', name: 'City Wholesale', ur: 'سٹی ہول سیل', phone: '0321 7770022', area: 'Shah Alam', limit: 0, entries: [{ id: 's2a', at: Date.now() - 14 * DAY, note: 'Purchase #209', amount: 2400000 }] },
];

type S = {
  parties: Party[];
  add: (p: Omit<Party, 'id' | 'entries'>, opening: number) => string;
  /** Append-only: mistakes are fixed with a reversing entry, never an edit (RULES.md #3). */
  entry: (partyId: string, e: Omit<Entry, 'id' | 'at'>) => void;
};

export const useKhata = create<S>()(
  persist(
    (set) => ({
      parties: seed,
      add: (p, opening) => {
        const id = newId();
        set((s) => ({ parties: [...s.parties, { ...p, id, entries: opening ? [{ id: newId(), at: Date.now(), note: 'Opening balance', amount: opening }] : [] }] }));
        return id;
      },
      entry: (partyId, e) => set((s) => ({
        parties: s.parties.map((p) => (p.id === partyId ? { ...p, entries: [...p.entries, { ...e, id: newId(), at: Date.now() }] } : p)),
      })),
    }),
    { name: 'dukaan-khata', storage: createJSONStorage(() => AsyncStorage), partialize: (s) => ({ parties: s.parties }) },
  ),
);

export const due = (p: Party) => balance(p.entries);
export const lastAt = (p: Party) => (p.entries.length ? Math.max(...p.entries.map((e) => e.at)) : 0);
export const shortDate = (ms: number) => (ms ? new Date(ms).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '-');
