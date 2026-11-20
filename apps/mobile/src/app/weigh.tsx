import { useRouter } from 'expo-router';
import { useState } from 'react';
import { keypad, weighPrice } from '@/lib/books';
import { rs } from '@/lib/money';
import { useCart } from '@/state/cart';
import { useProducts } from '@/state/products';
import { useT } from '@/theme';
import { Button, Card, Row, Screen, Text } from '@/ui/kit';
import { BigAmount, Empty, Header, Keypad, Pick } from '@/ui/parts';

/** Loose items sold by weight: products whose unit is kg. Price shown is per kg. */
export default function Weigh() {
  const t = useT();
  const router = useRouter();
  const loose = useProducts((s) => s.items).filter((p) => p.unit === 'kg' && !p.archived);
  const add = useCart((s) => s.add);
  const [id, setId] = useState(loose[0]?.id ?? '');
  const [g, setG] = useState('');
  const item = loose.find((p) => p.id === id);
  const grams = Number(g) || 0;
  if (!item) return <Screen><Header title={t('Weigh item', 'وزن کریں')} home="/(tabs)/sell" /><Empty icon="list" title={t('No loose items', 'کوئی کھلا آئٹم نہیں')} body={t('Add a product with the unit kg to sell it by weight.', 'وزن پر بیچنے کے لیے کلو یونٹ والا آئٹم شامل کریں۔')} /></Screen>;
  return (
    <Screen>
      <Header title={t('Weigh item', 'وزن کریں')} home="/(tabs)/sell" />
      <Pick value={id} onChange={setId} options={loose.map((p) => [p.id, t(p.name, p.ur)] as [string, string])} />
      <BigAmount label={t('Weight in grams', 'وزن گرام میں')}>
        <Text v="big" num style={{ fontSize: 44, lineHeight: 50 }}>{grams.toLocaleString('en-US')} g</Text>
      </BigAmount>
      <Text v="small" c="fg3" num style={{ textAlign: 'center' }}>{(grams / 1000).toFixed(2)} kg · {rs(item.price)} / kg</Text>
      <Card><Row justify="space-between"><Text c="fg2">{t('Price', 'قیمت')}</Text><Text v="title" num c="accent">{rs(weighPrice(item.price, grams))}</Text></Row></Card>
      <Pick value={grams} onChange={(n) => setG(String(n))} options={[[250, '250 g'], [500, '500 g'], [1000, '1 kg'], [2000, '2 kg']]} />
      <Keypad onKey={(k) => setG((x) => keypad(x, k))} />
      <Button label={t('Add to cart', 'کارٹ میں ڈالیں')} disabled={!grams} onPress={() => { add(item.id, grams / 1000); router.back(); }} />
    </Screen>
  );
}
