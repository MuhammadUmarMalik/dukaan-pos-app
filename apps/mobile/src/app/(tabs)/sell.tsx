import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { rs } from '@/lib/money';
import { cartTotals, useCart } from '@/state/cart';
import { useBooks } from '@/state/books';
import { useProducts } from '@/state/products';
import { useSettings } from '@/state/settings';
import { radius, space, useRtl, useT, useTokens } from '@/theme';
import { Icon } from '@/ui/icons';
import { Avatar, Badge, Chip, Row, Screen, Text } from '@/ui/kit';

export default function Sell() {
  const t = useT();
  const tk = useTokens();
  const rtl = useRtl();
  const router = useRouter();
  const lines = useCart((s) => s.lines);
  const discount = useCart((s) => s.discount);
  const add = useCart((s) => s.add);
  const flags = useSettings((s) => s.flags);
  const products = useProducts((s) => s.items);
  const held = useBooks((s) => s.held.length);
  const [q, setQ] = useState('');
  const { total } = cartTotals({ lines, discount });
  const count = lines.length;
  const readOnly = useSettings((s) => s.sub.status === 'hold' || s.sub.status === 'expired');
  const list = products.filter((p) => !p.archived && (p.name + p.ur + p.codes.join(' ')).toLowerCase().includes(q.trim().toLowerCase()));

  if (readOnly) return <Redirect href="/paywall" />; // the server enforces read-only too; this only saves a failed sale
  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <Screen bottom={96}>
        <Text v="title" accessibilityRole="header" style={{ fontSize: 24 }}>{t('New sale', 'نئی فروخت')}</Text>
        <Row gap={10}>
          <Row gap={10} style={{ flex: 1, height: 52, paddingHorizontal: 14, borderRadius: radius.md - 1, backgroundColor: tk.surface, borderWidth: 1, borderColor: tk.line2 }}>
            <Icon name="search" size={18} color="fg3" />
            <TextInput accessibilityLabel={t('Search', 'تلاش')} value={q} onChangeText={setQ} placeholder={t('Search or type name', 'نام تلاش کریں')} placeholderTextColor={tk.fg3}
              style={{ flex: 1, height: '100%', color: tk.fg, fontSize: 15, textAlign: rtl ? 'right' : 'left', fontFamily: rtl ? 'NotoNaskhArabic_400Regular' : 'Geist_400Regular' }} />
          </Row>
          {flags.barcode ? (
            <Pressable accessibilityRole="button" accessibilityLabel={t('Scan', 'اسکین')} onPress={() => router.push('/scan?from=sell')} style={{ width: 52, height: 52, borderRadius: radius.md, backgroundColor: tk.fg, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="scan" color="bg" />
            </Pressable>
          ) : null}
        </Row>
        <Row gap={8} wrap>
          <Chip label={t('Weigh item', 'وزن کریں')} onPress={() => router.push('/weigh')} />
          {held ? <Chip label={`${t('Held bills', 'روکے ہوئے بل')} ${held}`} onPress={() => router.push('/held')} /> : null}
        </Row>
        <Row gap={10} wrap align="stretch">
          {list.map((p) => {
            const n = lines.find((l) => l.productId === p.id)?.qty ?? 0;
            const low = p.stock <= p.min;
            return (
              <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`${t(p.name, p.ur)}, ${rs(p.price)}`} onPress={() => (p.unit === 'kg' ? router.push('/weigh') : add(p.id))}
                style={({ pressed }) => ({ width: '48.5%', minHeight: 122, padding: 14, gap: 10, borderRadius: radius.lg, backgroundColor: tk.surface, borderWidth: n ? 2 : 1, borderColor: n ? tk.accent : tk.line, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
                <Row justify="space-between">
                  <Avatar text={p.name.split(' ').map((w) => w[0]).slice(0, 2).join('')} tone="plain" />
                  {n ? <Badge label={String(n)} /> : null}
                </Row>
                <Text w={500} numberOfLines={2}>{t(p.name, p.ur)}</Text>
                <Row justify="space-between" style={{ marginTop: 'auto' }}>
                  <Text w={600} num>{rs(p.price)}</Text>
                  <Text v="xs" c={low ? 'redFg' : 'fg3'} num>{p.stock}</Text>
                </Row>
              </Pressable>
            );
          })}
        </Row>
      </Screen>
      <View style={{ position: 'absolute', start: 0, end: 0, bottom: 0, padding: space.gutter, paddingTop: 12, backgroundColor: tk.glass, borderTopWidth: 1, borderTopColor: tk.line }}>
        <Pressable accessibilityRole="button" disabled={!count} onPress={() => router.push('/cart')}
          style={({ pressed }) => ({ height: 52, borderRadius: radius.md, backgroundColor: tk.accent, opacity: count ? 1 : 0.45, paddingHorizontal: 20, flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
          <Text w={600} c="accentFg">{count} {t('items', 'آئٹمز')}</Text>
          <Text c="accentFg" style={{ opacity: 0.6 }}>·</Text>
          <Text w={700} c="accentFg" num>{rs(total)}</Text>
          <View style={{ flex: 1 }} />
          <Text w={600} c="accentFg">{t('View cart', 'کارٹ')}</Text>
          <Icon name="chev" size={18} color="accentFg" flip />
        </Pressable>
      </View>
    </View>
  );
}
