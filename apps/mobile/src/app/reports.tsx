import { useState } from 'react';
import { View } from 'react-native';
import { rs } from '@/lib/money';
import { shareText } from '@/lib/share';
import { useBooks } from '@/state/books';
import { useKhata } from '@/state/khata';
import { useProducts } from '@/state/products';
import { useT, useTokens, type Tokens } from '@/theme';
import { Card, IconButton, Row, Screen, Text } from '@/ui/kit';
import { Header, Li, List, Seg, Stats } from '@/ui/parts';

const DAY = 86_400_000;
type Period = 'today' | 'week' | 'month';

// ponytail: reports are computed from this phone's last 500 sales. With sync, the same numbers come from daily rollup documents.
export default function Reports() {
  const t = useT();
  const tk = useTokens();
  const [p, setP] = useState<Period>('week');
  const { sales, expenses } = useBooks();
  const items = useProducts((s) => s.items);
  const parties = useKhata((s) => s.parties);
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const n = p === 'today' ? 1 : p === 'week' ? 7 : 30;
  const from = start.getTime() - (n - 1) * DAY;
  const S = sales.filter((s) => s.at >= from);
  const total = S.reduce((a, s) => a + s.total, 0);
  const cost = S.reduce((a, s) => a + s.lines.reduce((b, l) => b + Math.round(l.qty * (items.find((x) => x.id === l.productId)?.cost ?? l.price)), 0), 0);
  const spent = expenses.filter((e) => e.at >= from).reduce((a, e) => a + e.amount, 0);
  const credit = parties.filter((x) => x.kind === 'customer').flatMap((x) => x.entries).filter((e) => e.at >= from && e.amount > 0).reduce((a, e) => a + e.amount, 0);
  // Bars: one per day (hour blocks for today).
  const buckets = p === 'today'
    ? Array.from({ length: 8 }, (_, i) => S.filter((s) => Math.floor(new Date(s.at).getHours() / 3) === i).reduce((a, s) => a + s.total, 0))
    : Array.from({ length: n }, (_, i) => S.filter((s) => Math.floor((s.at - from) / DAY) === i).reduce((a, s) => a + s.total, 0));
  const max = Math.max(1, ...buckets);
  const modes: [string, string, keyof Tokens][] = [['cash', t('Cash', 'نقد'), 'accent'], ['jazz', 'JazzCash', 'blueFg'], ['easy', 'Easypaisa', 'yelFg'], ['bank', t('Bank', 'بینک'), 'fg3'], ['khata', t('Khata', 'کھاتہ'), 'redFg'], ['split', t('Split', 'تقسیم'), 'fg2']];
  const byMode = modes.map(([k, l, c]) => ({ l, c, v: S.filter((s) => s.mode === k).reduce((a, s) => a + s.total, 0) })).filter((m) => m.v);
  const top = Object.entries(S.flatMap((s) => s.lines).reduce<Record<string, number>>((a, l) => ({ ...a, [l.name]: (a[l.name] ?? 0) + l.qty }), {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const csv = ['bill,date,mode,total', ...S.map((s) => `${s.bill},${new Date(s.at).toISOString()},${s.mode},${s.total / 100}`)].join('\n');
  return (
    <Screen>
      <Header title={t('Reports', 'رپورٹس')} right={<IconButton icon="down" label={t('Export sales', 'فروخت ایکسپورٹ')} onPress={() => shareText(csv, 'sales.csv')} />} />
      <Seg value={p} onChange={setP} options={[['today', t('Today', 'آج')], ['week', t('Week', 'ہفتہ')], ['month', t('Month', 'مہینہ')]]} />
      <Card shell>
        <Text v="label" c="fg3">{t('Sales', 'فروخت')}</Text>
        <Text v="big" num style={{ marginTop: 6, marginBottom: 16 }}>{rs(total)}</Text>
        <Row gap={buckets.length > 10 ? 2 : 7} align="flex-end" style={{ height: 100, borderBottomWidth: 1, borderBottomColor: tk.line2 }}>
          {buckets.map((v, i) => <View key={i} style={{ flex: 1, height: `${Math.max(2, (v / max) * 100)}%`, borderRadius: 4, backgroundColor: i === buckets.length - 1 ? tk.accent : tk.surface2, borderWidth: 1, borderColor: tk.line }} />)}
        </Row>
        <Text v="xs" c="fg3" style={{ marginTop: 6 }}>{p === 'today' ? t('Every 3 hours', 'ہر 3 گھنٹے') : t(`Last ${n} days`, `پچھلے ${n} دن`)} · {S.length} {t('bills', 'بل')}</Text>
      </Card>
      <Stats items={[[t('Profit', 'منافع'), rs(total - cost), 'accent'], [t('Expenses', 'اخراجات'), rs(spent)], [t('Given on khata', 'کھاتہ دیا'), rs(credit)]]} />
      {byMode.length ? (
        <Card>
          <Text v="h2" style={{ marginBottom: 12 }}>{t('How customers paid', 'ادائیگی کا طریقہ')}</Text>
          <Row gap={2} style={{ height: 10, borderRadius: 8, overflow: 'hidden', flexDirection: 'row' }}>
            {byMode.map((m) => <View key={m.l} style={{ flex: m.v, backgroundColor: tk[m.c] }} />)}
          </Row>
          <View style={{ gap: 8, marginTop: 12 }}>
            {byMode.map((m) => <Row key={m.l} justify="space-between"><Row gap={8}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tk[m.c] }} /><Text v="small">{m.l}</Text></Row><Text v="small" c="fg2" num>{Math.round((m.v / total) * 100)}%</Text></Row>)}
          </View>
        </Card>
      ) : null}
      <Text v="h2">{t('Top items', 'سب سے زیادہ بکنے والے')}</Text>
      {top.length ? <List>{top.map(([name, q]) => <Li key={name} title={name} right={<Text c="fg3" num>{Math.round(q * 100) / 100} {t('sold', 'فروخت')}</Text>} />)}</List>
        : <Text c="fg3">{t('No sales in this period yet.', 'اس مدت میں ابھی کوئی فروخت نہیں۔')}</Text>}
    </Screen>
  );
}
