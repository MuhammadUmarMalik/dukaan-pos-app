import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useSettings } from '@/state/settings';
import { useT } from '@/theme';
import { Button, Field } from '@/ui/kit';
import { OnbShell } from '@/ui/Onboarding';

export default function Shop() {
  const t = useT();
  const router = useRouter();
  const { shop, set } = useSettings();
  const [name, setName] = useState(shop.name);
  const [owner, setOwner] = useState(shop.owner);
  const [city, setCity] = useState(shop.city);
  return (
    <OnbShell step={3} title={t('About your shop', 'آپ کی دکان')}>
      <Field label={t('Shop name', 'دکان کا نام')} value={name} onChangeText={setName} />
      <Field label={t('Owner name', 'مالک کا نام')} value={owner} onChangeText={setOwner} />
      <Field label={t('City', 'شہر')} value={city} onChangeText={setCity} />
      <Button label={t('Continue', 'جاری رکھیں')} disabled={!name.trim()} onPress={() => { set({ shop: { ...shop, name: name.trim(), owner: owner.trim(), city: city.trim() } }); router.push('/onboarding/category'); }} />
    </OnbShell>
  );
}
