import { useRouter } from 'expo-router';
import { useState } from 'react';
import { signOut } from '@/lib/auth';
import { cloudReady } from '@/lib/firebase';
import { useSettings } from '@/state/settings';
import { useT } from '@/theme';
import { Button, Card, Col, Field, Screen, Text, Toggle } from '@/ui/kit';
import { Header, initials, Li, List, Seg, toast } from '@/ui/parts';

export default function Settings() {
  const t = useT();
  const router = useRouter();
  const { shop, lang, theme, tog, set } = useSettings();
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState(shop);
  const sw = (k: string, l: string, sub?: string) => <Li key={k} title={l} sub={sub} right={<Toggle label={l} on={tog[k]} onChange={(v) => set({ tog: { ...tog, [k]: v } })} />} />;
  return (
    <Screen>
      <Header title={t('Settings', 'ترتیبات')} />
      {edit ? (
        <Card>
          <Col gap={12}>
            <Field label={t('Shop name', 'دکان کا نام')} value={f.name} onChangeText={(name) => setF({ ...f, name })} />
            <Field label={t('Owner name', 'مالک کا نام')} value={f.owner} onChangeText={(owner) => setF({ ...f, owner })} />
            <Field label={t('City', 'شہر')} value={f.city} onChangeText={(city) => setF({ ...f, city })} />
            <Field label={t('Shop phone', 'دکان کا فون')} value={f.phone} onChangeText={(phone) => setF({ ...f, phone })} keyboardType="phone-pad" />
            <Button label={t('Save', 'محفوظ کریں')} disabled={!f.name.trim()} onPress={() => { set({ shop: { ...f, name: f.name.trim() } }); setEdit(false); }} />
          </Col>
        </Card>
      ) : <Card pad={0}><Li initials={initials(shop.name)} title={shop.name} sub={`${shop.owner} · ${shop.city}`} onPress={() => { setF(shop); setEdit(true); }} /></Card>}
      <List>
        <Li title={t('Language', 'زبان')} right={<Seg value={lang} onChange={(l) => set({ lang: l })} options={[['en', 'English'], ['ur', 'اردو']]} />} />
        <Li title={t('Theme', 'تھیم')} right={<Seg value={theme} onChange={(x) => set({ theme: x })} options={[['system', t('Auto', 'خودکار')], ['light', t('Light', 'روشن')], ['dark', t('Dark', 'گہرا')]]} />} />
      </List>
      <Text v="label" c="fg3">{t('Notifications', 'نوٹیفکیشن')}</Text>
      <List>{[sw('nlow', t('Low stock and expiry', 'کم اسٹاک اور ایکسپائری')), sw('nsum', t('Daily summary at 9pm', 'روزانہ رات 9 بجے خلاصہ')), sw('nsnd', t('Sound on every sale', 'ہر فروخت پر آواز'))]}</List>
      <Text v="label" c="fg3">{t('Security', 'سیکیورٹی')}</Text>
      {/* ponytail: the switch is saved; the PIN screen on app open lands with staff quick login. */}
      <List>{[sw('lock', t('App lock PIN', 'ایپ لاک پن'), t('Ask for PIN when the app opens', 'ایپ کھولتے وقت پن مانگیں'))]}</List>
      <Button kind="ghost" label={t('Restart setup', 'سیٹ اپ دوبارہ شروع کریں')} onPress={() => { set({ onboarded: false }); router.replace('/onboarding/language'); }} />
      <Button kind="sec" label={t('Log out', 'لاگ آؤٹ')} onPress={async () => {
        if (cloudReady) await signOut();
        else toast(t('No account on this phone yet', 'اس فون پر ابھی کوئی اکاؤنٹ نہیں'));
        router.replace('/');
      }} />
    </Screen>
  );
}
