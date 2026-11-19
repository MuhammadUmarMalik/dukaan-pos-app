import type { BottomTabBarProps } from 'expo-router/build/layouts/Tabs';
import { Pressable, View } from 'react-native';
import { useT, useTokens } from '@/theme';
import { Icon, type IconName } from './icons';
import { Row, Text } from './kit';

const TABS: { name: string; icon: IconName; en: string; ur: string }[] = [
  { name: 'index', icon: 'home', en: 'Home', ur: 'ہوم' },
  { name: 'items', icon: 'box', en: 'Items', ur: 'آئٹمز' },
  { name: 'sell', icon: 'cart', en: 'Sell', ur: 'فروخت' },
  { name: 'khata', icon: 'book', en: 'Khata', ur: 'کھاتہ' },
  { name: 'more', icon: 'grid', en: 'More', ur: 'مزید' },
];

export function TabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  const tk = useTokens();
  const t = useT();
  const { bottom } = insets;
  const current = state.routes[state.index].name;
  return (
    <Row gap={0} align="center" style={{ backgroundColor: tk.glass, borderTopWidth: 1, borderTopColor: tk.line, paddingBottom: Math.max(bottom, 10), height: 72 + Math.max(bottom, 10) - 10 }}>
      {TABS.map((tab) => {
        const on = current === tab.name;
        const label = t(tab.en, tab.ur);
        const center = tab.name === 'sell';
        return (
          <Pressable key={tab.name} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: on }}
            onPress={() => navigateToTab(state.routes.find((r) => r.name === tab.name)!.key)} style={{ flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
            {center ? (
              <View style={{ width: 54, height: 54, borderRadius: 19, marginTop: -22, backgroundColor: tk.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 5, borderColor: tk.bg }}>
                <Icon name="cart" size={26} color="accentFg" />
              </View>
            ) : (
              <Icon name={tab.icon} color={on ? 'accent' : 'fg3'} />
            )}
            <Text v="xs" c={on || center ? (on ? 'accent' : 'fg2') : 'fg3'} w={500}>{label}</Text>
          </Pressable>
        );
      })}
    </Row>
  );
}
