import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useSettings } from '@/state/settings';
import { useT, useTokens } from '@/theme';
import { Button, Field, Row, Text } from '@/ui/kit';
import { OnbShell } from '@/ui/Onboarding';

// ponytail: sign-in is a stub. Phase 2 wires supabase.auth.signInWithOtp / verifyOtp; the screens and flow stay as they are.
export default function Phone() {
  const t = useT();
  const tk = useTokens();
  const router = useRouter();
  const set = useSettings((s) => s.set);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const validPhone = /^0?3\d{9}$/.test(phone.replace(/[\s-]/g, ''));

  if (!sent) {
    return (
      <OnbShell step={2} title={t('Your mobile number', 'آپ کا موبائل نمبر')} sub={t('We send a 6 digit code by SMS. No password needed.', 'ہم ایس ایم ایس پر 6 ہندسوں کا کوڈ بھیجیں گے۔ پاس ورڈ کی ضرورت نہیں۔')}>
        <Row gap={10} align="flex-end">
          <View style={{ height: 52, paddingHorizontal: 14, borderRadius: 13, backgroundColor: tk.surface, borderWidth: 1, borderColor: tk.line2, justifyContent: 'center' }}>
            <Text w={600} mono>+92</Text>
          </View>
          <View style={{ flex: 1 }}><Field label={t('Mobile number', 'موبائل نمبر')} value={phone} onChangeText={setPhone} placeholder="300 1234567" keyboardType="phone-pad" /></View>
        </Row>
        <Button label={t('Send code', 'کوڈ بھیجیں')} disabled={!validPhone} onPress={() => { set({ shop: { ...useSettings.getState().shop, phone: phone.replace(/\D/g, '') } }); setSent(true); }} />
      </OnbShell>
    );
  }
  return (
    <OnbShell step={2} title={t('Enter the code', 'کوڈ درج کریں')} sub={t(`Sent to +92 ${phone}`, `+92 ${phone} پر بھیجا گیا`)}>
      <Field label={t('6 digit code', '6 ہندسوں کا کوڈ')} value={code} onChangeText={(s) => setCode(s.replace(/\D/g, '').slice(0, 6))} placeholder="000000" keyboardType="numeric" />
      <Button label={t('Verify', 'تصدیق کریں')} disabled={code.length !== 6} onPress={() => router.push('/onboarding/shop')} />
      <Button kind="ghost" label={t('Change number', 'نمبر بدلیں')} onPress={() => setSent(false)} />
    </OnbShell>
  );
}
