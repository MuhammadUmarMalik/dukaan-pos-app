import { useRouter } from 'expo-router';
import { PERMS } from '@/data/seed';
import { useSettings } from '@/state/settings';
import { useT } from '@/theme';
import { Badge, Card, IconButton, Screen, Text, Toggle } from '@/ui/kit';
import { Header, initials, Li, List } from '@/ui/parts';

// ponytail: staff and permissions are local. With Firebase, owners invite by email, and these switches become
// member documents that Security Rules and Cloud Functions read (RULES.md #2, #4).

export default function StaffScreen() {
  const t = useT();
  const router = useRouter();
  const { staff, tog, set } = useSettings();
  const role = { owner: [t('Owner', 'مالک'), 'acc'], manager: [t('Manager', 'مینیجر'), 'grn'], cashier: [t('Cashier', 'کیشیئر'), 'blue'] } as const;
  return (
    <Screen>
      <Header title={t('Staff', 'اسٹاف')} right={<IconButton icon="plus" label={t('Add staff', 'اسٹاف شامل')} onPress={() => router.push('/add-staff')} />} />
      <List>{staff.map((s, i) => <Li key={s.id} initials={initials(s.name)} tone={(['acc', 'blue', 'grn', 'yel'] as const)[i % 4]} title={s.name} sub={s.phone || undefined} right={<Badge tone={role[s.role][1]} label={role[s.role][0]} />} />)}</List>
      <Text v="h2">{t('What cashiers can do', 'کیشیئر کیا کر سکتا ہے')}</Text>
      <List>{PERMS.map(([k, en, ur]) => [k, t(en, ur)] as const).map(([k, l]) => <Li key={k} title={l} right={<Toggle label={l} on={tog[k]} onChange={(v) => set({ tog: { ...tog, [k]: v } })} />} />)}</List>
      <Card pad={0}><Li icon="shield" title={<Text v="small" c="fg2">{t('Every sale, edit and delete is saved in the activity log.', 'ہر فروخت، تبدیلی اور حذف ایکٹیویٹی لاگ میں محفوظ ہوتا ہے۔')}</Text>} /></Card>
    </Screen>
  );
}
