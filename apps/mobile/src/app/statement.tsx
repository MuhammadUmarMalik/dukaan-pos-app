import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { running } from '@/lib/books';
import { rs } from '@/lib/money';
import { shareText } from '@/lib/share';
import { due, shortDate, useKhata } from '@/state/khata';
import { useSettings } from '@/state/settings';
import { useT } from '@/theme';
import { Button, Row, Screen, Text } from '@/ui/kit';
import { Header, Pick } from '@/ui/parts';

// The statement is printed paper style, always left to right English, like the receipt.
// ponytail: shared as text through the share sheet. A PDF needs expo-print, add it when shopkeepers ask for files.
export default function Statement() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = useKhata((s) => s.parties.find((x) => x.id === id));
  const shop = useSettings((s) => s.shop);
  const [days, setDays] = useState<30 | 90 | 0>(30);
  if (!p) return <Redirect href="/(tabs)/khata" />;
  const from = days ? Date.now() - days * 86_400_000 : 0;
  const rows = running(p.entries).filter((r) => r.at >= from);
  const mono = { fontFamily: 'GeistMono_400Regular', fontSize: 12, lineHeight: 18, color: '#1a1a1a', textAlign: 'left', writingDirection: 'ltr' } as const;
  const text = [`${shop.name}`, `Statement: ${p.name}`, ...rows.map((r) => `${shortDate(r.at)}  ${r.note}  ${r.amount > 0 ? '+' : '-'}${rs(Math.abs(r.amount))}  Bal ${rs(r.bal)}`), `Closing balance: ${rs(due(p))}`].join('\n');
  return (
    <Screen>
      <Header title={t('Statement', 'اسٹیٹمنٹ')} home="/(tabs)/khata" />
      <Pick value={days} onChange={setDays} options={[[30, t('30 days', '30 دن')], [90, t('3 months', '3 ماہ')], [0, t('All time', 'سب')]]} />
      <View style={{ backgroundColor: '#FCFCFA', padding: 16, borderRadius: 6, boxShadow: '0 14px 30px -14px rgba(0,0,0,0.25)' }}>
        <Text style={{ ...mono, fontSize: 15, fontFamily: 'Geist_600SemiBold' }}>{shop.name}</Text>
        <Text style={{ ...mono, color: '#666' }}>{shop.city} · {new Date().toLocaleDateString('en-GB')}</Text>
        <View style={{ borderTopWidth: 1, borderColor: '#ddd', marginVertical: 10 }} />
        <Text style={{ ...mono, color: '#666' }}>ACCOUNT STATEMENT</Text>
        <Text style={{ ...mono, fontSize: 16, fontFamily: 'Geist_600SemiBold', marginBottom: 8 }}>{p.name}</Text>
        {rows.length ? rows.map((r) => (
          <Row key={r.id} justify="space-between" style={{ flexDirection: 'row' }}>
            <Text style={{ ...mono, flex: 1 }} numberOfLines={1}>{shortDate(r.at)} {r.note}</Text>
            <Text style={{ ...mono, width: 84, textAlign: 'right', color: r.amount > 0 ? '#9F2F2D' : '#0E6B57' }}>{r.amount > 0 ? '+' : '-'}{Math.abs(r.amount / 100).toLocaleString('en-US')}</Text>
            <Text style={{ ...mono, width: 84, textAlign: 'right' }}>{(r.bal / 100).toLocaleString('en-US')}</Text>
          </Row>
        )) : <Text style={mono}>No entries in this period.</Text>}
        <View style={{ borderTopWidth: 1, borderColor: '#ddd', marginTop: 10, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ ...mono, fontFamily: 'Geist_600SemiBold' }}>Closing balance</Text>
          <Text style={{ ...mono, fontSize: 15, fontFamily: 'Geist_600SemiBold' }}>{rs(due(p))}</Text>
        </View>
      </View>
      <Button icon="chat" label={t('Share', 'شیئر')} onPress={() => shareText(text, `Statement ${p.name}`)} />
    </Screen>
  );
}
