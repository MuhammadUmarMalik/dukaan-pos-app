import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { lineTotal, rs } from '@/lib/money';
import { useBooks } from '@/state/books';
import { shortDate, useKhata } from '@/state/khata';
import { useProducts } from '@/state/products';
import { radius, useRtl, useT, useTokens } from '@/theme';
import { Icon } from '@/ui/icons';
import { Button, Card, Col, Row, Screen, Text } from '@/ui/kit';
import { Header, Li, List, Pick, Stepper } from '@/ui/parts';

export default function Returns() {
  const t = useT();
  const tk = useTokens();
  const rtl = useRtl();
  const router = useRouter();
  const { sales, returns, addReturn } = useBooks();
  const move = useProducts((s) => s.move);
  const { parties, entry } = useKhata();
  const [q, setQ] = useState('');
  const [bill, setBill] = useState<string | null>(null);
  const [n, setN] = useState<Record<number, number>>({});
  const [how, setHow] = useState<'cash' | 'khata' | 'swap'>('cash');
  const [reason, setReason] = useState('Wrong item');
  const sale = sales.find((s) => s.bill === bill);
  const done = returns.filter((r) => r.bill === bill).reduce((a, r) => a + r.amount, 0);
  const found = sales.filter((s) => q.trim() && (s.bill.toLowerCase().includes(q.trim().toLowerCase()) || (parties.find((p) => p.id === s.customerId)?.name ?? '').toLowerCase().includes(q.trim().toLowerCase()))).slice(0, 6);
  const total = sale ? sale.lines.reduce((a, l, i) => a + lineTotal({ qty: n[i] ?? 0, price: l.price }), 0) : 0;
  const can = !!sale && total > 0 && total <= sale.total - done && (how !== 'khata' || !!sale.customerId);

  const save = () => {
    if (!sale) return;
    sale.lines.forEach((l, i) => { if (n[i] && l.productId) move(l.productId, n[i], `Return ${sale.bill}`); });
    if (how === 'khata' && sale.customerId) entry(sale.customerId, { note: `Return ${sale.bill}`, amount: -total });
    addReturn({ bill: sale.bill, amount: total, how, reason });
    router.back();
  };

  return (
    <Screen>
      <Header title={t('Sale return', 'فروخت واپسی')} />
      <Row gap={10} style={{ height: 52, paddingHorizontal: 14, borderRadius: radius.md - 1, backgroundColor: tk.surface, borderWidth: 1, borderColor: tk.line2 }}>
        <Icon name="search" size={18} color="fg3" />
        <TextInput accessibilityLabel={t('Find bill', 'بل تلاش')} value={q} onChangeText={(s) => { setQ(s); setBill(null); setN({}); }} placeholder={t('Bill number or customer', 'بل نمبر یا گاہک')} placeholderTextColor={tk.fg3}
          style={{ flex: 1, height: '100%', color: tk.fg, fontSize: 15, textAlign: rtl ? 'right' : 'left' }} />
      </Row>
      {!sale ? (
        found.length ? <List>{found.map((s) => <Li key={s.bill} icon="receipt" title={s.bill} sub={shortDate(s.at)} right={<Text w={600} num>{rs(s.total)}</Text>} onPress={() => setBill(s.bill)} />)}</List>
          : <Text c="fg3" style={{ textAlign: 'center', padding: 16 }}>{sales.length ? t('Type a bill number like D0-000012.', 'بل نمبر لکھیں جیسے D0-000012۔') : t('No sales on this phone yet.', 'اس فون پر ابھی کوئی فروخت نہیں۔')}</Text>
      ) : (
        <>
          <Card><Row justify="space-between"><View><Text w={600}>{sale.bill}</Text><Text v="small" c="fg3">{shortDate(sale.at)}{done ? ` · ${t('Returned', 'واپس')} ${rs(done)}` : ''}</Text></View><Text w={600} num>{rs(sale.total)}</Text></Row></Card>
          <Text v="h2">{t('Items to return', 'واپس کے آئٹمز')}</Text>
          <List>
            {sale.lines.map((l, i) => {
              const k = n[i] ?? 0;
              return (
                <Li key={i} title={t(l.name, l.ur)} sub={`${t('Bought', 'خریدا')} ${l.qty} · ${rs(l.price)}`}
                  right={k ? <Stepper value={k} label={l.name} onStep={(d) => setN((x) => ({ ...x, [i]: Math.min(l.qty, Math.max(0, k + d)) }))} />
                    : <Pressable accessibilityRole="button" accessibilityLabel={`${t('Return', 'واپس')} ${l.name}`} onPress={() => setN((x) => ({ ...x, [i]: Math.min(1, l.qty) }))} style={{ minHeight: 44, justifyContent: 'center' }}><Text c="accentInk" w={600}>{t('Return', 'واپس')}</Text></Pressable>} />
              );
            })}
          </List>
          <Col gap={8}><Text v="small" c="fg2" w={500}>{t('Refund as', 'واپسی کیسے')}</Text><Pick value={how} onChange={setHow} options={[['cash', t('Cash back', 'نقد واپس')], ['khata', t('Khata credit', 'کھاتے میں')], ['swap', t('Exchange', 'تبدیلی')]]} /></Col>
          <Col gap={8}><Text v="small" c="fg2" w={500}>{t('Reason', 'وجہ')}</Text><Pick value={reason} onChange={setReason} options={[['Wrong item', t('Wrong item', 'غلط آئٹم')], ['Damaged', t('Damaged', 'خراب')], ['Changed mind', t('Changed mind', 'ارادہ بدلا')]]} /></Col>
          <Card><Row justify="space-between"><Text v="h2">{t('Refund total', 'کل واپسی')}</Text><Text v="title" num style={{ fontSize: 26 }}>{rs(total)}</Text></Row></Card>
          <Button label={t('Confirm return', 'واپسی تصدیق')} disabled={!can} onPress={save} />
        </>
      )}
    </Screen>
  );
}
