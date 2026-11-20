import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Button } from '@/ui/kit';
import { withAppleToken, withGoogleToken, type AuthResult } from './auth';

WebBrowser.maybeCompleteAuthSession();

const ids = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
};
// The Google hook throws when this platform's client ID is missing, so the button exists only when it is set.
export const googleReady = Boolean(Platform.OS === 'ios' ? ids.iosClientId : Platform.OS === 'android' ? ids.androidClientId : ids.webClientId);

type P = { label: string; busy: boolean; onResult: (r: AuthResult) => void; setBusy: (b: boolean) => void };

export function GoogleButton({ label, busy, onResult, setBusy }: P) {
  const [request, response, prompt] = Google.useIdTokenAuthRequest(ids);
  useEffect(() => {
    if (response?.type === 'success' && response.params.id_token) withGoogleToken(response.params.id_token).then((r) => { setBusy(false); onResult(r); });
    else if (response && response.type !== 'success') setBusy(false);
  }, [response]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Button kind="sec" label={label} disabled={busy || !request} onPress={() => { setBusy(true); void prompt(); }} />;
}

/** Sign in with Apple is native on iPhone only (Apple's rule for apps that offer Google sign-in). */
export function AppleButton({ label, busy, onResult, setBusy }: P) {
  const [ok, setOk] = useState(false);
  useEffect(() => { if (Platform.OS === 'ios') AppleAuthentication.isAvailableAsync().then(setOk); }, []);
  if (!ok) return null;
  return (
    <Button kind="sec" label={label} disabled={busy} onPress={async () => {
      setBusy(true);
      try {
        const raw = Crypto.randomUUID();
        const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
        const c = await AppleAuthentication.signInAsync({ requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL], nonce: hashed });
        if (!c.identityToken) { setBusy(false); onResult({ ok: false, error: 'other' }); return; }
        const r = await withAppleToken(c.identityToken, raw);
        setBusy(false); onResult(r);
      } catch (e) {
        setBusy(false);
        onResult({ ok: false, error: (e as { code?: string }).code === 'ERR_REQUEST_CANCELED' ? 'cancelled' : 'other' });
      }
    }} />
  );
}
