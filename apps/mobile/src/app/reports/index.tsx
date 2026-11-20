import { useRouter, type Href } from 'expo-router';
import { rs } from '@/lib/money';
import { range, saleCost, sumBy, within } from '@/lib/reports';
import { useBooks } from '@/state/books';
import { due, useKhata } from '@/state/khata';
import { useProducts } from '@/state/products';
import { useT } from '@/theme';
import type { IconName } from '@/ui/icons';
import { Screen, Text } from '@/ui/kit';
import { Header, Li, List, Stats } from '@/ui/parts';

// Reports hub: today's numbers on top, then every report by group.
// ponytail: all reports read what this phone recorded. In the sync phase they read the shop's daily rollups.
export default function Reports() {
  const t = useT();
  const router = useRouter();
  const { sales, expenses, returns } = useBooks();
  const items = useProducts((s) => s.items);
  const parties = useKhata((s) => s.parties);
  const today = range('day');
  const S = sales.filter((s) => within(s.at, today));
  const total = sumBy(S, (s) => s.total) - sumBy(returns.filter((r) => within(r.at, today)), (r) => r.amount);
  const profit = total - sumBy(S, (s) => saleCost(s.lines, (id) => items.find((p) => p.id === id)?.cost));
  const spent = sumBy(expenses.filter((e) => within(e.at, today)), (e) => e.amount);
  const get = sumBy(parties.filter((p) => p.kind === 'customer'), (p) => Math.max(0, due(p)));

  const groups: [string, [IconName, string, string, Href][]][] = [
    [t('Money in and out', 'آمد و خرچ'), [
      ['cart', t('Sales', 'فروخت'), t('Bills, payment methods, top items, returns', 'بل، ادائیگی، زیادہ بکنے والے، واپسی'), '/reports/sales'],
      ['chart', t('Profit and loss', 'نفع و نقصان'), t('Sales minus cost, returns and expenses', 'فروخت منفی لاگت، واپسی اور اخراجات'), '/reports/profit'],
      ['truck', t('Purchases', 'خریداری'), t('By supplier, paid and due, items bought', 'سپلائر کے حساب سے، ادا اور باقی'), '/reports/purchases'],
      ['wallet', t('Expenses', 'اخراجات'), t('By category, cash and bank', 'قسم کے حساب سے، نقد اور بینک'), '/reports/expenses'],
    ]],
    [t('People', 'لوگ'), [
      ['users', t('Customers and khata', 'گاہک اور کھاتہ'), t('Who owes what, how old, credit given and received', 'کس پر کتنا باقی، کتنا پرانا'), '/reports/customers'],
      ['store', t('Suppliers', 'سپلائرز'), t('What you owe and what you bought', 'آپ کے واجبات اور خریداری'), '/reports/suppliers'],
    ]],
    [t('Stock', 'اسٹاک'), [
      ['box', t('Stock', 'اسٹاک'), t('Value, low and out of stock, expiring, not selling', 'مالیت، کم اور ختم، ایکسپائری، نہ بکنے والے'), '/reports/stock'],
    ]],
    [t('Closing', 'کلوزنگ'), [
      ['cal', t('Daily closing', 'روزانہ کلوزنگ'), t('Cash in, cash out, counted and difference', 'نقد آمد، خرچ، گنتی اور فرق'), '/reports/closing?kind=day'],
      ['cal', t('Weekly closing', 'ہفتہ وار کلوزنگ'), t('Each day of the week side by side', 'ہفتے کا ہر دن ساتھ ساتھ'), '/reports/closing?kind=week'],
      ['cal', t('Monthly closing', 'ماہانہ کلوزنگ'), t('The month in one page', 'پورا مہینہ ایک صفحے پر'), '/reports/closing?kind=month'],
    ]],
  ];

  return (
    <Screen>
      <Header title={t('Reports', 'رپورٹس')} />
      <Text v="label" c="fg3">{t('Today', 'آج')}</Text>
      <Stats items={[[t('Sales', 'فروخت'), rs(total)], [t('Profit', 'منافع'), rs(profit - spent), 'accent'], [t('Khata due', 'باقی کھاتہ'), rs(get)]]} />
      {groups.flatMap(([g, rows]) => [
        <Text key={g} v="label" c="fg3">{g}</Text>,
        <List key={`${g}-list`}>{rows.map(([icon, title, sub, go]) => <Li key={title} icon={icon} title={title} sub={sub} onPress={() => router.push(go)} />)}</List>,
      ])}
    </Screen>
  );
}
