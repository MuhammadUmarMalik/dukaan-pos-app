import { useRouter } from 'expo-router';
import { rs } from '@/lib/money';
import { sumBy, within } from '@/lib/reports';
import { useBooks } from '@/state/books';
import { due, lastAt, shortDate, useKhata } from '@/state/khata';
import { useT } from '@/theme';
import { Screen, Text } from '@/ui/kit';
import { Header, initials, Li, List, Stats } from '@/ui/parts';
import { PeriodBar, Section, usePeriod } from '@/ui/report';

export default function SuppliersReport() {
  const t = useT();
  const router = useRouter();
  const p = usePeriod('month');
  const sups = useKhata((s) => s.parties).filter((x) => x.kind === 'supplier' && !x.archived);
  const purchases = useBooks((s) => s.purchases).filter((x) => within(x.at, p));
  const owe = sumBy(sups, (s) => Math.max(0, due(s)));
  const paid = -sumBy(sups.flatMap((s) => s.entries).filter((e) => e.amount < 0 && within(e.at, p)), (e) => e.amount);
  return (
    <Screen>
      <Header title={t('Suppliers', 'سپلائرز')} home="/reports" />
      <Stats items={[[t('You owe', 'آپ کے واجبات'), rs(owe), 'redFg'], [t('Suppliers', 'سپلائرز'), String(sups.length)]]} />
      <PeriodBar p={p} />
      <Stats items={[[t('Bought', 'خریدا'), rs(sumBy(purchases, (x) => x.total))], [t('Paid', 'ادا کیا'), rs(paid), 'accent']]} />
      <Section title={t('Each supplier', 'ہر سپلائر')}>
        {sups.length ? <List>{[...sups].sort((a, b) => due(b) - due(a)).map((s) => {
          const bought = sumBy(purchases.filter((x) => x.supplierId === s.id), (x) => x.total);
          return <Li key={s.id} initials={initials(s.name)} tone="yel" title={t(s.name, s.ur)} sub={`${t('Bought', 'خریدا')} ${rs(bought)} · ${t('Last', 'آخری')} ${shortDate(lastAt(s))}`}
            right={<Text w={600} num>{rs(due(s))}</Text>} onPress={() => router.push(`/ledger/${s.id}`)} />;
        })}</List> : <Text c="fg3">{t('No suppliers yet.', 'ابھی کوئی سپلائر نہیں۔')}</Text>}
      </Section>
    </Screen>
  );
}
