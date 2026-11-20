import { useProducts } from '@/state/products';
import { useSettings } from '@/state/settings';
import { shareText } from '@/lib/share';
import { useT } from '@/theme';
import { Button, Card, Col, Row, Screen, Text, Toggle } from '@/ui/kit';
import { Header, Li, List, Note } from '@/ui/parts';

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'my-shop';

// ponytail: the switches are saved; the public page and incoming orders need the backend (Firestore + a hosted page).
export default function Catalog() {
  const t = useT();
  const { shop, tog, set } = useSettings();
  const count = useProducts((s) => s.items.filter((p) => !p.archived).length);
  const link = `dukaan.app/${slug(shop.name)}`;
  const sw = (k: string, l: string) => <Li key={k} title={l} right={<Toggle label={l} on={tog[k]} onChange={(v) => set({ tog: { ...tog, [k]: v } })} />} />;
  return (
    <Screen>
      <Header title={t('Online catalog', 'آن لائن کیٹلاگ')} />
      <Card pad={0}><Li title={t('Show my shop online', 'میری دکان آن لائن دکھائیں')} sub={t('Customers browse items and send an order on WhatsApp', 'گاہک آئٹمز دیکھ کر واٹس ایپ پر آرڈر بھیجتے ہیں')} right={<Toggle label={t('Show my shop online', 'میری دکان آن لائن دکھائیں')} on={tog.catOn} onChange={(v) => set({ tog: { ...tog, catOn: v } })} />} /></Card>
      {tog.catOn ? (
        <>
          <Card shell>
            <Col gap={12}>
              <Text v="label" c="fg3">{t('Your link', 'آپ کا لنک')}</Text>
              <Text mono style={{ fontSize: 15 }}>{link}</Text>
              <Row gap={10}><Button small kind="pri" icon="chat" label={t('Share', 'شیئر')} onPress={() => shareText(`${shop.name}: https://${link}`)} /></Row>
            </Col>
          </Card>
          <Note tone="blue" text={t('Your page goes live when the online service is set up. Your settings are saved.', 'آن لائن سروس سیٹ ہوتے ہی آپ کا صفحہ چلے گا۔ ترتیبات محفوظ ہیں۔')} />
          <List>{[sw('cprice', t('Show prices', 'قیمتیں دکھائیں')), sw('cord', t('Accept orders', 'آرڈر قبول کریں')), sw('cdel', t('Offer home delivery', 'ہوم ڈیلیوری')), <Li key="n" title={t('Items shown', 'دکھائے گئے آئٹمز')} right={<Text w={600} num>{count}</Text>} />]}</List>
        </>
      ) : <Card><Text c="fg3" style={{ textAlign: 'center', paddingVertical: 20 }}>{t('Turn on to get your link.', 'لنک کے لیے آن کریں۔')}</Text></Card>}
    </Screen>
  );
}
