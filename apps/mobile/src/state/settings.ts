import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Lang = 'en' | 'ur';
export type Plan = 'basic' | 'standard' | 'pro';

type S = {
  lang: Lang;
  theme: 'system' | 'light' | 'dark';
  onboarded: boolean;
  shop: { name: string; owner: string; city: string; phone: string };
  category: string;
  flags: { barcode: boolean; expiry: boolean };
  plan: Plan;
  yearly: boolean;
  // ponytail: device code is a placeholder until register_device() (Supabase) is wired in the sync phase.
  deviceCode: string;
  billCounter: number;
  set: (p: Partial<S>) => void;
  nextBill: () => string;
};

export const useSettings = create<S>()(
  persist(
    (set, get) => ({
      lang: 'en',
      theme: 'system',
      onboarded: false,
      shop: { name: 'Rashid General Store', owner: 'Rashid Mehmood', city: 'Lahore', phone: '' },
      category: 'grocery',
      flags: { barcode: true, expiry: true },
      plan: 'standard',
      yearly: false,
      deviceCode: 'D0',
      billCounter: 0,
      set: (p) => set(p),
      nextBill: () => {
        const n = get().billCounter + 1;
        set({ billCounter: n });
        return `${get().deviceCode}-${String(n).padStart(6, '0')}`;
      },
    }),
    {
      name: 'dukaan-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ set: _s, nextBill: _n, ...rest }) => rest,
    },
  ),
);
