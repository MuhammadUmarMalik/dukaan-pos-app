import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { parsePaisa } from '@/lib/product';
import { whatsapp } from '@/lib/share';
import { useKhata } from '@/state/khata';
import { useSettings } from '@/state/settings';
import { useT } from '@/theme';
import { Button, Card, Field, Row, Screen, Text, Toggle } from '@/ui/kit';
import { Header, Pick, Seg } from '@/ui/parts';

export default function AddParty() {
  const t = useT();
  const router = useRouter();
  const { kind: k0 } = useLocalSearchParams<{ kind?: 'customer' | 'supplier' }>();
  const [kind, setKind] = useState<'customer' | 'supplier'>(k0 === 'supplier' ? 'supplier' : 'customer');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [area, setArea] = useState('');
  const [open, setOpen] = useState('');
  const [dir, setDir] = useState<'they' | 'me'>('they');
  const [limit, setLimit] = useState('');
  const { tog, set, shop } = useSettings();
  const add = useKhata((s) => s.add);
  const okPhone = !phone || /^0?3\d{9}$/.test(phone.replace(/[\s-]/g, ''));
  const okOpen = !open || parsePaisa(open) !== null;
  const okLimit = !limit || parsePaisa(limit) !== null;
  const can = name.trim().length > 1 && okPhone && okOpen && okLimit;

  const save = () => {
    const o = parsePaisa(open) ?? 0;
    // Opening balance in the party's own direction: a customer who owes me, or a supplier I owe, is positive.
    const signedOpen = kind === 'customer' ? (dir === 'they' ? o : -o) : dir === 'me' ? o : -o;
    const id = add({ kind, name: name.trim(), ur: name.trim(), phone: phone.trim(), area: area.trim(), limit: parsePaisa(limit) ?? 0 }, signedOpen);
    if (tog.wel && phone) void whatsapp(t(`Assalam o Alaikum ${name.trim()}, you are now on the khata of ${shop.name}.`, `السلام علیکم ${name.trim()}، آپ ${shop.name} کے کھاتے میں شامل ہو گئے ہیں۔`), phone);
    router.replace(`/ledger/${id}`);
  };

  return (
    <Screen>
      <Header title={kind === 'supplier' ? t('Add supplier', 'سپلائر شامل') : t('Add customer', 'گاہک شامل')} home="/(tabs)/khata" />
      <Seg value={kind} onChange={setKind} options={[['customer', t('Customer', 'گاہک')], ['supplier', t('Supplier', 'سپلائر')]]} />
      <Field label={t('Name', 'نام')} value={name} onChangeText={setName} placeholder={t('Full name or shop name', 'پورا نام یا دکان کا نام')} autoCapitalize="words" />
      <Field label={t('Phone', 'فون')} value={phone} onChangeText={setPhone} placeholder="03XX XXXXXXX" keyboardType="phone-pad" error={okPhone ? undefined : t('Use a mobile number like 0300 1234567', 'موبائل نمبر لکھیں جیسے 0300 1234567')} />
      <Field label={t('Area, optional', 'علاقہ، اختیاری')} value={area} onChangeText={setArea} placeholder={t('For example, Model Town', 'مثلاً ماڈل ٹاؤن')} />
      <View style={{ gap: 8 }}>
        <Text v="small" c="fg2" w={500}>{t('Opening balance', 'ابتدائی بیلنس')}</Text>
        <Pick value={dir} onChange={setDir} options={[['they', t('They owe me', 'وہ مجھے دیں')], ['me', t('I owe them', 'میں انہیں دوں')]]} />
        <Field label={t('Amount', 'رقم')} value={open} onChangeText={setOpen} keyboardType="decimal-pad" placeholder="0" error={okOpen ? undefined : t('Enter an amount like 1450', 'رقم لکھیں جیسے 1450')} />
      </View>
      {kind === 'customer' ? <Field label={t('Credit limit, optional', 'کریڈٹ حد، اختیاری')} value={limit} onChangeText={setLimit} keyboardType="decimal-pad" placeholder="25000" error={okLimit ? undefined : t('Enter an amount', 'رقم لکھیں')} /> : null}
      <Card>
        <Row gap={12}>
          <View style={{ flex: 1 }}><Text w={600}>{t('Send welcome message', 'خوش آمدید پیغام بھیجیں')}</Text><Text v="small" c="fg3">{t('They get a WhatsApp note with your shop name', 'انہیں آپ کی دکان کے نام کا واٹس ایپ پیغام ملے گا')}</Text></View>
          <Toggle label={t('Send welcome message', 'خوش آمدید پیغام بھیجیں')} on={tog.wel} onChange={(v) => set({ tog: { ...tog, wel: v } })} />
        </Row>
      </Card>
      <Button label={t('Save', 'محفوظ کریں')} disabled={!can} onPress={save} />
    </Screen>
  );
}
