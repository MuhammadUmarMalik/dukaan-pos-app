import { View } from 'react-native';
import { PRODUCTS } from '@/data/seed';
import { rs } from '@/lib/money';
import { useT } from '@/theme';
import { Avatar, Badge, Card, Hairline, Row, Screen, Text } from '@/ui/kit';

// ponytail: read-only list. Add/edit product and the barcode scanner come next (docs/roadmap.md, Phase 2).
export default function Items() {
  const t = useT();
  return (
    <Screen>
      <Text v="title" accessibilityRole="header" style={{ fontSize: 24 }}>{t('Products', 'آئٹمز')}</Text>
      <Card pad={0}>
        {PRODUCTS.map((p, i) => {
          const low = p.stock <= p.min;
          return (
            <View key={p.id}>
              {i ? <Hairline /> : null}
              <Row gap={12} style={{ paddingHorizontal: 16, paddingVertical: 13, minHeight: 62 }}>
                <Avatar text={p.name.split(' ').map((w) => w[0]).slice(0, 2).join('')} tone={low ? 'yel' : 'plain'} />
                <View style={{ flex: 1 }}>
                  <Text w={500}>{t(p.name, p.ur)}</Text>
                  <Text v="xs" c="fg3" mono>{p.code}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text w={600} num>{rs(p.price)}</Text>
                  {low ? <Badge label={t('Low', 'کم')} tone="red" /> : <Text v="xs" c="fg3" num>{p.stock}</Text>}
                </View>
              </Row>
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}
