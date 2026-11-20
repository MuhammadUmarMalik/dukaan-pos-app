import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import type { Product } from '@/data/seed';
import { rs } from '@/lib/money';
import { useCart } from '@/state/cart';
import { useProducts } from '@/state/products';
import { useScan } from '@/state/scan';
import { useT, useTokens } from '@/theme';
import { Badge, Button, Card, Col, Field, IconButton, Row, Screen, Text } from '@/ui/kit';

type From = 'sell' | 'items' | 'form';
type Hit = { code: string; product?: Product };

// Cameras only exist on the phone. On web (and when permission is refused) the typed-code box below does the same job.
// ponytail: the camera path is untested here: needs a development build on a real device (docs/testing.md).
export default function Scan() {
  const t = useT();
  const tk = useTokens();
  const router = useRouter();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/items'));
  const { from = 'items' } = useLocalSearchParams<{ from?: From }>();
  const [perm, ask] = useCameraPermissions();
  const byCode = useProducts((s) => s.byCode);
  const add = useCart((s) => s.add);
  const [hit, setHit] = useState<Hit | null>(null);
  const [added, setAdded] = useState('');
  const [torch, setTorch] = useState(false);
  const [manual, setManual] = useState('');
  const last = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const handle = (raw: string) => {
    const code = raw.trim();
    const now = Date.now();
    if (!code || now - last.current < 1500) return; // the camera reports the same code many times a second
    last.current = now;
    const product = byCode(code);
    if (from === 'form') { useScan.getState().set(code); back(); return; }
    if (from === 'sell' && product) {
      add(product.id);
      setAdded(product.name);
      setHit(null);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setAdded(''), 1600); // keep scanning the next item
      return;
    }
    setAdded('');
    setHit({ code, product });
  };

  const cameraOn = Platform.OS !== 'web' && perm?.granted && !hit;
  const corner = (pos: object) => <View style={[{ position: 'absolute', width: 34, height: 34, borderColor: '#fff', borderRadius: 6 }, pos]} />;

  return (
    <Screen>
      <Row justify="space-between">
        <IconButton icon="back" label={t('Back', 'واپس')} onPress={back} />
        <Text v="h2">{t('Scan barcode', 'بارکوڈ اسکین')}</Text>
        {Platform.OS !== 'web' ? <IconButton icon="bolt" label={t('Torch', 'ٹارچ')} onPress={() => setTorch((x) => !x)} /> : <View style={{ width: 44 }} />}
      </Row>

      <View style={{ height: 340, borderRadius: 24, overflow: 'hidden', backgroundColor: '#0A0B0B', alignItems: 'center', justifyContent: 'center' }}>
        {cameraOn ? (
          <CameraView
            style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} enableTorch={torch}
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'] }}
            onBarcodeScanned={({ data }) => handle(data)}
          />
        ) : null}
        {cameraOn ? (
          <View style={{ position: 'absolute', top: 70, bottom: 70, start: 36, end: 36 }} pointerEvents="none">
            {corner({ top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 })}{corner({ top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 })}
            {corner({ bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 })}{corner({ bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 })}
          </View>
        ) : (
          <Col gap={12} style={{ padding: 24, alignItems: 'center' }}>
            {Platform.OS === 'web' ? (
              <Text c="fg3" style={{ textAlign: 'center', color: '#B7BBBE' }}>{t('The camera works in the phone app. Type the code below.', 'کیمرہ فون ایپ میں کام کرتا ہے۔ نیچے کوڈ لکھیں۔')}</Text>
            ) : hit ? (
              <Text style={{ color: '#B7BBBE', textAlign: 'center' }}>{t('Code read', 'کوڈ پڑھ لیا')}</Text>
            ) : perm && !perm.granted ? (
              <>
                <Text style={{ color: '#B7BBBE', textAlign: 'center' }}>{t('Allow the camera to scan barcodes.', 'بارکوڈ اسکین کے لیے کیمرہ کی اجازت دیں۔')}</Text>
                <Button block={false} small label={t('Allow camera', 'کیمرہ کی اجازت')} onPress={ask} />
              </>
            ) : null}
          </Col>
        )}
        {cameraOn ? <Text style={{ position: 'absolute', bottom: 18, color: '#D8DAD9' }}>{t('Hold the barcode inside the frame', 'بارکوڈ فریم کے اندر رکھیں')}</Text> : null}
        {added ? (
          <View accessibilityLiveRegion="polite" style={{ position: 'absolute', top: 14, start: 14, end: 14, padding: 12, borderRadius: 14, backgroundColor: tk.accent }}>
            <Text w={600} c="accentFg">{t(`Added ${added}`, `${added} شامل`)}</Text>
          </View>
        ) : null}
      </View>

      {hit ? (
        <Card>
          <Col gap={12}>
            <Row justify="space-between"><Text mono>{hit.code}</Text><Badge tone={hit.product ? 'grn' : 'yel'} label={hit.product ? t('In catalog', 'کیٹلاگ میں') : t('New code', 'نیا کوڈ')} /></Row>
            {hit.product ? (
              <>
                <Row gap={12}><View style={{ flex: 1 }}><Text w={600}>{t(hit.product.name, hit.product.ur)}</Text><Text v="small" c="fg3" num>{rs(hit.product.price)} · {hit.product.stock} {hit.product.unit}</Text></View></Row>
                <Button label={t('Edit product', 'آئٹم ایڈیٹ')} onPress={() => router.replace(`/product-form?id=${hit.product!.id}`)} />
              </>
            ) : (
              <>
                <Text c="fg2">{t('This barcode is not in your catalog yet.', 'یہ بارکوڈ ابھی آپ کے کیٹلاگ میں نہیں۔')}</Text>
                <Button label={t('Add as new product', 'نیا آئٹم بنائیں')} onPress={() => router.replace(`/product-form?code=${encodeURIComponent(hit.code)}`)} />
              </>
            )}
            <Button kind="ghost" label={t('Scan another', 'دوسرا اسکین')} onPress={() => { setHit(null); last.current = 0; }} />
          </Col>
        </Card>
      ) : null}

      <Card>
        <Col gap={12}>
          <Field label={t('Type the code', 'کوڈ لکھیں')} value={manual} onChangeText={(s) => setManual(s.replace(/\s/g, ''))} keyboardType="numeric" placeholder="8961001000011" autoCapitalize="none" />
          <Button kind="sec" label={t('Look up', 'تلاش کریں')} disabled={manual.length < 4} onPress={() => { last.current = 0; handle(manual); setManual(''); }} />
        </Col>
      </Card>
    </Screen>
  );
}
