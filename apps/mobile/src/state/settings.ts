import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Lang = 'en' | 'ur';
export type Plan = 'basic' | 'standard' | 'pro';
export type SubStatus = 'trial' | 'active' | 'grace' | 'hold' | 'cancelled' | 'expired';
export type Staff = { id: string; name: string; phone: string; role: 'owner' | 'manager' | 'cashier' };
export type ReceiptCfg = { paper: 58 | 80; name: string; addr: string; foot: string; lang: 'both' | 'en' | 'ur'; logo: boolean; bal: boolean; auto: boolean; copies: number };

type S = {
  lang: Lang;
  theme: 'system' | 'light' | 'dark';
  onboarded: boolean;
  shop: { name: string; owner: string; city: string; phone: string };
  category: string;
  flags: { barcode: boolean; expiry: boolean };
  plan: Plan;
  yearly: boolean;
  // ponytail: device code is a placeholder until a server-assigned device code is wired in the sync phase.
  deviceCode: string;
  billCounter: number;
  /** On/off switches across More: notifications, app lock, catalog, loyalty, cashier permissions, backup. */
  tog: Record<string, boolean>;
  receipt: ReceiptCfg;
  staff: Staff[];
  printer: string | null;
  // ponytail: subscription status is local until store billing and the entitlement function exist (docs/billing.md).
  sub: { status: SubStatus; trialEnds: number };
  loyalty: { earn: number; red: number };
  lastBackup: number;
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
      tog: { nlow: true, nsum: true, nsnd: false, lock: false, catOn: true, cprice: true, cord: true, cdel: false, loy: true, bka: true, profit: false, del: false, price: true, wel: true, att: true, sms: false },
      receipt: { paper: 58, name: 'Rashid General Store', addr: 'Main Market, Gulberg, Lahore', foot: '', lang: 'both', logo: false, bal: true, auto: true, copies: 1 },
      staff: [{ id: 'o', name: 'Rashid Mehmood', phone: '', role: 'owner' }, { id: 'c1', name: 'Imran Shah', phone: '0300 1112233', role: 'cashier' }],
      printer: null,
      sub: { status: 'trial', trialEnds: Date.now() + 12 * 86_400_000 },
      loyalty: { earn: 1, red: 10 },
      lastBackup: 0,
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
