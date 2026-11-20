import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold } from '@expo-google-fonts/geist';
import { GeistMono_400Regular } from '@expo-google-fonts/geist-mono';
import { NotoNaskhArabic_400Regular, NotoNaskhArabic_500Medium, NotoNaskhArabic_600SemiBold, NotoNaskhArabic_700Bold } from '@expo-google-fonts/noto-naskh-arabic';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { cloudReady } from '@/lib/firebase';
import { useAuth } from '@/state/auth';
import { dark, useHydrated, useTokens } from '@/theme';
import { Toast } from '@/ui/parts';

export default function Root() {
  const [fontsReady, fontError] = useFonts({
    Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold, GeistMono_400Regular,
    NotoNaskhArabic_400Regular, NotoNaskhArabic_500Medium, NotoNaskhArabic_600SemiBold, NotoNaskhArabic_700Bold,
  });
  const hydrated = useHydrated();
  const tk = useTokens();
  const { user, ready } = useAuth();
  const router = useRouter();
  const place = useSegments()[0];
  // Signed out (or the session was revoked) anywhere in the app: go back to the start.
  useEffect(() => {
    if (cloudReady && ready && !user && place && place !== 'onboarding') router.replace('/');
  }, [user, ready, place, router]);
  if (!ready || !(fontsReady || fontError) || !hydrated) return null;
  return (
    <>
      <StatusBar style={tk === dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tk.bg }, animation: 'fade' }} />
      <Toast />
    </>
  );
}
