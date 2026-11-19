import { View } from 'react-native';
import { CUSTOMERS } from '@/data/seed';
import { rs } from '@/lib/money';
import { useT } from '@/theme';
import { Avatar, Card, Hairline, Row, Screen, Text } from '@/ui/kit';

// ponytail: read-only list. Ledger, receive-payment and reminders are the next khata slice.
export default function Khata() {
  const t = useT();
  const due = CUSTOMERS.reduce((a, c) => a + c.balance, 0);
  return (
    <Screen>
      <Text v="title" accessibilityRole="header" style={{ fontSize: 24 }}>{t('Khata', 'کھاتہ')}</Text>
      <Card shell>
        <Text v="label" c="fg3">{t('You will get', 'آپ کو ملنے ہیں')}</Text>
        <Text v="big" num c="accent" style={{ marginTop: 6 }}>{rs(due)}</Text>
      </Card>
      <Card pad={0}>
        {CUSTOMERS.map((c, i) => (
          <View key={c.id}>
            {i ? <Hairline /> : null}
            <Row gap={12} style={{ paddingHorizontal: 16, paddingVertical: 13, minHeight: 62 }}>
              <Avatar text={c.name.split(' ').map((w) => w[0]).slice(0, 2).join('')} tone={(['blue', 'grn', 'yel', 'acc', 'red', 'plain'] as const)[i % 6]} />
              <View style={{ flex: 1 }}>
                <Text w={500}>{t(c.name, c.ur)}</Text>
                <Text v="small" c="fg3">{c.area} · {c.last}</Text>
              </View>
              <Text w={600} num c={c.balance ? 'redFg' : 'fg3'}>{c.balance ? rs(c.balance) : t('Settled', 'ادا')}</Text>
            </Row>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
