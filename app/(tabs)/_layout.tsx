import { Tabs } from 'expo-router';
import { BarChart3, Home, PlusCircle, Settings } from 'lucide-react-native';

import { colors } from '../../src/lib/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: '#090B12',
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 72,
          paddingTop: 6,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: ({ color }) => <Home color={color} size={21} /> }} />
      <Tabs.Screen name="add" options={{ title: 'Log', tabBarIcon: ({ color }) => <PlusCircle color={color} size={22} /> }} />
      <Tabs.Screen name="analytics" options={{ title: 'Progress', tabBarIcon: ({ color }) => <BarChart3 color={color} size={21} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Settings', tabBarIcon: ({ color }) => <Settings color={color} size={21} /> }} />
      <Tabs.Screen name="weight" options={{ href: null }} />
      <Tabs.Screen name="foods" options={{ href: null }} />
    </Tabs>
  );
}
