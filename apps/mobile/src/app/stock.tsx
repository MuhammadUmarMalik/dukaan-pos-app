import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { rs } from '@/lib/money';
import { shortDate } from '@/state/khata';
import { useProducts } from '@/state/products';
import { useT } from '@/theme';
import { Button, Card, IconButton, Row, Screen, Text } from '@/ui/kit';
import { Header, Li, List, Pick, Progress } from '@/ui/parts';

const days = (iso?: string) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000) : Infinity);

export default function Stock() {
  const t = useT();
  const router = useRouter();
  const { items, moves } = useProducts();
  const [tab, setTab] = useState<'low' | 'exp' | 'mv'>('low');
  const live = items.filter((p) => !p.archived);
  const low = live.filter((p) => p.stock <= p.min);
  const exp = live.filter((p) => days(p.expiry) <= 30).sort((a, b) => days(a.expiry) - days(b.expiry));
  const value = live.reduce((a, p) => a + Math.round(p.cost * Math.max(0, p.stock)), 0);
  const units = live.reduce((a, p) => a + Math.max(0, p.stock), 0);
  const name = (id: string) => { const p = items.find((x) => x.id === id); return p ? t(p.name, p.ur) : '-'; };
  return (
    <Screen>
      <Header title={t('Stock', 'اسٹاک')} home="/(tabs)/items" right={<IconButton icon="plus" label={t('Adjust stock', 'اسٹاک ایڈجسٹ')} onPress={() => router.push('/adjust-stock')} />} />
      <Card shell>
        <Text v="label" c="fg3">{t('Stock value at cost', 'لاگت پر اسٹاک مالیت')}</Text>
        <Text v="big" num style={{ marginTop: 6 }}>{rs(value)}</Text>
        <Text v="small" c="fg3" num style={{ marginTop: 6 }}>{live.length} {t('items', 'آئٹمز')} · {Math.round(units)} {t('units', 'یونٹس')}</Text>
      </Card>
      <Pick value={tab} onChange={setTab} options={[['low', `${t('Low stock', 'کم اسٹاک')} ${low.length}`], ['exp', `${t('Expiring', 'ایکسپائری')} ${exp.length}`], ['mv', t('Movements', 'حرکت')]]} />
      {tab === 'mv' ? (
        moves.length ? <List>{moves.slice(0, 40).map((m) => <Li key={m.id} title={name(m.productId)} sub={`${m.why} · ${shortDate(m.at)}`} right={<Text w={600} num c={m.delta < 0 ? 'fg' : 'accent'}>{m.delta > 0 ? '+' : ''}{m.delta}</Text>} />)}</List>
          : <Text c="fg3" style={{ textAlign: 'center', padding: 20 }}>{t('No movements yet.', 'ابھی کوئی حرکت نہیں۔')}</Text>
      ) : tab === 'exp' ? (
        exp.length ? <List>{exp.map((p) => { const d = days(p.expiry); return <Li key={p.id} icon="cal" tone={d <= 7 ? 'red' : 'yel'} title={t(p.name, p.ur)} sub={d < 0 ? t('Expired', 'ایکسپائر ہو گیا') : t(`Expires in ${d} days`, `${d} دن میں ایکسپائر`)} right={<Text w={600} num>{p.stock}</Text>} onPress={() => router.push(`/product-detail?id=${p.id}`)} />; })}</List>
          : <Text c="fg3" style={{ textAlign: 'center', padding: 20 }}>{t('Nothing expires in the next 30 days.', 'اگلے 30 دن میں کچھ ایکسپائر نہیں۔')}</Text>
      ) : (
        <>
          {low.length ? (
            <List>{low.map((p) => {
              const r = p.min ? p.stock / p.min : 1;
              return (
                <View key={p.id} style={{ padding: 16, gap: 8 }}>
                  <Row justify="space-between"><Text w={600}>{t(p.name, p.ur)}</Text><Text num c={r < 0.5 ? 'redFg' : 'fg3'}>{p.stock} / {p.min}</Text></Row>
                  <Progress pct={r * 100} tone={r < 0.5 ? 'bad' : 'warn'} />
                </View>
              );
            })}</List>
          ) : <Text c="fg3" style={{ textAlign: 'center', padding: 20 }}>{t('All items are above their alert level.', 'سب آئٹمز الرٹ حد سے اوپر ہیں۔')}</Text>}
          <Button icon="truck" label={t('Create purchase order', 'خریداری آرڈر بنائیں')} disabled={!low.length} onPress={() => router.push('/po')} />
        </>
      )}
    </Screen>
  );
}
