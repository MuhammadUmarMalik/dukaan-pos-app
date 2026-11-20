import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { lineTotal, rs } from '@/lib/money';
import { useBooks } from '@/state/books';
import { useCart } from '@/state/cart';
import { useKhata } from '@/state/khata';
import { useProducts } from '@/state/products';
import { useT } from '@/theme';
import { Button, IconButton, Row, Screen, Text } from '@/ui/kit';
import { Empty, Header, Li, List } from '@/ui/parts';

export default function Held() {
  const t = useT();
  const router = useRouter();
  const { held, dropHeld } = useBooks();
  const resume = useCart((s) => s.resume);
  const items = useProducts((s) => s.items);
  const parties = useKhata((s) => s.parties);
  return (
    <Screen>
      <Header title={t('Held bills', 'روکے ہوئے بل')} home="/(tabs)/sell" />
      {held.length ? (
        <List>
          {held.map((h) => {
            const total = h.lines.reduce((a, l) => a + lineTotal({ qty: l.qty, price: items.find((p) => p.id === l.productId)?.price ?? 0 }), 0);
            const c = parties.find((p) => p.id === h.customerId);
            return (
              <View key={h.id}>
                <Li icon="pause" tone="yel" title={c ? t(c.name, c.ur) : t('Walk-in', 'عام گاہک')}
                  sub={`${new Date(h.at).toTimeString().slice(0, 5)} · ${h.lines.length} ${t('items', 'آئٹمز')}`} right={<Text w={600} num>{rs(total)}</Text>} />
                <Row gap={8} style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                  <View style={{ flex: 1 }}><Button small label={t('Resume', 'جاری کریں')} onPress={() => { resume(h.id); router.replace('/cart'); }} /></View>
                  <IconButton icon="x" label={t('Delete held bill', 'روکا ہوا بل حذف')} onPress={() => dropHeld(h.id)} />
                </Row>
              </View>
            );
          })}
        </List>
      ) : <Empty icon="pause" title={t('No held bills', 'کوئی روکا ہوا بل نہیں')} body={t('Tap Hold on the cart to park a sale while you serve someone else.', 'کارٹ میں روکیں دبا کر بل محفوظ کریں اور دوسرے گاہک کو دیکھیں۔')} />}
    </Screen>
  );
}
