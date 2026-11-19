import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { CATEGORIES } from '@/data/seed';
import { useSettings } from '@/state/settings';
import { radius, useT, useTokens } from '@/theme';
import { Icon } from '@/ui/icons';
import { Button, Row, Text } from '@/ui/kit';
import { OnbShell } from '@/ui/Onboarding';

export default function Category() {
  const t = useT();
  const tk = useTokens();
  const router = useRouter();
  const { category, set } = useSettings();
  return (
    <OnbShell step={4} title={t('What do you sell?', 'آپ کیا بیچتے ہیں؟')} sub={t('We set the app up to fit your shop. You can change everything later.', 'ہم آپ کی دکان کے مطابق ایپ سیٹ کریں گے۔ بعد میں سب کچھ بدل سکتے ہیں۔')}>
      <Row gap={10} wrap align="stretch">
        {CATEGORIES.map((c) => {
          const on = c.k === category;
          return (
            <Pressable key={c.k} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={t(...c.n)}
              onPress={() => set({ category: c.k, flags: { barcode: c.barcode, expiry: c.expiry } })}
              style={{ width: '48%', minHeight: 104, padding: 16, gap: 12, borderRadius: radius.lg, backgroundColor: on ? tk.accentSoft : tk.surface, borderWidth: on ? 2 : 1, borderColor: on ? tk.accent : tk.line }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: on ? tk.surface : tk.surface2, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={c.icon as never} color={on ? 'accent' : 'fg'} />
              </View>
              <Text w={600}>{t(...c.n)}</Text>
              {on ? <View style={{ position: 'absolute', top: 10, end: 10, width: 20, height: 20, borderRadius: 10, backgroundColor: tk.accent, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={13} color="accentFg" /></View> : null}
            </Pressable>
          );
        })}
      </Row>
      <Button label={t('Continue', 'جاری رکھیں')} onPress={() => router.push('/onboarding/setup')} />
    </OnbShell>
  );
}
