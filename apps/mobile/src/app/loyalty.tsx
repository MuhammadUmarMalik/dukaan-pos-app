import { rs } from '@/lib/money';
import { due, useKhata } from '@/state/khata';
import { useBooks } from '@/state/books';
import { useSettings } from '@/state/settings';
import { useT } from '@/theme';
import { Badge, Card, Screen, Text, Toggle } from '@/ui/kit';
import { Header, initials, Li, List, Stepper } from '@/ui/parts';

// Points = (spent / Rs 100) x earn rate. ponytail: computed from local sales; redeeming at the till lands with the sync phase.
export default function Loyalty() {
  const t = useT();
  const { tog, loyalty, set } = useSettings();
  const sales = useBooks((s) => s.sales);
  const customers = useKhata((s) => s.parties).filter((p) => p.kind === 'customer');
  const pts = (id: string) => Math.floor(sales.filter((s) => s.customerId === id).reduce((a, s) => a + s.total, 0) / 10000) * loyalty.earn;
  const top = customers.map((c) => ({ c, p: pts(c.id) })).filter((x) => x.p > 0).sort((a, b) => b.p - a.p).slice(0, 5);
  return (
    <Screen>
      <Header title={t('Loyalty points', 'لائلٹی پوائنٹس')} />
      <Card pad={0}><Li title={t('Reward repeat customers', 'دوبارہ آنے والوں کو انعام')} sub={t('Customers earn points on every bill', 'ہر بل پر پوائنٹس ملتے ہیں')} right={<Toggle label={t('Loyalty points', 'لائلٹی پوائنٹس')} on={tog.loy} onChange={(v) => set({ tog: { ...tog, loy: v } })} />} /></Card>
      {tog.loy ? (
        <>
          <List>
            <Li title={t('Earn', 'کمائیں')} sub={t('Points for every Rs 100 spent', 'ہر Rs 100 پر پوائنٹس')} right={<Stepper value={loyalty.earn} onStep={(d) => set({ loyalty: { ...loyalty, earn: Math.max(1, loyalty.earn + d) } })} />} />
            <Li title={t('Redeem', 'استعمال')} sub={`${loyalty.red * 10} ${t('points equal', 'پوائنٹس برابر')} ${rs(loyalty.red * 500)}`} right={<Stepper value={loyalty.red} onStep={(d) => set({ loyalty: { ...loyalty, red: Math.max(1, loyalty.red + d) } })} />} />
          </List>
          <Text v="h2">{t('Top customers', 'سرفہرست گاہک')}</Text>
          {top.length ? <List>{top.map(({ c, p }) => <Li key={c.id} initials={initials(c.name)} tone="blue" title={t(c.name, c.ur)} sub={due(c) ? `${t('Due', 'باقی')} ${rs(due(c))}` : undefined} right={<Badge label={`${p} pts`} />} />)}</List>
            : <Text c="fg3">{t('Points appear after sales to named customers.', 'نام والے گاہکوں کو فروخت کے بعد پوائنٹس نظر آئیں گے۔')}</Text>}
        </>
      ) : null}
    </Screen>
  );
}
