import { useCallback, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { useBooks } from '@/state/books';
import { useKhata } from '@/state/khata';
import { useProducts } from '@/state/products';
import { useSettings } from '@/state/settings';
import { dark, light, type Tokens } from './tokens';

export * from './tokens';

export function useTokens(): Tokens {
  const system = useColorScheme();
  const mode = useSettings((s) => s.theme);
  return (mode === 'system' ? system : mode) === 'dark' ? dark : light;
}

export const useRtl = () => useSettings((s) => s.lang) === 'ur';

/** t('Home', 'ہوم'): English and Urdu live side by side, same as the prototype. */
export function useT() {
  const ur = useRtl();
  return useCallback((en: string, u: string) => (ur ? u : en), [ur]);
}

const stores = [useSettings.persist, useProducts.persist, useKhata.persist, useBooks.persist];
const allHydrated = () => stores.every((s) => s.hasHydrated());

export function useHydrated() {
  const [ok, setOk] = useState(allHydrated());
  useEffect(() => {
    const off = stores.map((s) => s.onFinishHydration(() => setOk(allHydrated())));
    return () => off.forEach((f) => f());
  }, []);
  return ok;
}
