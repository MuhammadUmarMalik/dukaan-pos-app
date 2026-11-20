import { create } from 'zustand';

/** Hands a scanned code from the scan screen back to the product form. Read once, then cleared. */
export const useScan = create<{ code: string | null; set: (c: string | null) => void }>((set) => ({ code: null, set: (code) => set({ code }) }));
