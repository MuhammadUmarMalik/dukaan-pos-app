import { useRouter } from 'expo-router';
import { useState } from 'react';
import { reorderQty } from '@/lib/books';
import { lineTotal, rs } from '@/lib/money';
import { parsePaisa } from '@/lib/product';
import { useBooks } from '@/state/books';
import { useKhata } from '@/state/khata';
import { useProducts } from '@/state/products';
import { useT } from '@/theme';
import { Button, Card, Col, Field, Row, Screen, Text } from '@/ui/kit';
import { Header, Li, List, Pick, Stepper } from '@/ui/parts';

type L = { productId: string; qty: number; cost: number };

export default function NewPurchase() {
  const t = useT();
  const router = useRouter();
  const suppliers = useKhata((s) => s.parties).filter((p) => p.kind === 'supplier');
  const entry = useKhata((s) => s.entry);
  const { items, move } = useProducts();
  const addPurchase = useBooks((s) => s.addPurchase);
  const live = items.filter((p) => !p.archived);
  const [sup, setSup] = useState(suppliers[0]?.id ?? '');
  const [lines, setLines] = useState<L[]>([]);
  const [pay, setPay] = useState<'cash' | 'credit' | 'part'>('credit');
  const [part, setPart] = useState('');
  const [pickId, setPickId] = useState('');
  const total = lines.reduce((a, l) => a + lineTotal({ qty: l.qty, price: l.cost }), 0);
  const paid = pay === 'cash' ? total : pay === 'part' ? Math.min(parsePaisa(part) ?? 0, total) : 0;
  const addLine = (id: string, qty = 1) => {
    const p = live.find((x) => x.id === id);
    if (!p || lines.some((l) => l.productId === id)) return;
    setLines((ls) => [...ls, { productId: id, qty: Math.max(1, qty), cost: p.cost }]);
  };
  const save = () => {
    const pu = addPurchase({ supplierId: sup, lines, total, paid });
    lines.forEach((l) => move(l.productId, l.qty, `Purchase ${pu.no}`));
    entry(sup, { note: `Purchase ${pu.no}`, amount: total });
    if (paid) entry(sup, { note: `Paid for ${pu.no}`, amount: -paid, mode: 'Cash' });
    router.back();
  };
  if (!suppliers.length) return <Screen><Header title={t('New purchase', 'نئی خریداری')} /><Text c="fg3">{t('Add a supplier in Khata first.', 'پہلے کھاتے میں سپلائر شامل کریں۔')}</Text><Button label={t('Add supplier', 'سپلائر شامل')} onPress={() => router.push('/add-party?kind=supplier')} /></Screen>;
  return (
    <Screen>
      <Header title={t('New purchase', 'نئی خریداری')} home="/purchases" />
      <Col gap={8}><Text v="small" c="fg2" w={500}>{t('Supplier', 'سپلائر')}</Text><Pick value={sup} onChange={setSup} options={suppliers.map((s) => [s.id, t(s.name, s.ur)] as [string, string])} /></Col>
      {lines.length ? (
        <List>
          {lines.map((l) => {
            const p = live.find((x) => x.id === l.productId)!;
            return <Li key={l.productId} title={t(p.name, p.ur)} sub={`${rs(l.cost)} ${t('each', 'فی')}`}
              right={<Row gap={10}><Stepper value={l.qty} label={p.name} onStep={(d) => setLines((ls) => ls.map((x) => (x.productId === l.productId ? { ...x, qty: x.qty + d } : x)).filter((x) => x.qty > 0))} /><Text w={600} num style={{ minWidth: 72, textAlign: 'right' }}>{rs(lineTotal({ qty: l.qty, price: l.cost }))}</Text></Row>} />;
          })}
        </List>
      ) : <Card><Text c="fg3" style={{ textAlign: 'center' }}>{t('No items yet', 'ابھی کوئی آئٹم نہیں')}</Text></Card>}
      <Col gap={8}>
        <Text v="small" c="fg2" w={500}>{t('Add item', 'آئٹم شامل')}</Text>
        <Pick value={pickId} onChange={(id) => { setPickId(id); addLine(id); }} options={live.filter((p) => !lines.some((l) => l.productId === p.id)).map((p) => [p.id, t(p.name, p.ur)] as [string, string])} />
        <Button kind="sec" icon="plus" label={t('Add low stock items', 'کم اسٹاک شامل')} onPress={() => live.filter((p) => p.stock <= p.min).forEach((p) => addLine(p.id, reorderQty(p.stock, p.min)))} />
      </Col>
      <Col gap={8}>
        <Text v="small" c="fg2" w={500}>{t('Payment', 'ادائیگی')}</Text>
        <Pick value={pay} onChange={setPay} options={[['cash', t('Paid cash', 'نقد ادا')], ['credit', t('On credit', 'ادھار')], ['part', t('Part paid', 'جزوی')]]} />
        {pay === 'part' ? <Field label={t('Amount paid', 'ادا شدہ رقم')} value={part} onChangeText={setPart} keyboardType="decimal-pad" placeholder="0" /> : null}
      </Col>
      <Card><Row justify="space-between"><Text v="h2">{t('Total', 'کل')}</Text><Text v="title" num style={{ fontSize: 26 }}>{rs(total)}</Text></Row></Card>
      <Button label={t('Save purchase and add to stock', 'خریداری محفوظ، اسٹاک میں شامل')} disabled={!lines.length || !sup} onPress={save} />
    </Screen>
  );
}
