import { useRouter } from 'expo-router';
import { rs } from '@/lib/money';
import { sumBy, totalsBy, within } from '@/lib/reports';
import { useBooks } from '@/state/books';
import { shortDate } from '@/state/khata';
import { useT } from '@/theme';
import { Button, Screen, Text } from '@/ui/kit';
import { Header, Li, List, Stats } from '@/ui/parts';
import { Breakdown, PeriodBar, Section, TotalChart, usePeriod } from '@/ui/report';

export default function ExpensesReport() {
  const t = useT();
  const router = useRouter();
  const p = usePeriod('month');
  const E = useBooks((s) => s.expenses).filter((e) => within(e.at, p));
  const cat: Record<string, string> = { Rent: t('Rent', 'کرایہ'), Electricity: t('Electricity', 'بجلی'), Salary: t('Salary', 'تنخواہ'), Transport: t('Transport', 'کرایہ بار'), Tea: t('Tea and misc', 'چائے اور متفرق'), Other: t('Other', 'دیگر') };
  const total = sumBy(E, (e) => e.amount);
  return (
    <Screen>
      <Header title={t('Expense report', 'اخراجات رپورٹ')} home="/reports" />
      <PeriodBar p={p} />
      <TotalChart p={p} label={t('Spent', 'خرچ')} total={total} value={(a, b) => sumBy(E.filter((e) => e.at >= a && e.at < b), (e) => e.amount)} foot={`${E.length} ${t('entries', 'اندراج')}`} />
      <Stats items={[[t('From cash', 'نقد سے'), rs(sumBy(E.filter((e) => e.from === 'Cash'), (e) => e.amount))], [t('From bank', 'بینک سے'), rs(sumBy(E.filter((e) => e.from === 'Bank'), (e) => e.amount))]]} />
      <Breakdown title={t('By category', 'قسم کے حساب سے')} rows={totalsBy(E, (e) => cat[e.cat] ?? e.cat, (e) => e.amount)} />
      <Section title={t('Entries', 'اندراج')}>
        {E.length ? <List>{E.map((e) => <Li key={e.id} icon="wallet" title={cat[e.cat] ?? e.cat} sub={`${shortDate(e.at)}${e.note ? ` · ${e.note}` : ''}`} right={<Text w={600} num>{rs(e.amount)}</Text>} />)}</List> : <Text c="fg3">{t('No expenses in this period.', 'اس مدت میں کوئی خرچ نہیں۔')}</Text>}
      </Section>
      <Button kind="sec" icon="plus" label={t('Add expense', 'خرچہ شامل')} onPress={() => router.push('/expense')} />
    </Screen>
  );
}
