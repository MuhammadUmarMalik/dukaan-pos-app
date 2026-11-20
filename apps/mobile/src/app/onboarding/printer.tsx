import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useSettings } from '@/state/settings';
import { useT } from '@/theme';
import { Button, Card, Col, Field } from '@/ui/kit';
import { OnbShell } from '@/ui/Onboarding';
import { Li, Note } from '@/ui/parts';

// ponytail: Bluetooth search and ESC/POS printing need a native module in a development build (docs/frontend.md).
// Until then the shopkeeper saves the printer's name so receipts and settings show it.
export default function Printer() {
  const t = useT();
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { printer, set } = useSettings();
  const [name, setName] = useState(printer ?? '');
  const done = () => { if (from === 'settings') router.back(); else { set({ onboarded: true }); router.replace('/(tabs)'); } };
  return (
    <OnbShell step={from === 'settings' ? 0 : 6} back={from === 'settings'} title={t('Connect your printer', 'پرنٹر جوڑیں')} sub={t('Turn on your 58mm pocket printer and keep it close to your phone.', 'اپنا 58 ملی میٹر پرنٹر آن کریں اور فون کے قریب رکھیں۔')}>
      <Note tone="blue" text={t('Searching for Bluetooth printers works in the phone app. Type the name printed on your printer for now.', 'بلوٹوتھ پرنٹر کی تلاش فون ایپ میں ہوگی۔ ابھی پرنٹر پر لکھا نام لکھیں۔')} />
      <Field label={t('Printer name', 'پرنٹر کا نام')} value={name} onChangeText={setName} placeholder="MPT-II 58mm" />
      {printer ? <Card pad={0}><Li icon="printer" tone="grn" title={printer} sub={t('Saved', 'محفوظ')} /></Card> : null}
      <Col gap={8}>
        <Button label={from === 'settings' ? t('Save', 'محفوظ کریں') : t('Start selling', 'فروخت شروع کریں')} disabled={!name.trim()} onPress={() => { set({ printer: name.trim() }); done(); }} />
        <Button kind="ghost" label={t('Skip for now', 'ابھی چھوڑیں')} onPress={done} />
      </Col>
    </OnbShell>
  );
}
