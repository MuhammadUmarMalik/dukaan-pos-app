import { rs } from '@/lib/money';
import { cloudReady } from '@/lib/firebase';
import { shareText } from '@/lib/share';
import { useBooks } from '@/state/books';
import { due, useKhata } from '@/state/khata';
import { useProducts } from '@/state/products';
import { useSettings } from '@/state/settings';
import { useT } from '@/theme';
import { Badge, Card, Screen, Text, Toggle } from '@/ui/kit';
import { Header, Li, List, Note } from '@/ui/parts';

// Exports go through the phone's share sheet as CSV text, which opens in Excel and Google Sheets.
// ponytail: cloud backup needs the sync phase; until then data lives only on this phone, and the note says so.
export default function Backup() {
  const t = useT();
  const { tog, set } = useSettings();
  const items = useProducts((s) => s.items);
  const sales = useBooks((s) => s.sales);
  const parties = useKhata((s) => s.parties);
  const csv = {
    products: ['name,unit,price,cost,stock,barcode', ...items.map((p) => `"${p.name}",${p.unit},${p.price / 100},${p.cost / 100},${p.stock},${p.codes[0] ?? ''}`)].join('\n'),
    sales: ['bill,date,mode,total', ...sales.map((s) => `${s.bill},${new Date(s.at).toISOString()},${s.mode},${s.total / 100}`)].join('\n'),
    khata: ['name,type,phone,balance', ...parties.map((p) => `"${p.name}",${p.kind},${p.phone},${due(p) / 100}`)].join('\n'),
  };
  return (
    <Screen>
      <Header title={t('Backup and export', 'بیک اپ اور ایکسپورٹ')} />
      <Note tone={cloudReady ? 'blue' : 'yel'} text={t('Your data is saved on this phone. Online backup starts when your shop is synced to the cloud.', 'آپ کا ڈیٹا اس فون پر محفوظ ہے۔ دکان کلاؤڈ سے جڑنے پر آن لائن بیک اپ شروع ہوگا۔')} />
      <List>{[<Li key="a" title={t('Automatic backup', 'خودکار بیک اپ')} sub={t('Every night on Wi-Fi', 'ہر رات وائی فائی پر')} right={<Toggle label={t('Automatic backup', 'خودکار بیک اپ')} on={tog.bka} onChange={(v) => set({ tog: { ...tog, bka: v } })} />} />]}</List>
      <Text v="h2">{t('Export', 'ایکسپورٹ')}</Text>
      <List>
        <Li icon="down" title={t('Products', 'آئٹمز')} sub={`${items.length}`} right={<Badge tone="blue" label="CSV" />} onPress={() => shareText(csv.products, 'products.csv')} />
        <Li icon="down" title={t('Sales', 'فروخت')} sub={`${sales.length}`} right={<Badge tone="blue" label="CSV" />} onPress={() => shareText(csv.sales, 'sales.csv')} />
        <Li icon="down" title={t('Customer khata', 'کسٹمر کھاتہ')} sub={rs(parties.filter((p) => p.kind === 'customer').reduce((a, p) => a + due(p), 0))} right={<Badge tone="blue" label="CSV" />} onPress={() => shareText(csv.khata, 'khata.csv')} />
      </List>
      <Card><Text v="small" c="fg3">{t('Open the file in Excel or Google Sheets after sharing it to yourself.', 'خود کو شیئر کرنے کے بعد فائل ایکسل یا گوگل شیٹس میں کھولیں۔')}</Text></Card>
    </Screen>
  );
}
