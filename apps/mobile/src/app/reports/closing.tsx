import { useLocalSearchParams, useRouter } from 'expo-router';
import { cashExpected } from '@/lib/books';
import { rs } from '@/lib/money';
import { buckets, sumBy, within, type PeriodKind } from '@/lib/reports';
import { shareText } from '@/lib/share';
import { useBooks } from '@/state/books';
import { useKhata } from '@/state/khata';
import { useT, type Tokens } from '@/theme';
import { Button, Card, Col, Hairline, IconButton, Row, Screen, Text } from '@/ui/kit';
import { Header, Li, List, Note, Stats } from '@/ui/parts';
import { Breakdown, PeriodBar, Section, usePeriod } from '@/ui/report';

/** Daily, weekly and monthly closing. A week or month is the sum of its days, with each day's count shown. */
export default function Closing() {
  const t = useT();
  const router = useRouter();
  const { kind: k0 } = useLocalSearchParams<{ kind?: PeriodKind }>();
  const p = usePeriod(k0 === 'week' || k0 === 'month' ? k0 : 'day');
  const { sales, expenses, closings, returns } = useBooks();
  const parties = useKhata((s) => s.parties);
  const cashOut = (kind: 'customer' | 'supplier', r: { from: number; to: number }) =>
    -sumBy(parties.filter((x) => x.kind === kind).flatMap((x) => x.entries).filter((e) => within(e.at, r) && e.mode === 'Cash' && e.amount < 0), (e) => e.amount);

  /** One period's cash book. Opening is the cash counted at the last closing before it. */
  const book = (r: { from: number; to: number }) => {
    const S = sales.filter((s) => within(s.at, r));
    const cashSales = sumBy(S, (s) => (s.mode === 'cash' ? s.total : s.mode === 'split' ? s.split?.cash ?? 0 : 0));
    const cashBack = sumBy(returns.filter((x) => within(x.at, r) && x.how === 'cash'), (x) => x.amount);
    const opening = closings.find((c) => c.at < r.from)?.counted ?? 0;
    const received = cashOut('customer', r);
    const supplierPaid = cashOut('supplier', r);
    const spent = sumBy(expenses.filter((e) => within(e.at, r) && e.from === 'Cash'), (e) => e.amount);
    const expected = cashExpected({ opening, cashSales: cashSales - cashBack, received, expenses: spent, supplierPaid });
    const closing = closings.find((c) => within(c.at, r)); // newest first, so this is the last count in the period
    return { S, opening, cashSales, cashBack, received, supplierPaid, spent, expected, counted: closing?.counted ?? null };
  };

  const b = book(p);
  const modeName: Record<string, string> = { cash: t('Cash', 'نقد'), jazz: 'JazzCash', easy: 'Easypaisa', bank: t('Bank', 'بینک'), khata: t('Khata', 'کھاتہ'), split: t('Split', 'تقسیم') };
  const sold = sumBy(b.S, (s) => s.total);
  const days = p.kind === 'day' ? [] : buckets(p.kind, p.from, p.to).filter(([a]) => a <= Date.now()).map(([from, to]) => ({ from, ...book({ from, to }) })).reverse();
  const diff = b.counted === null ? null : b.counted - b.expected;
  const counted = days.filter((d) => d.counted !== null);
  const totalDiff = sumBy(counted, (d) => d.counted! - d.expected);
  const line = (k: string, v: number, c: keyof Tokens = 'fg', bold = false) => (
    <Row key={k} justify="space-between" style={{ minHeight: 34 }}><Text w={bold ? 600 : 400} c={bold ? 'fg' : 'fg2'}>{k}</Text><Text w={bold ? 700 : 500} num c={c}>{v < 0 ? '- ' : ''}{rs(Math.abs(v))}</Text></Row>
  );
  const title = p.kind === 'day' ? t('Daily closing', 'روزانہ کلوزنگ') : p.kind === 'week' ? t('Weekly closing', 'ہفتہ وار کلوزنگ') : t('Monthly closing', 'ماہانہ کلوزنگ');
  const text = [title, p.label, `Sales ${rs(sold)} (${b.S.length} bills)`, `Cash sales ${rs(b.cashSales)}`, `Khata received ${rs(b.received)}`, `Expenses ${rs(b.spent)}`, `Supplier payments ${rs(b.supplierPaid)}`, `Cash expected ${rs(b.expected)}`, b.counted !== null ? `Counted ${rs(b.counted)}` : ''].filter(Boolean).join('\n');
  return (
    <Screen>
      <Header title={title} home="/reports" right={<IconButton icon="chat" label={t('Share', 'شیئر')} onPress={() => shareText(text, title)} />} />
      <PeriodBar p={p} />
      <Stats items={[[t('Sales', 'فروخت'), rs(sold)], [t('Bills', 'بل'), String(b.S.length)], [t('Returns', 'واپسی'), rs(sumBy(returns.filter((x) => within(x.at, p)), (x) => x.amount))]]} />
      <Card>
        <Col gap={2}>
          {line(t('Opening cash', 'ابتدائی نقد'), b.opening)}
          {line(t('Cash sales', 'نقد فروخت'), b.cashSales)}
          {b.cashBack ? line(t('Cash refunds', 'نقد واپسی'), -b.cashBack) : null}
          {line(t('Khata received in cash', 'کھاتہ وصولی نقد'), b.received)}
          {line(t('Expenses paid', 'ادا اخراجات'), -b.spent)}
          {line(t('Supplier payments', 'سپلائر ادائیگی'), -b.supplierPaid)}
          <Hairline />
          {line(t('Cash expected', 'متوقع نقد'), b.expected, 'fg', true)}
          {p.kind === 'day' && b.counted !== null ? line(t('Cash counted', 'گنی ہوئی نقد'), b.counted) : null}
          {p.kind === 'day' && diff !== null ? line(t('Difference', 'فرق'), diff, diff < 0 ? 'redFg' : diff > 0 ? 'accent' : 'fg', true) : null}
        </Col>
      </Card>
      <Breakdown title={t('Sales by payment method', 'ادائیگی کے حساب سے فروخت')} rows={Object.entries(b.S.reduce<Record<string, number>>((a, s) => ({ ...a, [modeName[s.mode]]: (a[modeName[s.mode]] ?? 0) + s.total }), {})).sort((x, y) => y[1] - x[1])} />
      {p.kind === 'day' ? (
        b.counted === null && p.offset === 0
          ? <Button label={t('Count cash and close the day', 'نقد گنیں اور دن بند کریں')} onPress={() => router.push('/cash-close')} />
          : b.counted === null ? <Note text={t('This day was not closed.', 'یہ دن بند نہیں کیا گیا۔')} /> : null
      ) : (
        <>
          <Stats items={[[t('Days closed', 'بند دن'), `${counted.length} / ${days.length}`], [t('Total difference', 'کل فرق'), `${totalDiff < 0 ? '- ' : ''}${rs(Math.abs(totalDiff))}`, totalDiff < 0 ? 'redFg' : 'fg']]} />
          <Section title={t('Day by day', 'دن بہ دن')}>
            <List>{days.map((d) => {
              const df = d.counted === null ? null : d.counted - d.expected;
              return <Li key={d.from} title={new Date(d.from).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}
                sub={`${t('Sales', 'فروخت')} ${rs(sumBy(d.S, (s) => s.total))} · ${t('Expected', 'متوقع')} ${rs(d.expected)}`}
                right={<Text w={600} num c={df === null ? 'fg3' : df < 0 ? 'redFg' : 'fg'}>{df === null ? t('Not closed', 'بند نہیں') : `${df < 0 ? '- ' : df > 0 ? '+ ' : ''}${rs(Math.abs(df))}`}</Text>} />;
            })}</List>
          </Section>
        </>
      )}
    </Screen>
  );
}
