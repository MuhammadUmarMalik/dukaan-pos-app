import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { CATEGORIES } from '@/data/seed';
import { rs } from '@/lib/money';
import { margin, paisaText, parsePaisa, parseQty, validateDraft, type Draft, type ErrorKey } from '@/lib/product';
import { newId, useProducts } from '@/state/products';
import { useScan } from '@/state/scan';
import { useSettings } from '@/state/settings';
import { useT } from '@/theme';
import { Button, Card, Chip, Col, Field, IconButton, Row, Screen, Text } from '@/ui/kit';

export default function ProductForm() {
  const t = useT();
  const router = useRouter();
  // Opened by a link or after a reload there is no history to go back to.
  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/items'));
  const { id, code } = useLocalSearchParams<{ id?: string; code?: string }>();
  const { items, upsert, byCode } = useProducts();
  const { category, flags } = useSettings();
  const existing = id ? items.find((p) => p.id === id) : undefined;
  const units = (CATEGORIES.find((c) => c.k === category) ?? CATEGORIES[0]).units.split(' · ');

  const [d, setD] = useState<Draft>({
    name: existing?.name ?? '', unit: existing?.unit ?? units[0], barcode: existing?.codes[0] ?? code ?? '',
    cost: existing ? paisaText(existing.cost) : '', price: existing ? paisaText(existing.price) : '',
    stock: '', min: existing ? String(existing.min) : '', expiry: existing?.expiry ?? '',
  });
  const [ur, setUr] = useState(existing?.ur ?? '');
  const [errs, setErrs] = useState<Partial<Record<ErrorKey, string>>>({});
  const set = (k: keyof Draft) => (v: string) => setD((x) => ({ ...x, [k]: v }));

  // A code scanned on the scan screen comes back through the scan store.
  const scanned = useScan((s) => s.code);
  useEffect(() => {
    if (scanned) { setD((x) => ({ ...x, barcode: scanned })); useScan.getState().set(null); }
  }, [scanned]);

  const msg = (k: ErrorKey, e?: string) => {
    if (!e) return undefined;
    if (e === 'required') return t('Required', 'ضروری');
    if (e === 'duplicate') return t(`Already used by ${byCode(d.barcode.trim())?.name ?? 'another product'}`, `پہلے سے استعمال میں: ${byCode(d.barcode.trim())?.ur ?? ''}`);
    return { price: t('Enter an amount like 1450 or 12.5', 'رقم لکھیں جیسے 1450 یا 12.5'), cost: t('Enter an amount like 1320', 'رقم لکھیں جیسے 1320'), barcode: t('4 to 64 letters or digits', '4 سے 64 حروف یا ہندسے'),
      expiry: t('Use year-month-day, like 2027-05-31', 'سال-مہینہ-دن، جیسے 2027-05-31'), stock: t('Enter a number', 'نمبر لکھیں'), min: t('Enter a number', 'نمبر لکھیں'), name: '' }[k];
  };

  const cost = parsePaisa(d.cost);
  const price = parsePaisa(d.price);
  const m = cost !== null && price !== null ? margin(cost, price) : null;

  const save = () => {
    const e = validateDraft(d, (c) => { const o = byCode(c); return o && o.id !== existing?.id ? o.name : undefined; }, flags.expiry);
    setErrs(e);
    if (Object.keys(e).length) return;
    upsert({
      id: existing?.id ?? newId(), name: d.name.trim(), ur: ur.trim() || d.name.trim(), unit: d.unit,
      price: parsePaisa(d.price)!, cost: parsePaisa(d.cost) ?? existing?.cost ?? 0,
      stock: existing ? existing.stock : parseQty(d.stock)!, min: parseQty(d.min)!,
      codes: d.barcode.trim() ? [d.barcode.trim()] : [], expiry: flags.expiry && d.expiry.trim() ? d.expiry.trim() : undefined,
    });
    back();
  };

  return (
    <Screen>
      <Row justify="space-between">
        <IconButton icon="back" label={t('Back', 'واپس')} onPress={back} />
        <Text v="h2">{existing ? t('Edit product', 'آئٹم ایڈیٹ') : t('Add product', 'نیا آئٹم')}</Text>
        <View style={{ width: 44 }} />
      </Row>
      <Row gap={10} align="flex-end">
        <View style={{ flex: 1 }}>
          <Field label={t('Barcode', 'بارکوڈ')} value={d.barcode} onChangeText={set('barcode')} placeholder={t('Scan or type', 'اسکین یا لکھیں')} keyboardType="numeric" autoCapitalize="none" error={msg('barcode', errs.barcode)} />
        </View>
        <IconButton icon="scan" size={52} label={t('Scan barcode', 'بارکوڈ اسکین')} onPress={() => router.push('/scan?from=form')} />
      </Row>
      <Field label={t('Product name', 'آئٹم کا نام')} value={d.name} onChangeText={set('name')} placeholder={t('For example, Atta 10kg', 'مثلاً آٹا 10 کلو')} error={msg('name', errs.name)} />
      <Field label={t('Urdu name, optional', 'اردو نام، اختیاری')} value={ur} onChangeText={setUr} />
      <Col gap={8}>
        <Text v="small" c="fg2" w={500}>{t('Unit', 'یونٹ')}</Text>
        <Row gap={8} wrap>{units.map((u) => <Chip key={u} label={u} on={d.unit === u} onPress={() => set('unit')(u)} />)}</Row>
      </Col>
      <Row gap={10} align="flex-start">
        <View style={{ flex: 1 }}><Field label={t('Cost price', 'خرید قیمت')} value={d.cost} onChangeText={set('cost')} keyboardType="decimal-pad" placeholder="0" error={msg('cost', errs.cost)} /></View>
        <View style={{ flex: 1 }}><Field label={t('Sale price', 'فروخت قیمت')} value={d.price} onChangeText={set('price')} keyboardType="decimal-pad" placeholder="0" error={msg('price', errs.price)} /></View>
      </Row>
      <Card>
        <Row justify="space-between">
          <Text c="fg2">{t('Profit per unit', 'فی یونٹ منافع')}</Text>
          <Text w={600} num c={m && m.amount < 0 ? 'redFg' : 'fg'}>{m ? `${rs(m.amount)} · ${m.pct}%` : '-'}</Text>
        </Row>
      </Card>
      <Row gap={10} align="flex-start">
        <View style={{ flex: 1 }}>
          {existing
            ? <Col gap={7}><Text v="small" c="fg2" w={500}>{t('In stock', 'موجود')}</Text><Row style={{ height: 52 }}><Text w={600} num>{existing.stock} {existing.unit}</Text></Row></Col>
            : <Field label={t('Opening stock', 'ابتدائی اسٹاک')} value={d.stock} onChangeText={set('stock')} keyboardType="decimal-pad" placeholder="0" error={msg('stock', errs.stock)} />}
        </View>
        <View style={{ flex: 1 }}><Field label={t('Alert below', 'الرٹ حد')} value={d.min} onChangeText={set('min')} keyboardType="decimal-pad" placeholder="5" error={msg('min', errs.min)} /></View>
      </Row>
      {flags.expiry ? <Field label={t('Expiry date, optional', 'ایکسپائری تاریخ، اختیاری')} value={d.expiry} onChangeText={set('expiry')} placeholder="2027-05-31" keyboardType="numeric" error={msg('expiry', errs.expiry)} /> : null}
      <Button label={existing ? t('Save changes', 'تبدیلیاں محفوظ') : t('Save product', 'آئٹم محفوظ کریں')} onPress={save} />
    </Screen>
  );
}
