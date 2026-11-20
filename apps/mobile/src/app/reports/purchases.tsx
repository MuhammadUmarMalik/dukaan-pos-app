import { lineTotal, rs } from '@/lib/money';
import { shareText } from '@/lib/share';
import { sumBy, totalsBy, within } from '@/lib/reports';
import { useBooks } from '@/state/books';
import { shortDate, useKhata } from '@/state/khata';
import { useProducts } from '@/state/products';
import { useT } from '@/theme';
import { Badge, IconButton, Screen, Text } from '@/ui/kit';
import { Header, Li, List, Stats } from '@/ui/parts';
import { Breakdown, PeriodBar, Section, TotalChart, usePeriod } from '@/ui/report';

export default function PurchasesReport() {
  const t = useT();
  const p = usePeriod('month');
  const purchases = useBooks((s) => s.purchases);
  const parties = useKhata((s) => s.parties);
  const items = useProducts((s) => s.items);
  const P = purchases.filter((x) => within(x.at, p));
  const total = sumBy(P, (x) => x.total);
  const paid = sumBy(P, (x) => x.paid);
  const sup = (id: string) => { const s = parties.find((x) => x.id === id); return s ? t(s.name, s.ur) : '-'; };
  const name = (id: string) => { const x = items.find((i) => i.id === id); return x ? t(x.name, x.ur) : '-'; };
  const topItems = totalsBy(P.flatMap((x) => x.lines), (l) => name(l.productId), (l) => lineTotal({ qty: l.qty, price: l.cost })).slice(0, 8);
  const csv = ['no,date,supplier,total,paid', ...P.map((x) => `${x.no},${new Date(x.at).toISOString()},"${sup(x.supplierId)}",${x.total / 100},${x.paid / 100}`)].join('\n');
  return (
    <Screen>
      <Header title={t('Purchase report', 'خریداری رپورٹ')} home="/reports" right={<IconButton icon="down" label={t('Export', 'ایکسپورٹ')} onPress={() => shareText(csv, 'purchases.csv')} />} />
      <PeriodBar p={p} />
      <TotalChart p={p} label={t('Bought', 'خریدا')} total={total} value={(a, b) => sumBy(P.filter((x) => x.at >= a && x.at < b), (x) => x.total)} foot={`${P.length} ${t('purchases', 'خریداریاں')}`} />
      <Stats items={[[t('Paid', 'ادا'), rs(paid)], [t('On credit', 'ادھار'), rs(total - paid), total - paid ? 'redFg' : 'fg']]} />
      <Breakdown title={t('By supplier', 'سپلائر کے حساب سے')} rows={totalsBy(P, (x) => sup(x.supplierId), (x) => x.total)} />
      {topItems.length ? <Section title={t('Items bought', 'خریدے گئے آئٹمز')}><List>{topItems.map(([n, v]) => <Li key={n} title={n} right={<Text w={600} num>{rs(v)}</Text>} />)}</List></Section> : null}
      <Section title={t('Purchases', 'خریداریاں')}>
        {P.length ? <List>{P.map((x) => <Li key={x.id} icon="truck" title={sup(x.supplierId)} sub={`${x.no} · ${shortDate(x.at)}`} right={<Badge tone={x.paid >= x.total ? 'grn' : 'yel'} label={rs(x.total)} />} />)}</List> : <Text c="fg3">{t('No purchases in this period.', 'اس مدت میں کوئی خریداری نہیں۔')}</Text>}
      </Section>
    </Screen>
  );
}
