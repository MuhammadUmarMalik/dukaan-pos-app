import { Tabs } from 'expo-router';
import { TabBar } from '@/ui/TabBar';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="items" />
      <Tabs.Screen name="sell" />
      <Tabs.Screen name="khata" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}
