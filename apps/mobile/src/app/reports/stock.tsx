import { useRouter } from 'expo-router';
import { useState } from 'react';
import { rs } from '@/lib/money';
import { shareText } from '@/lib/share';
import { sumBy, totalsBy, within } from '@/lib/reports';
import { useBooks } from '@/state/books';
import { useProducts } from '@/state/products';
import { useT } from '@/theme';
import { IconButton, Screen, Text } from '@/ui/kit';
import { Header, Li, List, Pick, Stats } from '@/ui/parts';
import { Breakdown, PeriodBar, Section, usePeriod } from '@/ui/report';

const DAY = 86_400_000;

export default function StockReport() {
  const t = useT();
  const router = useRouter();
  const p = usePeriod('week');
  const { items, moves } = useProducts();
  const sales = useBooks((s) => s.sales);
  const live = items.filter((x) => !x.archived);
  const [tab, setTab] = useState<'low' | 'out' | 'exp' | 'dead'>('low');
  const atCost = sumBy(live, (x) => Math.round(Math.max(0, x.stock) * x.cost));
  const atSale = sumBy(live, (x) => Math.round(Math.max(0, x.stock) * x.price));
  const soldIds = new Set(sales.filter((s) => s.at > Date.now() - 30 * DAY).flatMap((s) => s.lines.map((l) => l.productId)));
  const lists = {
    low: live.filter((x) => x.stock > 0 && x.stock <= x.min),
    out: live.filter((x) => x.stock <= 0),
    exp: live.filter((x) => x.expiry && new Date(x.expiry).getTime() - Date.now() < 30 * DAY),
    dead: live.filter((x) => x.stock > 0 && !soldIds.has(x.id)),
  };
  const M = moves.filter((m) => within(m.at, p));
  const kind = (why: string) => why.startsWith('Sale') ? t('Sold', 'فروخت') : why.startsWith('Purchase') ? t('Bought', 'خریدا') : why.startsWith('Return') ? t('Returned', 'واپس') : t('Adjusted', 'ایڈجسٹ');
  const csv = ['name,unit,stock,alert,cost,price,value at cost', ...live.map((x) => `"${x.name}",${x.unit},${x.stock},${x.min},${x.cost / 100},${x.price / 100},${Math.round(x.stock * x.cost) / 100}`)].join('\n');
  return (
    <Screen>
      <Header title={t('Stock report', 'اسٹاک رپورٹ')} home="/reports" right={<IconButton icon="down" label={t('Export', 'ایکسپورٹ')} onPress={() => shareText(csv, 'stock.csv')} />} />
      <Stats items={[[t('Value at cost', 'لاگت پر مالیت'), rs(atCost)], [t('Value at sale price', 'فروخت قیمت پر'), rs(atSale)], [t('Expected profit', 'متوقع منافع'), rs(atSale - atCost), 'accent']]} />
      <Pick value={tab} onChange={setTab} options={[['low', `${t('Low', 'کم')} ${lists.low.length}`], ['out', `${t('Out of stock', 'ختم')} ${lists.out.length}`], ['exp', `${t('Expiring', 'ایکسپائری')} ${lists.exp.length}`], ['dead', `${t('Not selling', 'نہ بکنے والے')} ${lists.dead.length}`]]} />
      {lists[tab].length ? <List>{lists[tab].map((x) => (
        <Li key={x.id} title={t(x.name, x.ur)} sub={tab === 'exp' ? `${t('Expiry', 'ایکسپائری')} ${x.expiry}` : tab === 'dead' ? t('No sale in 30 days', '30 دن سے کوئی فروخت نہیں') : `${t('Alert at', 'الرٹ')} ${x.min}`}
          right={<Text w={600} num c={x.stock <= 0 ? 'redFg' : 'fg'}>{x.stock} {x.unit}</Text>} onPress={() => router.push(`/product-detail?id=${x.id}`)} />
      ))}</List> : <Text c="fg3">{t('Nothing here.', 'یہاں کچھ نہیں۔')}</Text>}
      <PeriodBar p={p} />
      <Breakdown money={false} title={t('Stock movement, units', 'اسٹاک حرکت، یونٹ')} rows={totalsBy(M, (m) => kind(m.why), (m) => Math.abs(m.delta))} />
      <Section title={t('Most moved items', 'سب سے زیادہ حرکت')}>
        {M.length ? <List>{totalsBy(M, (m) => m.productId, (m) => Math.abs(m.delta)).slice(0, 8).map(([id, q]) => {
          const x = items.find((i) => i.id === id);
          return <Li key={id} title={x ? t(x.name, x.ur) : '-'} right={<Text c="fg2" num>{Math.round(q * 100) / 100} {x?.unit}</Text>} />;
        })}</List> : <Text c="fg3">{t('No movement in this period.', 'اس مدت میں کوئی حرکت نہیں۔')}</Text>}
      </Section>
    </Screen>
  );
}
