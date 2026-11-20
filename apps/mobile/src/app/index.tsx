import { Redirect } from 'expo-router';
import { cloudReady } from '@/lib/firebase';
import { useAuth } from '@/state/auth';
import { useSettings } from '@/state/settings';

export default function Index() {
  const onboarded = useSettings((s) => s.onboarded);
  const user = useAuth((s) => s.user);
  if (cloudReady && !user) return <Redirect href={onboarded ? '/onboarding/account' : '/onboarding/language'} />;
  return <Redirect href={onboarded ? '/(tabs)' : cloudReady ? '/onboarding/shop' : '/onboarding/language'} />;
}
