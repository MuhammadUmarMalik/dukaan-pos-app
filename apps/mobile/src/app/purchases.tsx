import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { rs } from '@/lib/money';
import { useBooks } from '@/state/books';
import { due, shortDate, useKhata } from '@/state/khata';
import { useProducts } from '@/state/products';
import { useT } from '@/theme';
import { Badge, Button, Card, Row, Screen, Text } from '@/ui/kit';
import { Header, Li, List, Stats } from '@/ui/parts';

export default function Purchases() {
  const t = useT();
  const router = useRouter();
  const purchases = useBooks((s) => s.purchases);
  const parties = useKhata((s) => s.parties);
  const low = useProducts((s) => s.items).filter((p) => !p.archived && p.stock <= p.min).length;
  const payable = parties.filter((p) => p.kind === 'supplier').reduce((a, p) => a + Math.max(0, due(p)), 0);
  const month = new Date().getMonth();
  const thisMonth = purchases.filter((p) => new Date(p.at).getMonth() === month).reduce((a, p) => a + p.total, 0);
  return (
    <Screen>
      <Header title={t('Purchases', 'خریداری')} />
      {low ? (
        <Card pad={0}>
          <Li icon="alert" tone="yel" title={t(`${low} items to reorder`, `${low} آئٹمز دوبارہ منگوانے ہیں`)} sub={t('Based on stock alerts', 'اسٹاک الرٹس کے مطابق')}
            right={<Button small block={false} label={t('Create PO', 'آرڈر')} onPress={() => router.push('/po')} />} />
        </Card>
      ) : null}
      <Stats items={[[t('Payable', 'واجب الادا'), rs(payable)], [t('This month', 'اس ماہ'), rs(thisMonth)]]} />
      {purchases.length ? (
        <List>
          {purchases.map((p) => {
            const s = parties.find((x) => x.id === p.supplierId);
            const paid = p.paid >= p.total;
            return <Li key={p.id} icon="truck" title={s ? t(s.name, s.ur) : '-'} sub={`${p.no} · ${shortDate(p.at)}`}
              right={<View style={{ alignItems: 'flex-end', gap: 4 }}><Text w={600} num>{rs(p.total)}</Text><Badge tone={paid ? 'grn' : 'yel'} label={paid ? t('Paid', 'ادا') : t('Due', 'باقی')} /></View>} />;
          })}
        </List>
      ) : <Text c="fg3" style={{ textAlign: 'center', padding: 20 }}>{t('No purchases yet.', 'ابھی کوئی خریداری نہیں۔')}</Text>}
      <Button label={t('New purchase', 'نئی خریداری')} onPress={() => router.push('/new-purchase')} />
      <Row gap={10}><View style={{ flex: 1 }}><Button kind="ghost" icon="users" label={t('Suppliers', 'سپلائرز')} onPress={() => router.push('/(tabs)/khata')} /></View></Row>
    </Screen>
  );
}
