import { Tabs } from 'expo-router';
import { Home, BookOpen, Trophy, Flame, User } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { HeaderActions } from '../../components/HeaderActions';

export default function TabLayout() {
  const { c } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: {
          backgroundColor: c.tabBar,
          borderTopColor: c.border,
          paddingTop: 4,
          height: 88,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: c.header },
        headerTitleStyle: { fontWeight: '700', color: c.text },
        headerShadowVisible: false,
        headerRight: () => <HeaderActions />,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          headerTitle: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="training"
        options={{
          title: 'Trainings',
          headerTitle: 'My Trainings',
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaderboard',
          headerTitle: 'Leaderboard',
          tabBarIcon: ({ color, size }) => <Trophy color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: 'Rewards',
          headerTitle: 'Rewards & Badges',
          tabBarIcon: ({ color, size }) => <Flame color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerTitle: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
      {/* Certificates stay reachable from Profile; not a main tab */}
      <Tabs.Screen name="certificates" options={{ href: null, title: 'Certificates' }} />
    </Tabs>
  );
}
