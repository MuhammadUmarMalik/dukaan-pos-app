import { useCallback, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
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

export function useHydrated() {
  const [ok, setOk] = useState(useSettings.persist.hasHydrated());
  useEffect(() => useSettings.persist.onFinishHydration(() => setOk(true)), []);
  return ok;
}
