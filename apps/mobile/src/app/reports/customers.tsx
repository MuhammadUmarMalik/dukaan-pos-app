import { useRouter } from 'expo-router';
import { rs } from '@/lib/money';
import { aging, sumBy, within, type AgeBuckets } from '@/lib/reports';
import { shareText } from '@/lib/share';
import { due, lastAt, shortDate, useKhata } from '@/state/khata';
import { useT } from '@/theme';
import { Badge, Button, IconButton, Screen, Text } from '@/ui/kit';
import { Header, initials, Li, List, Stats } from '@/ui/parts';
import { Breakdown, PeriodBar, Section, usePeriod } from '@/ui/report';

/** Customers and khata: who owes, how old it is, credit given and money received in the period. */
export default function CustomersReport() {
  const t = useT();
  const router = useRouter();
  const p = usePeriod('month');
  const all = useKhata((s) => s.parties).filter((x) => x.kind === 'customer');
  const live = all.filter((x) => !x.archived);
  const owing = live.filter((c) => due(c) > 0).sort((a, b) => due(b) - due(a));
  const total = sumBy(owing, due);
  const age = live.reduce<AgeBuckets>((a, c) => { const b = aging(c.entries); return { d30: a.d30 + b.d30, d60: a.d60 + b.d60, d90: a.d90 + b.d90, older: a.older + b.older }; }, { d30: 0, d60: 0, d90: 0, older: 0 });
  const inP = live.flatMap((c) => c.entries).filter((e) => within(e.at, p));
  const given = sumBy(inP.filter((e) => e.amount > 0), (e) => e.amount);
  const got = -sumBy(inP.filter((e) => e.amount < 0), (e) => e.amount);
  const over = live.filter((c) => c.limit && due(c) > c.limit);
  const newOnes = live.filter((c) => c.entries.length && within(Math.min(...c.entries.map((e) => e.at)), p)).length;
  const csv = ['name,phone,area,balance,last activity', ...live.map((c) => `"${c.name}",${c.phone},"${c.area}",${due(c) / 100},${new Date(lastAt(c) || Date.now()).toISOString().slice(0, 10)}`)].join('\n');
  return (
    <Screen>
      <Header title={t('Customers and khata', 'گاہک اور کھاتہ')} home="/reports" right={<IconButton icon="down" label={t('Export', 'ایکسپورٹ')} onPress={() => shareText(csv, 'customers.csv')} />} />
      <Stats items={[[t('Total due', 'کل باقی'), rs(total), 'redFg'], [t('Customers owing', 'باقی والے گاہک'), String(owing.length)], [t('All customers', 'کل گاہک'), String(live.length)]]} />
      <Breakdown title={t('How old the khata is', 'کھاتہ کتنا پرانا ہے')} rows={[[t('Up to 30 days', '30 دن تک'), age.d30], [t('31 to 60 days', '31 سے 60 دن'), age.d60], [t('61 to 90 days', '61 سے 90 دن'), age.d90], [t('Over 90 days', '90 دن سے زیادہ'), age.older]]} />
      <PeriodBar p={p} />
      <Stats items={[[t('Credit given', 'ادھار دیا'), rs(given)], [t('Received', 'وصول'), rs(got), 'accent'], [t('New customers', 'نئے گاہک'), String(newOnes)]]} />
      {over.length ? <Section title={t('Over credit limit', 'کریڈٹ حد سے زیادہ')}><List>{over.map((c) => <Li key={c.id} icon="alert" tone="red" title={t(c.name, c.ur)} sub={`${t('Limit', 'حد')} ${rs(c.limit)}`} right={<Text w={600} num c="redFg">{rs(due(c))}</Text>} onPress={() => router.push(`/ledger/${c.id}`)} />)}</List></Section> : null}
      <Section title={t('Who owes the most', 'سب سے زیادہ باقی')}>
        {owing.length ? <List>{owing.slice(0, 15).map((c) => {
          const a = aging(c.entries);
          const old = a.d60 + a.d90 + a.older;
          return <Li key={c.id} initials={initials(c.name)} tone={old ? 'red' : 'blue'} title={t(c.name, c.ur)} sub={`${t('Last', 'آخری')} ${shortDate(lastAt(c))}${old ? ` · ${rs(old)} ${t('over 60 days', '60 دن سے زیادہ')}` : ''}`}
            right={<Text w={600} num c="redFg">{rs(due(c))}</Text>} onPress={() => router.push(`/ledger/${c.id}`)} />;
        })}</List> : <Text c="fg3">{t('Nobody owes you anything.', 'کسی پر کچھ باقی نہیں۔')}</Text>}
      </Section>
      {all.length > live.length ? <Badge tone="blue" label={t(`${all.length - live.length} archived customers not counted`, `${all.length - live.length} آرکائیو گاہک شامل نہیں`)} /> : null}
      <Button kind="sec" icon="users" label={t('Manage customers', 'گاہک سنبھالیں')} onPress={() => router.push('/(tabs)/khata')} />
    </Screen>
  );
}
