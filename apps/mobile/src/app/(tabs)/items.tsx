import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { rs } from '@/lib/money';
import { useProducts } from '@/state/products';
import { radius, useRtl, useT, useTokens } from '@/theme';
import { Icon } from '@/ui/icons';
import { Avatar, Badge, Button, Card, Chip, Hairline, IconButton, Row, Screen, Text } from '@/ui/kit';
import { Seg } from '@/ui/parts';

export default function Items() {
  const t = useT();
  const tk = useTokens();
  const rtl = useRtl();
  const router = useRouter();
  const items = useProducts((s) => s.items);
  const [q, setQ] = useState('');
  const [f, setF] = useState<'all' | 'low' | 'exp'>('all');
  const soon = (e?: string) => !!e && new Date(e).getTime() - Date.now() < 30 * 86_400_000;
  const live = items.filter((p) => !p.archived);
  const list = live.filter((p) => (f === 'all' || (f === 'low' ? p.stock <= p.min : soon(p.expiry))) && (p.name + p.ur + p.codes.join(' ')).toLowerCase().includes(q.trim().toLowerCase()));
  const lowCount = live.filter((p) => p.stock <= p.min).length;
  const expCount = live.filter((p) => soon(p.expiry)).length;
  return (
    <Screen>
      <Row justify="space-between">
        <Text v="title" accessibilityRole="header" style={{ fontSize: 24 }}>{t('Products', 'آئٹمز')}</Text>
        <Button small block={false} icon="plus" label={t('Add', 'شامل')} onPress={() => router.push('/product-form')} />
      </Row>
      <Seg value="items" onChange={(k) => k === 'stock' && router.push('/stock')} options={[['items', t('Items', 'آئٹمز')], ['stock', t('Stock', 'اسٹاک')]]} />
      <Row gap={10}>
        <Row gap={10} style={{ flex: 1, height: 52, paddingHorizontal: 14, borderRadius: radius.md - 1, backgroundColor: tk.surface, borderWidth: 1, borderColor: tk.line2 }}>
          <Icon name="search" size={18} color="fg3" />
          <TextInput accessibilityLabel={t('Search', 'تلاش')} value={q} onChangeText={setQ} placeholder={t('Search name or barcode', 'نام یا بارکوڈ')} placeholderTextColor={tk.fg3}
            style={{ flex: 1, height: '100%', color: tk.fg, fontSize: 15, textAlign: rtl ? 'right' : 'left', fontFamily: rtl ? 'NotoNaskhArabic_400Regular' : 'Geist_400Regular' }} />
        </Row>
        <IconButton icon="scan" size={52} label={t('Scan barcode', 'بارکوڈ اسکین')} onPress={() => router.push('/scan?from=items')} />
      </Row>
      <Row gap={8}>
        <Chip label={`${t('All', 'سب')} ${live.length}`} on={f === 'all'} onPress={() => setF('all')} />
        <Chip label={`${t('Low stock', 'کم اسٹاک')} ${lowCount}`} on={f === 'low'} onPress={() => setF('low')} />
        <Chip label={`${t('Expiring', 'ایکسپائری')} ${expCount}`} on={f === 'exp'} onPress={() => setF('exp')} />
      </Row>
      <Card pad={0}>
        {list.length ? list.map((p, i) => {
          const low = p.stock <= p.min;
          return (
            <View key={p.id}>
              {i ? <Hairline /> : null}
              <Pressable accessibilityRole="button" accessibilityLabel={`${t(p.name, p.ur)}, ${rs(p.price)}`} onPress={() => router.push(`/product-detail?id=${p.id}`)}>
                <Row gap={12} style={{ paddingHorizontal: 16, paddingVertical: 13, minHeight: 62 }}>
                  <Avatar text={p.name.split(' ').map((w) => w[0]).slice(0, 2).join('')} tone={low ? 'yel' : 'plain'} />
                  <View style={{ flex: 1 }}>
                    <Text w={500} numberOfLines={1}>{t(p.name, p.ur)}</Text>
                    <Text v="xs" c="fg3" mono numberOfLines={1}>{p.codes[0] ?? t('No barcode', 'بارکوڈ نہیں')}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text w={600} num>{rs(p.price)}</Text>
                    {low ? <Badge label={t('Low', 'کم')} tone="red" /> : <Text v="xs" c="fg3" num>{p.stock} {p.unit}</Text>}
                  </View>
                </Row>
              </Pressable>
            </View>
          );
        }) : <View style={{ padding: 28 }}><Text c="fg3" style={{ textAlign: 'center' }}>{q ? t('No product matches.', 'کوئی آئٹم نہیں ملا۔') : t('No products yet. Tap Add.', 'ابھی کوئی آئٹم نہیں۔ شامل دبائیں۔')}</Text></View>}
      </Card>
    </Screen>
  );
}
