import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { running } from '@/lib/books';
import { rs } from '@/lib/money';
import { call } from '@/lib/share';
import { due, shortDate, useKhata } from '@/state/khata';
import { useT } from '@/theme';
import { Badge, Button, Card, IconButton, Row, Screen, Text } from '@/ui/kit';
import { Header, Li, List, toast } from '@/ui/parts';

export default function Ledger() {
  const t = useT();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = useKhata((s) => s.parties.find((x) => x.id === id));
  const archive = useKhata((s) => s.archive);
  if (!p) return <Redirect href="/(tabs)/khata" />;
  const d = due(p);
  const rows = running(p.entries).reverse();
  const cust = p.kind === 'customer';
  return (
    <Screen>
      <Header title={t(p.name, p.ur)} home="/(tabs)/khata" right={<IconButton icon="list" label={t('Edit', 'ایڈیٹ')} onPress={() => router.push(`/add-party?id=${p.id}`)} />} />
      <Card shell>
        <Text v="label" c="fg3">{cust ? t('Balance due', 'باقی رقم') : t('You owe', 'آپ نے دینے ہیں')}</Text>
        <Text v="big" num c={d > 0 && cust ? 'redFg' : 'fg'} style={{ marginTop: 6 }}>{rs(d)}</Text>
        <Text v="small" c="fg3" style={{ marginTop: 6 }}>{p.area}{p.phone ? ` · ${p.phone}` : ''}</Text>
        {p.archived ? <Badge tone="yel" label={t('Archived', 'آرکائیو')} /> : null}
      </Card>
      {p.phone ? <Button kind="sec" icon="phone" label={t('Call', 'کال')} onPress={() => call(p.phone)} /> : null}
      <Row gap={10}>
        <View style={{ flex: 1 }}><Button icon="wallet" label={cust ? t('Received', 'وصول') : t('Paid', 'ادا کیا')} onPress={() => router.push(`/receive?id=${p.id}`)} /></View>
        {cust ? <View style={{ flex: 1 }}><Button kind="sec" icon="chat" label={t('Remind', 'یاد دہانی')} disabled={d <= 0} onPress={() => router.push(`/reminder?id=${p.id}`)} /></View> : null}
      </Row>
      <Button kind="ghost" icon="down" label={t('Statement', 'اسٹیٹمنٹ')} onPress={() => router.push(`/statement?id=${p.id}`)} />
      {rows.length ? (
        <List>
          {rows.map((r) => (
            <Li key={r.id} title={r.note} sub={`${shortDate(r.at)}${r.mode ? ` · ${r.mode}` : ''}`}
              right={<View style={{ alignItems: 'flex-end' }}>
                <Text w={600} num c={r.amount > 0 ? 'redFg' : 'accent'}>{r.amount > 0 ? '+' : '-'}{rs(Math.abs(r.amount))}</Text>
                <Text v="xs" c="fg3" num>{t('Bal', 'بیلنس')} {rs(r.bal)}</Text>
              </View>} />
          ))}
        </List>
      ) : <Text c="fg3" style={{ textAlign: 'center', padding: 20 }}>{t('No entries yet.', 'ابھی کوئی اندراج نہیں۔')}</Text>}
      <Button kind="ghost" label={p.archived ? t('Restore', 'بحال کریں') : t('Archive', 'آرکائیو کریں')} onPress={() => {
        archive(p.id, !p.archived);
        toast(p.archived ? t('Restored', 'بحال ہو گیا') : d ? t('Archived. The balance and history are kept.', 'آرکائیو۔ بیلنس اور ریکارڈ محفوظ ہیں۔') : t('Archived', 'آرکائیو ہو گیا'));
        if (!p.archived) router.back();
      }} />
    </Screen>
  );
}
