import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { adjustStock, type AdjustType } from '@/lib/books';
import { useProducts } from '@/state/products';
import { radius, useT, useTokens } from '@/theme';
import { Icon } from '@/ui/icons';
import { Button, Card, Col, Row, Screen, Text } from '@/ui/kit';
import { Header, Pick, Seg } from '@/ui/parts';

export default function AdjustStock() {
  const t = useT();
  const tk = useTokens();
  const router = useRouter();
  const { id: id0 } = useLocalSearchParams<{ id?: string }>();
  const { items, move } = useProducts();
  const live = items.filter((p) => !p.archived);
  const [id, setId] = useState(id0 ?? live[0]?.id);
  const [type, setType] = useState<AdjustType>('add');
  const [q, setQ] = useState(1);
  const [why, setWhy] = useState('Recount');
  const p = live.find((x) => x.id === id) ?? live[0];
  if (!p) return null;
  const { after, delta } = adjustStock(p.stock, type, q);
  const big = (d: number) => (
    <Pressable accessibilityRole="button" accessibilityLabel={d < 0 ? t('Less', 'کم') : t('More', 'زیادہ')} onPress={() => setQ((x) => Math.max(0, x + d))}
      style={{ width: 56, height: 56, borderRadius: radius.md, backgroundColor: tk.surface, borderWidth: 1, borderColor: tk.line, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={d < 0 ? 'minus' : 'plus'} />
    </Pressable>
  );
  return (
    <Screen>
      <Header title={t('Adjust stock', 'اسٹاک ایڈجسٹ')} home="/stock" />
      <Col gap={8}>
        <Text v="small" c="fg2" w={500}>{t('Item', 'آئٹم')}</Text>
        <Pick value={p.id} onChange={(x) => { setId(x); setQ(1); }} options={live.map((x) => [x.id, t(x.name, x.ur)] as [string, string])} />
      </Col>
      <Seg fill value={type} onChange={(x) => { setType(x); setQ(x === 'set' ? p.stock : 1); }} options={[['add', t('Add', 'شامل')], ['rem', t('Remove', 'کم')], ['set', t('Set count', 'گنتی')]]} />
      <Row gap={18} justify="center">{big(-1)}<Text v="big" num style={{ minWidth: 110, textAlign: 'center' }}>{q}</Text>{big(1)}</Row>
      <Row gap={8} justify="center">{[5, 10, 25, 50].map((n) => <Button key={n} small kind="sec" block={false} label={`+${n}`} onPress={() => setQ((x) => x + n)} />)}</Row>
      <Card>
        <Row justify="space-between">
          <View><Text v="xs" c="fg3">{t('Now', 'ابھی')}</Text><Text v="h2" num>{p.stock}</Text></View>
          <Icon name="chev" color="fg3" flip />
          <View style={{ alignItems: 'flex-end' }}><Text v="xs" c="fg3">{t('After', 'بعد')}</Text><Text v="h2" num c={after < 0 ? 'redFg' : 'accent'}>{after}</Text></View>
        </Row>
      </Card>
      <Col gap={8}>
        <Text v="small" c="fg2" w={500}>{t('Reason', 'وجہ')}</Text>
        <Pick value={why} onChange={setWhy} options={[['Recount', t('Recount', 'دوبارہ گنتی')], ['Damaged', t('Damaged', 'خراب')], ['Expired', t('Expired', 'ایکسپائر')], ['Found', t('Found', 'مل گیا')], ['Returned', t('Returned', 'واپس')]]} />
      </Col>
      <Button label={t('Save adjustment', 'ایڈجسٹمنٹ محفوظ')} disabled={after < 0 || delta === 0} onPress={() => { move(p.id, delta, `Adjust: ${why}`); router.back(); }} />
    </Screen>
  );
}
