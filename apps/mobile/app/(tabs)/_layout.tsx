import { Tabs } from 'expo-router';
import { Home, BookOpen, Trophy, Award, User } from 'lucide-react-native';
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
          title: 'My Training',
          headerTitle: 'My Training',
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
        name="certificates"
        options={{
          title: 'Certificates',
          headerTitle: 'Certificates',
          tabBarIcon: ({ color, size }) => <Award color={color} size={size} />,
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
    </Tabs>
  );
}
