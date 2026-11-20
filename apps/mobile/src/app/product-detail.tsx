import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { margin } from '@/lib/product';
import { rs } from '@/lib/money';
import { shortDate } from '@/state/khata';
import { useProducts } from '@/state/products';
import { useSettings } from '@/state/settings';
import { useT } from '@/theme';
import { Badge, Button, Card, IconButton, Row, Screen, Text } from '@/ui/kit';
import { Header, Li, List, Progress, Stats, toast } from '@/ui/parts';

export default function ProductDetail() {
  const t = useT();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, moves, archive } = useProducts();
  const printer = useSettings((s) => s.printer);
  const p = items.find((x) => x.id === id);
  if (!p) return <Redirect href="/(tabs)/items" />;
  const m = margin(p.cost, p.price);
  const low = p.stock <= p.min;
  const mine = moves.filter((x) => x.productId === p.id).slice(0, 8);
  return (
    <Screen>
      <Header title={t(p.name, p.ur)} home="/(tabs)/items" right={<IconButton icon="list" label={t('Edit product', 'آئٹم ایڈیٹ')} onPress={() => router.push(`/product-form?id=${p.id}`)} />} />
      <Card shell>
        <Row justify="space-between"><Text v="label" c="fg3">{t('In stock', 'موجود')}</Text><Badge tone={low ? 'red' : 'grn'} label={low ? t('Low', 'کم') : t('Healthy', 'ٹھیک')} /></Row>
        <Text v="big" num style={{ marginVertical: 8 }}>{p.stock} <Text c="fg3">{p.unit}</Text></Text>
        <Progress pct={p.min ? (p.stock / (p.min * 3)) * 100 : 100} tone={low ? 'bad' : 'acc'} />
        <Text v="xs" c="fg3" style={{ marginTop: 8 }}>{t('Alert below', 'الرٹ حد')} {p.min}</Text>
      </Card>
      <Stats items={[[t('Sale price', 'فروخت'), rs(p.price)], [t('Cost', 'لاگت'), rs(p.cost)], [t('Profit', 'منافع'), `${m.pct}%`, 'accent']]} />
      <List>
        <Li title={t('Barcode', 'بارکوڈ')} right={<Text mono>{p.codes[0] ?? '-'}</Text>} />
        <Li title={t('Profit per unit', 'فی یونٹ منافع')} right={<Text w={600} num>{rs(m.amount)}</Text>} />
        {p.expiry ? <Li title={t('Expiry', 'ایکسپائری')} right={<Text num>{p.expiry}</Text>} /> : null}
      </List>
      <Text v="h2">{t('Recent movement', 'حالیہ حرکت')}</Text>
      {mine.length ? <List>{mine.map((x) => <Li key={x.id} title={x.why} sub={shortDate(x.at)} right={<Text w={600} num>{x.delta > 0 ? '+' : ''}{x.delta}</Text>} />)}</List>
        : <Text c="fg3">{t('No movement yet.', 'ابھی کوئی حرکت نہیں۔')}</Text>}
      <Row gap={10}>
        <View style={{ flex: 1 }}><Button label={t('Adjust stock', 'اسٹاک ایڈجسٹ')} onPress={() => router.push(`/adjust-stock?id=${p.id}`)} /></View>
        <View style={{ flex: 1 }}><Button kind="sec" icon="printer" label={t('Print label', 'لیبل')} onPress={() => toast(printer ? t('Printing needs the phone app build', 'پرنٹنگ فون ایپ میں ہوگی') : t('Connect a printer first', 'پہلے پرنٹر جوڑیں'))} /></View>
      </Row>
      <Button kind="ghost" label={t('Archive item', 'آئٹم آرکائیو کریں')} onPress={() => { archive(p.id); toast(t('Item archived. Past sales are kept.', 'آئٹم آرکائیو۔ پرانی فروخت محفوظ۔')); router.back(); }} />
    </Screen>
  );
}
