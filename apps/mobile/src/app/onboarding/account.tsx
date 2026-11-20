import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { sendReset, signInEmail, signUpEmail, validEmail, validPassword, type AuthResult } from '@/lib/auth';
import { cloudReady } from '@/lib/firebase';
import { AppleButton, GoogleButton, googleReady } from '@/lib/social';
import { useT } from '@/theme';
import { Button, Col, Field, Hairline, Text } from '@/ui/kit';
import { OnbShell } from '@/ui/Onboarding';

type Mode = 'in' | 'up' | 'reset';

export default function Account() {
  const t = useT();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('up');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ bad: boolean; text: string } | null>(null);

  // Messages stay generic on purpose: they must not reveal whether an email already has an account.
  const words = (r: AuthResult) => {
    if (r.ok) return null;
    return {
      credentials: t('Email or password is not right.', 'ای میل یا پاس ورڈ درست نہیں۔'),
      unverified: t('Confirm your email first: open the link we sent you.', 'پہلے ای میل کی تصدیق کریں: ہم نے جو لنک بھیجا ہے اسے کھولیں۔'),
      limit: t('Too many tries. Wait a minute and try again.', 'بہت زیادہ کوششیں۔ ایک منٹ بعد دوبارہ کوشش کریں۔'),
      network: t('No internet connection.', 'انٹرنیٹ نہیں ہے۔'),
      cancelled: '',
      other: t('Something went wrong. Try again.', 'کچھ غلط ہو گیا۔ دوبارہ کوشش کریں۔'),
    }[r.error];
  };
  const run = async (job: () => Promise<AuthResult>, done: (r: AuthResult) => void) => {
    setBusy(true); setMsg(null);
    const r = await job();
    setBusy(false);
    const bad = words(r);
    if (bad !== null) { if (bad) setMsg({ bad: true, text: bad }); return; }
    done(r);
  };

  const social = (r: AuthResult) => { const bad = words(r); if (bad) setMsg({ bad: true, text: bad }); else if (r.ok) router.replace('/'); };
  const okEmail = validEmail(email);
  const canSubmit = mode === 'reset' ? okEmail : mode === 'in' ? okEmail && pw.length > 0 : okEmail && validPassword(pw) && name.trim().length > 0;
  const submit = () =>
    mode === 'in' ? run(() => signInEmail(email, pw), () => router.replace('/'))
    : mode === 'up' ? run(() => signUpEmail(email, pw, name), (r) => (r.ok && r.needsVerify
        ? setMsg({ bad: false, text: t('We sent a link to your email. Open it, then sign in.', 'ہم نے آپ کی ای میل پر لنک بھیجا ہے۔ اسے کھولیں، پھر سائن ان کریں۔') }) : router.replace('/')))
    : run(() => sendReset(email), () => setMsg({ bad: false, text: t('If this email has an account, a reset link is on its way.', 'اگر اس ای میل کا اکاؤنٹ ہے تو ری سیٹ لنک بھیج دیا گیا ہے۔') }));

  const title = { in: t('Sign in', 'سائن ان'), up: t('Create your account', 'اکاؤنٹ بنائیں'), reset: t('Reset password', 'پاس ورڈ ری سیٹ') }[mode];
  const weak = mode === 'up' && pw.length > 0 && !validPassword(pw);
  return (
    <OnbShell step={2} title={title} sub={mode === 'reset' ? t('We email you a link to choose a new password.', 'ہم نیا پاس ورڈ بنانے کا لنک ای میل کریں گے۔') : undefined}>
      {mode !== 'reset' ? (
        <>
          {cloudReady && googleReady ? <GoogleButton label={t('Continue with Google', 'گوگل کے ساتھ جاری رکھیں')} busy={busy} setBusy={setBusy} onResult={social} /> : null}
          {cloudReady ? <AppleButton label={t('Continue with Apple', 'ایپل کے ساتھ جاری رکھیں')} busy={busy} setBusy={setBusy} onResult={social} /> : null}
          <Hairline />
        </>
      ) : null}
      {mode === 'up' ? <Field label={t('Your name', 'آپ کا نام')} value={name} onChangeText={setName} autoCapitalize="words" /> : null}
      <Field label={t('Email', 'ای میل')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="name@example.com" />
      {mode !== 'reset' ? <Field label={t('Password', 'پاس ورڈ')} value={pw} onChangeText={setPw} secure autoCapitalize="none" error={weak ? t('At least 8 characters, with a letter and a number', 'کم از کم 8 حروف، ایک حرف اور ایک ہندسہ') : undefined} /> : null}
      {msg ? <Text c={msg.bad ? 'redFg' : 'grnFg'} accessibilityLiveRegion="polite">{msg.text}</Text> : null}
      <Button label={{ in: t('Sign in', 'سائن ان'), up: t('Create account', 'اکاؤنٹ بنائیں'), reset: t('Send link', 'لنک بھیجیں') }[mode]} disabled={!canSubmit || busy || !cloudReady} onPress={submit} />
      <Col gap={4}>
        {mode === 'in' ? <Link text={t('Forgot password?', 'پاس ورڈ بھول گئے؟')} onPress={() => { setMode('reset'); setMsg(null); }} /> : null}
        <Link text={mode === 'up' ? t('I already have an account', 'میرا اکاؤنٹ پہلے سے ہے') : mode === 'in' ? t('Create a new account', 'نیا اکاؤنٹ بنائیں') : t('Back to sign in', 'سائن ان پر واپس')} onPress={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg(null); }} />
      </Col>
      {!cloudReady ? <Button kind="ghost" label={t('Skip for now (no server set up)', 'ابھی چھوڑیں (سرور سیٹ اپ نہیں)')} onPress={() => router.push('/onboarding/shop')} /> : null}
    </OnbShell>
  );
}

function Link({ text, onPress }: { text: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={text} onPress={onPress} style={{ minHeight: 44, justifyContent: 'center' }}><Text c="accentInk" w={600}>{text}</Text></Pressable>;
}
