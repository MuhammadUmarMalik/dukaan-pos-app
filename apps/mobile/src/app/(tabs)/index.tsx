import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { CATEGORIES } from '@/data/seed';
import { storeName } from '@/lib/billing';
import { rs } from '@/lib/money';
import { isToday, useBooks } from '@/state/books';
import { due, lastAt, shortDate, useKhata } from '@/state/khata';
import { useProducts } from '@/state/products';
import { useSettings } from '@/state/settings';
import { useT, useTokens } from '@/theme';
import { Icon, type IconName } from '@/ui/icons';
import { Avatar, Badge, Card, Col, IconButton, Row, Screen, Text } from '@/ui/kit';
import { initials, Li, List } from '@/ui/parts';

// ponytail: figures come from sales recorded on this phone. With sync they come from the shop's daily rollups.
const DAYS: [string, string][] = [['Sun', 'اتوار'], ['Mon', 'پیر'], ['Tue', 'منگل'], ['Wed', 'بدھ'], ['Thu', 'جمعرات'], ['Fri', 'جمعہ'], ['Sat', 'ہفتہ']];
const DAY = 86_400_000;

export default function Home() {
  const t = useT();
  const tk = useTokens();
  const router = useRouter();
  const { shop, category, sub } = useSettings();
  const cat = CATEGORIES.find((c) => c.k === category) ?? CATEGORIES[0];
  const items = useProducts((s) => s.items);
  const sales = useBooks((s) => s.sales);
  const customers = useKhata((s) => s.parties).filter((p) => p.kind === 'customer');
  const khataDue = customers.reduce((a, c) => a + Math.max(0, due(c)), 0);
  const low = items.filter((p) => !p.archived && p.stock <= p.min);
  const old = customers.filter((c) => due(c) > 0 && Date.now() - lastAt(c) > 30 * DAY);
  const today = sales.filter((x) => isToday(x.at));
  const todayTotal = today.reduce((a, x) => a + x.total, 0);
  const cash = today.reduce((a, x) => a + (x.mode === 'cash' ? x.total : x.mode === 'split' ? x.split?.cash ?? 0 : 0), 0);
  const costOf = (x: (typeof sales)[number]) => x.lines.reduce((b, l) => b + Math.round(l.qty * (items.find((p) => p.id === l.productId)?.cost ?? l.price)), 0);
  const profit = today.reduce((a, x) => a + x.total - costOf(x), 0);
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const dayStart = (i: number) => start.getTime() - (6 - i) * DAY;
  const week = Array.from({ length: 7 }, (_, i) => sales.filter((x) => x.at >= dayStart(i) && x.at < dayStart(i) + DAY).reduce((a, x) => a + x.total, 0));
  const max = Math.max(1, ...week);

  const banners: Partial<Record<typeof sub.status, [IconName, 'yel' | 'red', string, string, string]>> = {
    grace: ['alert', 'yel', t('Payment failed', 'ادائیگی ناکام'), t(`Update your payment method in ${storeName}.`, `${storeName} میں ادائیگی کا طریقہ اپڈیٹ کریں۔`), '/subscription'],
    hold: ['lock', 'red', t('Selling is paused', 'فروخت رکی ہوئی ہے'), t(`Fix your payment in ${storeName} to continue.`, `${storeName} میں ادائیگی ٹھیک کریں۔`), '/paywall'],
    cancelled: ['cal', 'yel', t('Subscription cancelled', 'سبسکرپشن منسوخ'), t('You will not be charged again.', 'دوبارہ چارج نہیں ہوگا۔'), '/subscription'],
    expired: ['lock', 'red', t('Subscription ended', 'سبسکرپشن ختم'), t('Your data is safe. Subscribe to sell again.', 'آپ کا ڈیٹا محفوظ ہے۔ فروخت کے لیے سبسکرائب کریں۔'), '/paywall'],
  };
  const banner = banners[sub.status];
  const stats = [[t('Cash today', 'آج نقد'), rs(cash)], [t('Khata due', 'باقی کھاتہ'), rs(khataDue)], [t('Profit today', 'آج منافع'), rs(profit)]];
  const actions: { icon: IconName; label: string; go: string }[] = [
    { icon: 'cart', label: t('New sale', 'نئی فروخت'), go: '/(tabs)/sell' },
    { icon: 'scan', label: t('Scan', 'اسکین'), go: '/scan?from=sell' },
    { icon: 'wallet', label: t('Receive', 'وصولی'), go: '/(tabs)/khata' },
    { icon: 'plus', label: t('Add item', 'آئٹم'), go: '/product-form' },
  ];
  const attention = [
    low.length ? { icon: 'box' as const, tone: 'yel' as const, title: t(`${low.length} items low on stock`, `${low.length} آئٹمز کا اسٹاک کم`), body: low.map((p) => t(p.name, p.ur)).join(', '), go: '/stock' } : null,
    old.length ? { icon: 'users' as const, tone: 'blue' as const, title: t(`${old.length} customers owe over 30 days`, `${old.length} گاہک 30 دن سے زیادہ باقی`), body: rs(old.reduce((a, c) => a + due(c), 0)), go: '/(tabs)/khata' } : null,
  ].filter((r) => r !== null);

  return (
    <Screen>
      <Row justify="space-between" style={{ minHeight: 52 }}>
        <Row gap={12} style={{ flex: 1 }}>
          <Avatar text={initials(shop.name)} tone="plain" />
          <View style={{ flex: 1 }}>
            <Text v="h2" numberOfLines={1}>{t(`Assalam o Alaikum, ${shop.owner.split(' ')[0]}`, `السلام علیکم، ${shop.owner.split(' ')[0]}`)}</Text>
            <Text v="small" c="fg3" numberOfLines={1}>{shop.name} · {t(...cat.n)}</Text>
          </View>
        </Row>
        <IconButton icon="bell" label={t('Alerts', 'الرٹس')} dot={attention.length > 0} onPress={() => router.push('/alerts')} />
      </Row>

      {banner ? <Card pad={0}><Li icon={banner[0]} tone={banner[1]} title={banner[2]} sub={banner[3]} onPress={() => router.push(banner[4] as never)} /></Card> : null}

      <Card shell>
        <Row justify="space-between">
          <Text v="label" c="fg3">{t('Today', 'آج')}</Text>
          <Badge label={`${today.length} ${t('bills', 'بل')}`} tone="grn" />
        </Row>
        <Text v="big" num style={{ marginTop: 6, marginBottom: 16 }}>{rs(todayTotal)}</Text>
        <View accessible accessibilityLabel={t('Sales, last 7 days', 'پچھلے 7 دن کی فروخت')}>
          <Row gap={7} align="flex-end" style={{ height: 76 }}>
            {week.map((v, i) => (
              <View key={i} style={{ flex: 1, height: `${Math.max(4, (v / max) * 100)}%`, borderRadius: 5, backgroundColor: i === 6 ? tk.accent : tk.surface2, borderWidth: i === 6 ? 0 : 1, borderColor: tk.line }} />
            ))}
          </Row>
        </View>
        <Row gap={7} style={{ marginTop: 6 }}>
          {week.map((_, i) => <Text key={i} v="xs" c="fg3" style={{ flex: 1, textAlign: 'center' }}>{t(...DAYS[new Date(dayStart(i)).getDay()])}</Text>)}
        </Row>
      </Card>

      <Card pad={0}>
        <Row gap={0} align="stretch">
          {stats.map(([k, v], i) => (
            <View key={k} style={{ flex: 1, padding: 14, gap: 2, borderStartWidth: i ? 1 : 0, borderStartColor: tk.line }}>
              <Text v="xs" c="fg3">{k}</Text>
              <Text w={600} num>{v}</Text>
            </View>
          ))}
        </Row>
      </Card>

      <Row gap={8} align="flex-start">
        {actions.map((a) => (
          <Pressable key={a.label} accessibilityRole="button" accessibilityLabel={a.label} onPress={() => router.navigate(a.go as never)} style={{ flex: 1, alignItems: 'center', gap: 8 }}>
            <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: tk.surface, borderWidth: 1, borderColor: tk.line, alignItems: 'center', justifyContent: 'center' }}><Icon name={a.icon} /></View>
            <Text v="xs" c="fg2" style={{ textAlign: 'center' }}>{a.label}</Text>
          </Pressable>
        ))}
      </Row>

      {attention.length ? (
        <Col gap={8}>
          <Text v="h2">{t('Needs attention', 'توجہ درکار')}</Text>
          <List>{attention.map((r) => <Li key={r.title} icon={r.icon} tone={r.tone} title={r.title} sub={r.body} onPress={() => router.navigate(r.go as never)} />)}</List>
        </Col>
      ) : null}

      {sales.length ? (
        <Col gap={8}>
          <Row justify="space-between">
            <Text v="h2">{t('Recent sales', 'حالیہ فروخت')}</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/reports')} style={{ minHeight: 44, justifyContent: 'center' }}><Text v="small" c="fg3">{t('See all', 'سب دیکھیں')}</Text></Pressable>
          </Row>
          <List>{sales.slice(0, 4).map((x) => {
            const c = customers.find((p) => p.id === x.customerId);
            return <Li key={x.bill} icon="receipt" title={c ? t(c.name, c.ur) : t('Walk-in', 'عام گاہک')} sub={`${x.bill} · ${shortDate(x.at)}`} right={<Text w={600} num>{rs(x.total)}</Text>} />;
          })}</List>
        </Col>
      ) : null}
    </Screen>
  );
}
