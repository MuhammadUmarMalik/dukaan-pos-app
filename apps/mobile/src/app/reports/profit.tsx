import { rs } from '@/lib/money';
import { pct, saleCost, sumBy, totalsBy, within } from '@/lib/reports';
import { useBooks } from '@/state/books';
import { useProducts } from '@/state/products';
import { useT, type Tokens } from '@/theme';
import { Card, Col, Hairline, Row, Screen, Text } from '@/ui/kit';
import { Header, Li, List, Note } from '@/ui/parts';
import { PeriodBar, Section, TotalChart, usePeriod } from '@/ui/report';

/** Profit and loss: sales - returns - cost of goods - expenses. */
export default function ProfitReport() {
  const t = useT();
  const p = usePeriod('month');
  const { sales, returns, expenses } = useBooks();
  const items = useProducts((s) => s.items);
  const costOf = (id: string) => items.find((x) => x.id === id)?.cost;
  const S = sales.filter((s) => within(s.at, p));
  const sold = sumBy(S, (s) => s.total);
  const back = sumBy(returns.filter((r) => within(r.at, p)), (r) => r.amount);
  const cogs = sumBy(S, (s) => saleCost(s.lines, costOf));
  const E = expenses.filter((e) => within(e.at, p));
  const spent = sumBy(E, (e) => e.amount);
  const gross = sold - back - cogs;
  const net = gross - spent;
  const line = (k: string, v: number, c: keyof Tokens = 'fg', bold = false) => (
    <Row key={k} justify="space-between" style={{ minHeight: 34 }}><Text w={bold ? 600 : 400} c={bold ? 'fg' : 'fg2'}>{k}</Text><Text w={bold ? 700 : 500} num c={c}>{v < 0 ? '- ' : ''}{rs(Math.abs(v))}</Text></Row>
  );
  const profitByItem = totalsBy(S.flatMap((s) => s.lines), (l) => t(l.name, l.ur), (l) => Math.round(l.qty * (l.price - ((l.productId ? costOf(l.productId) : undefined) ?? l.price)))).slice(0, 6);
  return (
    <Screen>
      <Header title={t('Profit and loss', 'نفع و نقصان')} home="/reports" />
      <PeriodBar p={p} />
      <TotalChart p={p} label={t('Net profit', 'خالص منافع')} total={net}
        value={(a, b) => sumBy(S.filter((s) => s.at >= a && s.at < b), (s) => s.total - saleCost(s.lines, costOf))}
        foot={t(`Margin ${pct(net, sold - back)}% of net sales`, `خالص فروخت کا ${pct(net, sold - back)}% منافع`)} />
      <Card>
        <Col gap={2}>
          {line(t('Sales', 'فروخت'), sold)}
          {line(t('Returns', 'واپسی'), -back)}
          {line(t('Cost of goods sold', 'فروخت شدہ مال کی لاگت'), -cogs)}
          <Hairline />
          {line(t('Gross profit', 'مجموعی منافع'), gross, gross < 0 ? 'redFg' : 'fg', true)}
          {line(t('Expenses', 'اخراجات'), -spent)}
          <Hairline />
          {line(t('Net profit', 'خالص منافع'), net, net < 0 ? 'redFg' : 'accent', true)}
        </Col>
      </Card>
      {profitByItem.length ? <Section title={t('Most profitable items', 'سب سے زیادہ منافع والے')}><List>{profitByItem.map(([n, v]) => <Li key={n} title={n} right={<Text w={600} num c={v < 0 ? 'redFg' : 'accent'}>{rs(v)}</Text>} />)}</List></Section> : null}
      <Note tone="blue" text={t('Cost uses each item\'s current cost price. Purchases are stock, not expenses, so they do not lower profit until the goods are sold.', 'لاگت ہر آئٹم کی موجودہ خرید قیمت سے۔ خریداری اسٹاک ہے، خرچ نہیں، اس لیے بکنے تک منافع کم نہیں کرتی۔')} />
    </Screen>
  );
}
