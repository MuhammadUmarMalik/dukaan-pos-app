import { useRouter } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { rs } from '@/lib/money';
import { due, lastAt, shortDate, useKhata } from '@/state/khata';
import { radius, useRtl, useT, useTokens } from '@/theme';
import { Icon } from '@/ui/icons';
import { IconButton, Row, Screen, Text } from '@/ui/kit';
import { initials, Li, List, Seg, Stats } from '@/ui/parts';

export default function Khata() {
  const t = useT();
  const tk = useTokens();
  const rtl = useRtl();
  const router = useRouter();
  const parties = useKhata((s) => s.parties);
  const [kind, setKind] = useState<'customer' | 'supplier'>('customer');
  const [q, setQ] = useState('');
  const get = parties.filter((p) => p.kind === 'customer').reduce((a, p) => a + Math.max(0, due(p)), 0);
  const pay = parties.filter((p) => p.kind === 'supplier').reduce((a, p) => a + Math.max(0, due(p)), 0);
  const list = parties.filter((p) => p.kind === kind && (p.name + p.ur + p.phone).toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => due(b) - due(a));
  const tones = ['blue', 'grn', 'yel', 'acc', 'red'] as const;
  return (
    <Screen>
      <Row justify="space-between">
        <Text v="title" accessibilityRole="header" style={{ fontSize: 24 }}>{t('Khata', 'کھاتہ')}</Text>
        <IconButton icon="plus" label={t('Add customer or supplier', 'گاہک یا سپلائر شامل')} onPress={() => router.push(`/add-party?kind=${kind}`)} />
      </Row>
      <Stats items={[[t('You will get', 'آپ کو ملنے ہیں'), rs(get), 'accent'], [t('You will pay', 'آپ کو دینے ہیں'), rs(pay)]]} />
      <Seg value={kind} onChange={setKind} options={[['customer', t('Customers', 'گاہک')], ['supplier', t('Suppliers', 'سپلائرز')]]} />
      <Row gap={10} style={{ height: 52, paddingHorizontal: 14, borderRadius: radius.md - 1, backgroundColor: tk.surface, borderWidth: 1, borderColor: tk.line2 }}>
        <Icon name="search" size={18} color="fg3" />
        <TextInput accessibilityLabel={t('Search', 'تلاش')} value={q} onChangeText={setQ} placeholder={t('Search name or phone', 'نام یا فون')} placeholderTextColor={tk.fg3}
          style={{ flex: 1, height: '100%', color: tk.fg, fontSize: 15, textAlign: rtl ? 'right' : 'left', fontFamily: rtl ? 'NotoNaskhArabic_400Regular' : 'Geist_400Regular' }} />
      </Row>
      {list.length ? (
        <List>
          {list.map((p, i) => {
            const d = due(p);
            return (
              <Li key={p.id} initials={initials(p.name)} tone={tones[i % 5]} title={t(p.name, p.ur)} sub={`${p.area} · ${shortDate(lastAt(p))}`}
                onPress={() => router.push(`/ledger/${p.id}`)}
                right={<Text w={600} num c={d > 0 ? (kind === 'customer' ? 'redFg' : 'fg') : 'fg3'}>{d ? rs(d) : t('Settled', 'ادا')}</Text>} />
            );
          })}
        </List>
      ) : <View style={{ padding: 28 }}><Text c="fg3" style={{ textAlign: 'center' }}>{t('Nobody here yet. Tap + to add.', 'ابھی کوئی نہیں۔ + دبائیں۔')}</Text></View>}
    </Screen>
  );
}
