import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { reorderQty } from '@/lib/books';
import { rs } from '@/lib/money';
import { whatsapp } from '@/lib/share';
import { useKhata } from '@/state/khata';
import { useProducts } from '@/state/products';
import { useSettings } from '@/state/settings';
import { useT, useTokens } from '@/theme';
import { Icon } from '@/ui/icons';
import { Button, Card, Col, Row, Screen, Text } from '@/ui/kit';
import { Header, Li, List, Note, Pick } from '@/ui/parts';

export default function PurchaseOrder() {
  const t = useT();
  const tk = useTokens();
  const shop = useSettings((s) => s.shop);
  const suppliers = useKhata((s) => s.parties).filter((p) => p.kind === 'supplier');
  const low = useProducts((s) => s.items).filter((p) => !p.archived && p.stock <= p.min);
  const [sup, setSup] = useState(suppliers[0]?.id ?? '');
  const [off, setOff] = useState<string[]>([]);
  const on = low.filter((p) => !off.includes(p.id));
  const total = on.reduce((a, p) => a + reorderQty(p.stock, p.min) * p.cost, 0);
  const s = suppliers.find((x) => x.id === sup);
  const text = [`Assalam o Alaikum${s ? ` ${s.name}` : ''}, order from ${shop.name}:`, ...on.map((p) => `- ${p.name}: ${reorderQty(p.stock, p.min)} ${p.unit}`), 'Shukriya.'].join('\n');
  return (
    <Screen>
      <Header title={t('Purchase order', 'خریداری آرڈر')} home="/purchases" />
      <Note text={t('Suggested from your stock alerts: each item is refilled to twice its alert level.', 'اسٹاک الرٹس کے مطابق تجویز: ہر آئٹم الرٹ حد کے دو گنا تک۔')} />
      {suppliers.length ? <Col gap={8}><Text v="small" c="fg2" w={500}>{t('Order from', 'آرڈر کس سے')}</Text><Pick value={sup} onChange={setSup} options={suppliers.map((x) => [x.id, t(x.name, x.ur)] as [string, string])} /></Col> : null}
      {low.length ? (
        <List>
          {low.map((p) => {
            const checked = !off.includes(p.id);
            const q = reorderQty(p.stock, p.min);
            return (
              <Pressable key={p.id} accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={p.name} onPress={() => setOff((o) => (checked ? [...o, p.id] : o.filter((x) => x !== p.id)))}>
                <Row gap={0}>
                  <View style={{ paddingStart: 16 }}>
                    <View style={{ width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: checked ? tk.accent : tk.surface, borderWidth: checked ? 0 : 1.5, borderColor: tk.line2 }}>{checked ? <Icon name="check" size={16} color="accentFg" /> : null}</View>
                  </View>
                  <View style={{ flex: 1 }}><Li title={t(p.name, p.ur)} sub={`${t('Have', 'موجود')} ${p.stock}, ${t('alert at', 'الرٹ')} ${p.min}`}
                    right={<View style={{ alignItems: 'flex-end' }}><Text w={600} num>{q} {p.unit}</Text><Text v="xs" c="fg3" num>{rs(q * p.cost)}</Text></View>} /></View>
                </Row>
              </Pressable>
            );
          })}
        </List>
      ) : <Text c="fg3" style={{ textAlign: 'center', padding: 20 }}>{t('Nothing to reorder right now.', 'ابھی کچھ منگوانا نہیں۔')}</Text>}
      <Card><Row justify="space-between"><Text c="fg2">{t('Estimated cost', 'متوقع لاگت')}</Text><Text v="title" num style={{ fontSize: 24 }}>{rs(total)}</Text></Row></Card>
      <Button icon="chat" label={t('Send on WhatsApp', 'واٹس ایپ پر بھیجیں')} disabled={!on.length} onPress={() => whatsapp(text, s?.phone)} />
    </Screen>
  );
}
