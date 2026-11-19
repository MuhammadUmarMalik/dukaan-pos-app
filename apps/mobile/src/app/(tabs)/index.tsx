import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { CATEGORIES, CUSTOMERS, PRODUCTS } from '@/data/seed';
import { rs } from '@/lib/money';
import { useSettings } from '@/state/settings';
import { useT, useTokens } from '@/theme';
import { Icon, type IconName } from '@/ui/icons';
import { Avatar, Badge, Card, Col, Hairline, IconButton, Row, Screen, Text } from '@/ui/kit';

// ponytail: figures are sample data until the reports queries exist (sales, cash, profit come from Supabase).
const WEEK = [31.2, 28.4, 36.9, 33.1, 41.7, 43.1, 48.3];
const DAYS: [string, string][] = [['Mon', 'پیر'], ['Tue', 'منگل'], ['Wed', 'بدھ'], ['Thu', 'جمعرات'], ['Fri', 'جمعہ'], ['Sat', 'ہفتہ'], ['Sun', 'اتوار']];

export default function Home() {
  const t = useT();
  const tk = useTokens();
  const router = useRouter();
  const { shop, category } = useSettings();
  const cat = CATEGORIES.find((c) => c.k === category) ?? CATEGORIES[0];
  const due = CUSTOMERS.reduce((a, c) => a + c.balance, 0);
  const low = PRODUCTS.filter((p) => p.stock <= p.min);
  const stats = [[t('Cash in hand', 'نقد رقم'), rs(2140000)], [t('Khata due', 'باقی کھاتہ'), rs(due)], [t('Profit', 'منافع'), rs(786000)]];
  const actions: { icon: IconName; label: string; go: string }[] = [
    { icon: 'cart', label: t('New sale', 'نئی فروخت'), go: '/(tabs)/sell' },
    { icon: 'scan', label: t('Scan', 'اسکین'), go: '/(tabs)/items' },
    { icon: 'wallet', label: t('Receive', 'وصولی'), go: '/(tabs)/khata' },
    { icon: 'plus', label: t('Add item', 'آئٹم'), go: '/(tabs)/items' },
  ];
  return (
    <Screen>
      <Row justify="space-between" style={{ minHeight: 52 }}>
        <Row gap={12} style={{ flex: 1 }}>
          <Avatar text={shop.name.split(' ').map((w) => w[0]).slice(0, 2).join('')} tone="plain" />
          <View style={{ flex: 1 }}>
            <Text v="h2" numberOfLines={1}>{t(`Assalam o Alaikum, ${shop.owner.split(' ')[0]}`, `السلام علیکم، ${shop.owner.split(' ')[0]}`)}</Text>
            <Text v="small" c="fg3" numberOfLines={1}>{shop.name} · {t(...cat.n)}</Text>
          </View>
        </Row>
        <IconButton icon="bell" label={t('Alerts', 'الرٹس')} dot />
      </Row>

      <Card shell>
        <Row justify="space-between">
          <Text v="label" c="fg3">{t('Today', 'آج')}</Text>
          <Badge label={"‎+12.1%"} tone="grn" />
        </Row>
        <Text v="big" num style={{ marginTop: 6, marginBottom: 16 }}>{rs(4832000)}</Text>
        <View accessible accessibilityLabel={t('Sales, last 7 days', 'پچھلے 7 دن کی فروخت')}>
          <Row gap={7} align="flex-end" style={{ height: 76 }}>
            {WEEK.map((v, i) => (
              <View key={i} style={{ flex: 1, height: `${(v / 50) * 100}%`, borderRadius: 5, backgroundColor: i === 6 ? tk.accent : tk.surface2, borderWidth: i === 6 ? 0 : 1, borderColor: tk.line }} />
            ))}
          </Row>
        </View>
        <Row gap={7} style={{ marginTop: 6 }}>
          {DAYS.map((d, i) => <Text key={i} v="xs" c="fg3" style={{ flex: 1, textAlign: 'center' }}>{t(...d)}</Text>)}
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

      <Col gap={8}>
        <Text v="h2">{t('Needs attention', 'توجہ درکار')}</Text>
        <Card pad={0}>
          {[
            { icon: 'box' as const, tone: 'yel' as const, title: t(`${low.length} items low on stock`, `${low.length} آئٹمز کا اسٹاک کم`), body: low.map((p) => t(p.name, p.ur)).join(', '), go: '/(tabs)/items' },
            { icon: 'users' as const, tone: 'blue' as const, title: t('3 customers owe over 30 days', '3 گاہک 30 دن سے زیادہ باقی'), body: rs(7240000), go: '/(tabs)/khata' },
          ].map((r, i) => (
            <View key={r.title}>
              {i ? <Hairline /> : null}
              <Pressable accessibilityRole="button" onPress={() => router.navigate(r.go as never)}>
                <Row gap={12} style={{ paddingHorizontal: 16, paddingVertical: 13, minHeight: 62 }}>
                  <Avatar icon={r.icon} tone={r.tone} />
                  <View style={{ flex: 1 }}><Text w={500}>{r.title}</Text><Text v="small" c="fg3" numberOfLines={1}>{r.body}</Text></View>
                  <Icon name="chev" size={18} color="fg3" flip />
                </Row>
              </Pressable>
            </View>
          ))}
        </Card>
      </Col>
    </Screen>
  );
}
