import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { restore } from '@/lib/billing';
import { useT, useTokens } from '@/theme';
import { Icon } from '@/ui/icons';
import { Button, Col, Screen, Text } from '@/ui/kit';
import { toast } from '@/ui/parts';

export default function Paywall() {
  const t = useT();
  const tk = useTokens();
  const router = useRouter();
  return (
    <Screen>
      <Col gap={20} style={{ alignItems: 'center', paddingTop: 40 }}>
        <View style={{ width: 60, height: 60, borderRadius: 20, backgroundColor: tk.redBg, alignItems: 'center', justifyContent: 'center' }}><Icon name="lock" size={28} color="redFg" /></View>
        <Col gap={8} style={{ alignItems: 'center' }}>
          <Text v="title" style={{ textAlign: 'center' }}>{t('Selling is paused', 'فروخت رکی ہوئی ہے')}</Text>
          <Text c="fg2" style={{ textAlign: 'center', maxWidth: 340 }}>{t('Your shop data is safe. You can look at everything and export it. Selling starts again when your subscription is active.', 'آپ کا ڈیٹا محفوظ ہے۔ سب کچھ دیکھ اور ایکسپورٹ کر سکتے ہیں۔ سبسکرپشن فعال ہوتے ہی فروخت دوبارہ شروع ہوگی۔')}</Text>
        </Col>
      </Col>
      <Button label={t('Subscribe again', 'دوبارہ سبسکرائب')} onPress={() => router.push('/pay-plan')} />
      <Button kind="sec" label={t('Restore purchases', 'خریداری بحال کریں')} onPress={async () => toast((await restore()) ? t('Purchases restored', 'خریداری بحال') : t('Store purchases work in the phone app from the store', 'خریداری اسٹور والی فون ایپ میں ہوگی'))} />
      <Button kind="ghost" label={t('Export my data', 'میرا ڈیٹا ایکسپورٹ')} onPress={() => router.push('/backup')} />
      <Button kind="ghost" label={t('View my shop, read-only', 'دکان دیکھیں، صرف پڑھنے کے لیے')} onPress={() => router.replace('/(tabs)')} />
      <Text v="xs" c="fg3" style={{ textAlign: 'center' }}>{t('Only the shop owner can subscribe. Staff: ask the owner.', 'صرف مالک سبسکرائب کر سکتا ہے۔ اسٹاف: مالک سے کہیں۔')}</Text>
    </Screen>
  );
}
