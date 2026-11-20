import { rs } from '@/lib/money';
import { shareText } from '@/lib/share';
import { saleCost, sumBy, totalsBy, within } from '@/lib/reports';
import { useBooks } from '@/state/books';
import { shortDate, useKhata } from '@/state/khata';
import { useProducts } from '@/state/products';
import { useT } from '@/theme';
import { IconButton, Screen, Text } from '@/ui/kit';
import { Header, Li, List, Stats } from '@/ui/parts';
import { Breakdown, PeriodBar, Section, TotalChart, usePeriod } from '@/ui/report';

export default function SalesReport() {
  const t = useT();
  const p = usePeriod('day');
  const { sales, returns } = useBooks();
  const items = useProducts((s) => s.items);
  const parties = useKhata((s) => s.parties);
  const S = sales.filter((s) => within(s.at, p));
  const R = returns.filter((r) => within(r.at, p));
  const gross = sumBy(S, (s) => s.total);
  const back = sumBy(R, (r) => r.amount);
  const disc = sumBy(S, (s) => s.discount);
  const cost = sumBy(S, (s) => saleCost(s.lines, (id) => items.find((x) => x.id === id)?.cost));
  const modeName: Record<string, string> = { cash: t('Cash', 'نقد'), jazz: 'JazzCash', easy: 'Easypaisa', bank: t('Bank', 'بینک'), khata: t('Khata', 'کھاتہ'), split: t('Split', 'تقسیم') };
  const byMode = totalsBy(S, (s) => modeName[s.mode], (s) => s.total);
  const top = totalsBy(S.flatMap((s) => s.lines), (l) => t(l.name, l.ur), (l) => Math.round(l.qty * l.price)).slice(0, 8);
  const byCustomer = totalsBy(S.filter((s) => s.customerId), (s) => parties.find((x) => x.id === s.customerId)?.name ?? '-', (s) => s.total).slice(0, 5);
  const csv = ['bill,date,customer,mode,subtotal,discount,total', ...S.map((s) => `${s.bill},${new Date(s.at).toISOString()},"${parties.find((x) => x.id === s.customerId)?.name ?? ''}",${s.mode},${s.subtotal / 100},${s.discount / 100},${s.total / 100}`)].join('\n');
  return (
    <Screen>
      <Header title={t('Sales report', 'فروخت رپورٹ')} home="/reports" right={<IconButton icon="down" label={t('Export', 'ایکسپورٹ')} onPress={() => shareText(csv, 'sales.csv')} />} />
      <PeriodBar p={p} />
      <TotalChart p={p} label={t('Net sales', 'خالص فروخت')} total={gross - back} value={(a, b) => sumBy(S.filter((s) => s.at >= a && s.at < b), (s) => s.total)}
        foot={`${S.length} ${t('bills', 'بل')} · ${t('average', 'اوسط')} ${rs(S.length ? Math.round(gross / S.length) : 0)}`} />
      <Stats items={[[t('Gross profit', 'مجموعی منافع'), rs(gross - back - cost), 'accent'], [t('Discounts', 'رعایت'), rs(disc)], [t('Returns', 'واپسی'), rs(back), back ? 'redFg' : 'fg']]} />
      <Breakdown title={t('How customers paid', 'ادائیگی کا طریقہ')} rows={byMode} />
      <Section title={t('Top items', 'سب سے زیادہ بکنے والے')}>
        {top.length ? <List>{top.map(([n, v]) => <Li key={n} title={n} right={<Text w={600} num>{rs(v)}</Text>} />)}</List> : <Text c="fg3">{t('No sales in this period.', 'اس مدت میں کوئی فروخت نہیں۔')}</Text>}
      </Section>
      {byCustomer.length ? <Section title={t('Top customers', 'سرفہرست گاہک')}><List>{byCustomer.map(([n, v]) => <Li key={n} title={n} right={<Text w={600} num>{rs(v)}</Text>} />)}</List></Section> : null}
      <Section title={t('Bills', 'بل')}>
        {S.length ? <List>{S.slice(0, 30).map((s) => <Li key={s.bill} title={s.bill} sub={`${shortDate(s.at)} ${new Date(s.at).toTimeString().slice(0, 5)} · ${modeName[s.mode]}`} right={<Text w={600} num>{rs(s.total)}</Text>} />)}</List> : <Text c="fg3">-</Text>}
      </Section>
    </Screen>
  );
}
