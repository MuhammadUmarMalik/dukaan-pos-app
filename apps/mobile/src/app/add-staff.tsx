import { useRouter } from 'expo-router';
import { useState } from 'react';
import { whatsapp } from '@/lib/share';
import { newId } from '@/state/products';
import { PERMS } from '@/data/seed';
import { useSettings } from '@/state/settings';
import { useT } from '@/theme';
import { Button, Col, Field, Screen, Text, Toggle } from '@/ui/kit';
import { Header, Li, List, Pick } from '@/ui/parts';

export default function AddStaff() {
  const t = useT();
  const router = useRouter();
  const { staff, tog, shop, set } = useSettings();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'cashier' | 'manager'>('cashier');
  const okPhone = /^0?3\d{9}$/.test(phone.replace(/[\s-]/g, ''));
  const save = () => {
    set({ staff: [...staff, { id: newId(), name: name.trim(), phone: phone.trim(), role }] });
    void whatsapp(t(`Assalam o Alaikum ${name.trim()}, ${shop.name} added you to Dukaan as ${role}. Install the app and sign in to start.`, `السلام علیکم ${name.trim()}، ${shop.name} نے آپ کو دکان ایپ میں شامل کیا ہے۔ ایپ انسٹال کر کے سائن ان کریں۔`), phone);
    router.back();
  };
  return (
    <Screen>
      <Header title={t('Add staff', 'اسٹاف شامل')} home="/staff" />
      <Field label={t('Name', 'نام')} value={name} onChangeText={setName} placeholder={t('Full name', 'پورا نام')} autoCapitalize="words" />
      <Field label={t('Phone', 'فون')} value={phone} onChangeText={setPhone} placeholder="03XX XXXXXXX" keyboardType="phone-pad" error={phone && !okPhone ? t('Use a mobile number like 0300 1234567', 'موبائل نمبر لکھیں جیسے 0300 1234567') : undefined} />
      <Col gap={8}><Text v="small" c="fg2" w={500}>{t('Role', 'کردار')}</Text><Pick value={role} onChange={setRole} options={[['cashier', t('Cashier', 'کیشیئر')], ['manager', t('Manager', 'مینیجر')]]} /></Col>
      <List>{PERMS.map(([k, en, ur]) => [k, t(en, ur)] as const).map(([k, l]) => <Li key={k} title={l} right={<Toggle label={l} on={role === 'manager' || tog[k]} onChange={(v) => role === 'cashier' && set({ tog: { ...tog, [k]: v } })} />} />)}</List>
      <Text v="xs" c="fg3">{t('They get an invite by WhatsApp. Every action they take is saved in the activity log.', 'انہیں واٹس ایپ پر دعوت ملے گی۔ ان کا ہر عمل ایکٹیویٹی لاگ میں محفوظ ہوگا۔')}</Text>
      <Button label={t('Send invite', 'دعوت بھیجیں')} disabled={name.trim().length < 2 || !okPhone} onPress={save} />
    </Screen>
  );
}
