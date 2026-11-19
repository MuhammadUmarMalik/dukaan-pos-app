import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { CUSTOMERS } from '@/data/seed';
import { rs } from '@/lib/money';
import { cartTotals, useCart, type PayMode } from '@/state/cart';
import { useSettings } from '@/state/settings';
import { radius, useT, useTokens } from '@/theme';
import { Icon, type IconName } from '@/ui/icons';
import { Badge, Button, Card, Chip, Col, Hairline, IconButton, Row, Screen, Text } from '@/ui/kit';

export default function Pay() {
  const t = useT();
  const tk = useTokens();
  const router = useRouter();
  const { lines, discount, mode, received, customerId, set, complete } = useCart();
  const nextBill = useSettings((s) => s.nextBill);
  const { total } = cartTotals({ lines, discount });
  const customer = CUSTOMERS.find((c) => c.id === customerId);
  const got = received ?? total;
  const needCustomer = mode === 'khata' && !customer;
  const modes: { k: PayMode; label: string; icon: IconName }[] = [
    { k: 'cash', label: t('Cash', 'نقد'), icon: 'cash' }, { k: 'jazz', label: 'JazzCash', icon: 'phone' },
    { k: 'easy', label: 'Easypaisa', icon: 'phone' }, { k: 'bank', label: t('Bank', 'بینک'), icon: 'bank' },
    { k: 'khata', label: t('Khata', 'کھاتہ'), icon: 'book' },
  ];
  const quick = [...new Set([total, Math.ceil(total / 100000) * 100000, Math.ceil(total / 100000) * 100000 + 100000, 1000000])];
  return (
    <Screen>
      <Row justify="space-between">
        <IconButton icon="back" label={t('Back', 'واپس')} onPress={() => router.back()} />
        <Text v="h2">{t('Payment', 'ادائیگی')}</Text>
        <View style={{ width: 44 }} />
      </Row>
      <Col gap={6} style={{ alignItems: 'center', paddingVertical: 10 }}>
        <Text v="label" c="fg3">{t('Amount to collect', 'وصول کرنی رقم')}</Text>
        <Text v="big" num style={{ fontSize: 46, lineHeight: 52 }}>{rs(total)}</Text>
      </Col>
      <Row gap={10} wrap align="stretch">
        {modes.map((m) => {
          const on = mode === m.k;
          return (
            <Pressable key={m.k} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => set({ mode: m.k })}
              style={{ width: '48.5%', minHeight: 84, padding: 14, gap: 8, borderRadius: radius.lg, backgroundColor: on ? tk.accentSoft : tk.surface, borderWidth: on ? 2 : 1, borderColor: on ? tk.accent : tk.line }}>
              <Icon name={m.icon} color={on ? 'accent' : 'fg2'} />
              <Text w={600}>{m.label}</Text>
            </Pressable>
          );
        })}
      </Row>
      {mode === 'cash' ? (
        <Card>
          <Col gap={12}>
            <Row justify="space-between"><Text c="fg2">{t('Received', 'وصول')}</Text><Text v="h2" num>{rs(got)}</Text></Row>
            <Row gap={8} wrap>{quick.map((v) => <Chip key={v} label={rs(v)} on={got === v} onPress={() => set({ received: v })} />)}</Row>
            <Hairline />
            <Row justify="space-between"><Text c="fg2">{t('Change to return', 'واپس کرنی رقم')}</Text><Text v="h2" num c="accent">{rs(Math.max(0, got - total))}</Text></Row>
          </Col>
        </Card>
      ) : mode === 'khata' ? (
        <Card>
          {customer ? (
            <Col gap={4}><Text w={600}>{t(customer.name, customer.ur)}</Text><Text v="small" c="fg3" num>{t('Current due', 'موجودہ باقی')} {rs(customer.balance)} → {rs(customer.balance + total)}</Text></Col>
          ) : (
            <Row gap={12}>
              <View style={{ flex: 1 }}><Badge label={t('Customer needed', 'گاہک ضروری')} tone="red" /><Text v="small" c="fg3" style={{ marginTop: 6 }}>{t('Khata needs a customer name. Choose one in the cart.', 'کھاتے کے لیے گاہک چنیں۔')}</Text></View>
              <Button small block={false} kind="sec" label={t('Choose', 'منتخب')} onPress={() => router.back()} />
            </Row>
          )}
        </Card>
      ) : null}
      <Button label={t('Confirm and print', 'تصدیق اور پرنٹ')} disabled={needCustomer || got < total && mode === 'cash'}
        onPress={() => { complete(nextBill()); router.replace('/receipt'); }} />
    </Screen>
  );
}
