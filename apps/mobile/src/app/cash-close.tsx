import { useRouter } from 'expo-router';
import { useState } from 'react';
import { cashExpected } from '@/lib/books';
import { rs } from '@/lib/money';
import { parsePaisa } from '@/lib/product';
import { isToday, useBooks } from '@/state/books';
import { useKhata } from '@/state/khata';
import { useT } from '@/theme';
import { Button, Card, Field, Row, Screen, Text } from '@/ui/kit';
import { Header, Li, List, toast } from '@/ui/parts';

// ponytail: computed from what this phone recorded today. With several devices, the day total comes from the server.
export default function CashClose() {
  const t = useT();
  const router = useRouter();
  const { sales, expenses, closings, close } = useBooks();
  const parties = useKhata((s) => s.parties);
  const opening = closings[0]?.counted ?? 0;
  const cashSales = sales.filter((s) => isToday(s.at)).reduce((a, s) => a + (s.mode === 'cash' ? s.total : s.mode === 'split' ? s.split?.cash ?? 0 : 0), 0);
  const cashEntries = (kind: 'customer' | 'supplier') => parties.filter((p) => p.kind === kind)
    .flatMap((p) => p.entries).filter((e) => isToday(e.at) && e.mode === 'Cash' && e.amount < 0).reduce((a, e) => a - e.amount, 0);
  const received = cashEntries('customer');
  const supplierPaid = cashEntries('supplier');
  const spent = expenses.filter((e) => isToday(e.at) && e.from === 'Cash').reduce((a, e) => a + e.amount, 0);
  const expected = cashExpected({ opening, cashSales, received, expenses: spent, supplierPaid });
  const [counted, setCounted] = useState('');
  const c = parsePaisa(counted);
  const diff = c === null ? null : c - expected;
  const rows: [string, number][] = [[t('Opening cash', 'ابتدائی نقد'), opening], [t('Cash sales', 'نقد فروخت'), cashSales], [t('Khata received', 'کھاتہ وصولی'), received], [t('Expenses paid', 'ادا اخراجات'), -spent], [t('Supplier payments', 'سپلائر ادائیگی'), -supplierPaid]];
  return (
    <Screen>
      <Header title={t('Close the day', 'دن بند کریں')} />
      <List>
        {[...rows.map(([k, v]) => <Li key={k} title={<Text c="fg2">{k}</Text>} right={<Text w={600} num>{v < 0 ? '- ' : ''}{rs(Math.abs(v))}</Text>} />),
          <Li key="exp" title={<Text v="h2">{t('Cash expected', 'متوقع نقد')}</Text>} right={<Text v="h2" num>{rs(expected)}</Text>} />]}
      </List>
      <Field label={t('Cash you counted', 'گنی ہوئی نقد رقم')} value={counted} onChangeText={setCounted} keyboardType="decimal-pad" placeholder="0" />
      <Card><Row justify="space-between"><Text c="fg2">{t('Difference', 'فرق')}</Text><Text v="h2" num c={diff === null || diff === 0 ? 'fg' : diff < 0 ? 'redFg' : 'accent'}>{diff === null ? '-' : `${diff < 0 ? '- ' : diff > 0 ? '+ ' : ''}${rs(Math.abs(diff))}`}</Text></Row></Card>
      <Button kind="sec" icon="plus" label={t('Add expense', 'خرچہ شامل')} onPress={() => router.push('/expense')} />
      <Button label={t('Close day and save', 'دن بند کریں')} disabled={c === null} onPress={() => { close({ expected, counted: c! }); toast(t('Day closed. Report saved.', 'دن بند۔ رپورٹ محفوظ۔')); router.replace('/(tabs)'); }} />
    </Screen>
  );
}
