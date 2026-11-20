import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { rs } from '@/lib/money';
import { cartTotals, useCart, type Discount } from '@/state/cart';
import { useBooks } from '@/state/books';
import { useKhata } from '@/state/khata';
import { useProducts } from '@/state/products';
import { useT, useTokens } from '@/theme';
import { Icon } from '@/ui/icons';
import { Button, Card, Chip, Col, Hairline, IconButton, Row, Screen, Text } from '@/ui/kit';

const same = (a: Discount, b: Discount) => a.kind === b.kind && a.value === b.value;

function Stepper({ qty, onStep }: { qty: number | string; onStep: (d: number) => void }) {
  const tk = useTokens();
  return (
    <Row gap={0} style={{ borderRadius: 12, backgroundColor: tk.surface2, borderWidth: 1, borderColor: tk.line }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Less" onPress={() => onStep(-1)} style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}><Icon name="minus" size={18} /></Pressable>
      <Text w={600} num style={{ minWidth: 24, textAlign: 'center' }}>{qty}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="More" onPress={() => onStep(1)} style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" size={18} /></Pressable>
    </Row>
  );
}

export default function Cart() {
  const t = useT();
  const router = useRouter();
  const { lines, customerId, discount, step, clear, set, hold } = useCart();
  const held = useBooks((s) => s.held.length);
  const customers = useKhata((s) => s.parties).filter((p) => p.kind === 'customer' && !p.archived);
  const products = useProducts((s) => s.items);
  const { subtotal, discount: disc, total } = cartTotals({ lines, discount });
  const discounts: { d: Discount; label: string }[] = [
    { d: { kind: 'amount', value: 0 }, label: t('None', 'کوئی نہیں') },
    { d: { kind: 'amount', value: 5000 }, label: 'Rs 50' },
    { d: { kind: 'amount', value: 10000 }, label: 'Rs 100' },
    { d: { kind: 'pct', value: 5 }, label: '5%' },
  ];
  return (
    <Screen>
      <Row justify="space-between">
        <IconButton icon="back" label={t('Back', 'واپس')} onPress={() => router.back()} />
        <Text v="h2">{t('Cart', 'کارٹ')}</Text>
        <IconButton icon="x" label={t('Clear cart', 'کارٹ خالی')} onPress={() => { clear(); router.back(); }} />
      </Row>
      <Card pad={0}>
        {lines.length ? lines.map((l, i) => {
          const p = products.find((x) => x.id === l.productId)!;
          const q = p.unit === 'kg' ? `${l.qty} kg` : l.qty;
          return (
            <View key={l.productId}>
              {i ? <Hairline /> : null}
              <Row gap={10} style={{ paddingHorizontal: 16, paddingVertical: 12, minHeight: 66 }}>
                <View style={{ flex: 1 }}><Text w={500} numberOfLines={1}>{t(p.name, p.ur)}</Text><Text v="small" c="fg3" num>{rs(p.price)}</Text></View>
                <Stepper qty={q} onStep={(d) => step(l.productId, p.unit === 'kg' ? d * 0.25 : d)} />
                <Text w={600} num style={{ minWidth: 72, textAlign: 'right' }}>{rs(Math.round(p.price * l.qty))}</Text>
              </Row>
            </View>
          );
        }) : <View style={{ padding: 30 }}><Text c="fg3" style={{ textAlign: 'center' }}>{t('Cart is empty. Tap items to add.', 'کارٹ خالی ہے۔ آئٹم ٹیپ کریں۔')}</Text></View>}
      </Card>
      <Col gap={8}>
        <Text v="label" c="fg3">{t('Customer', 'گاہک')}</Text>
        <Row gap={8} wrap>
          <Chip label={t('Walk-in', 'عام گاہک')} on={customerId === null} onPress={() => set({ customerId: null })} />
          {customers.slice(0, 6).map((c) => <Chip key={c.id} label={t(c.name, c.ur)} on={customerId === c.id} onPress={() => set({ customerId: c.id })} />)}
        </Row>
      </Col>
      <Col gap={8}>
        <Text v="label" c="fg3">{t('Discount', 'رعایت')}</Text>
        <Row gap={8} wrap>{discounts.map((x) => <Chip key={x.label} label={x.label} on={same(discount, x.d)} onPress={() => set({ discount: x.d })} />)}</Row>
      </Col>
      <Card>
        <Col gap={8}>
          <Row justify="space-between"><Text c="fg2">{t('Subtotal', 'ذیلی کل')}</Text><Text c="fg2" num>{rs(subtotal)}</Text></Row>
          <Row justify="space-between"><Text c="fg2">{t('Discount', 'رعایت')}</Text><Text c="fg2" num>- {rs(disc)}</Text></Row>
          <Hairline />
          <Row justify="space-between"><Text v="h2">{t('Total', 'کل')}</Text><Text v="title" num style={{ fontSize: 26 }}>{rs(total)}</Text></Row>
        </Col>
      </Card>
      {held ? <Button kind="ghost" icon="pause" label={`${t('Held bills', 'روکے ہوئے بل')} (${held})`} onPress={() => router.push('/held')} /> : null}
      <Row gap={10}>
        <Button kind="sec" block={false} icon="pause" label={t('Hold', 'روکیں')} disabled={!lines.length} onPress={() => { hold(); router.push('/held'); }} />
        <View style={{ flex: 1 }}><Button label={`${t('Pay', 'ادائیگی')} ${rs(total)}`} disabled={!lines.length} onPress={() => router.push('/pay')} /></View>
      </Row>
    </Screen>
  );
}
