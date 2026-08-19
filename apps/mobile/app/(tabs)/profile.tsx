import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { User, Mail, Building2, Shield, LogOut, Award, Moon, Sun } from 'lucide-react-native';
import { useSyncQueueStore } from '../../stores/syncQueue.store';
import { getCurrentUser, getMyCertificates, getRecognitionProfile, logout } from '../../lib/api';
import { ScreenLoader } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { c, isDark, setMode } = useTheme();
  const clearQueue = useSyncQueueStore((s) => s.clear);

  const { data: user, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['current-user'],
    queryFn: getCurrentUser,
    retry: 1,
  });
  const { data: recognition } = useQuery({
    queryKey: ['recognition'],
    queryFn: getRecognitionProfile,
  });
  const { data: certificates } = useQuery({
    queryKey: ['my-certificates'],
    queryFn: getMyCertificates,
  });

  const handleLogout = async () => {
    clearQueue();
    await logout();
    router.replace('/login');
  };

  if (isLoading) return <ScreenLoader />;

  if (isError && !user) {
    return (
      <View className="flex-1 items-center justify-center p-6" style={{ backgroundColor: c.bg }}>
        <Text className="font-semibold mb-2" style={{ color: c.text }}>
          Could not load profile
        </Text>
        <Text className="text-sm text-center mb-4" style={{ color: c.muted }}>
          {(error as Error)?.message ?? 'Check API connection'}
        </Text>
        <TouchableOpacity
          onPress={() => refetch()}
          className="px-4 py-3 rounded-xl"
          style={{ backgroundColor: c.primary }}
        >
          <Text className="text-white font-semibold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1" style={{ backgroundColor: c.bg }}>
      <View className="px-4 pt-6 pb-8" style={{ backgroundColor: c.primary }}>
        <View className="items-center">
          <View className="w-20 h-20 bg-white/20 rounded-full items-center justify-center mb-3">
            <User color="#ffffff" size={36} />
          </View>
          <Text className="text-white text-xl font-bold">{user?.fullName ?? 'Learner'}</Text>
          <Text className="text-white/75 text-sm mt-0.5">
            {user?.department?.name ?? 'Department'} · {recognition?.learningPoints ?? 0} pts
          </Text>
        </View>
      </View>

      <View className="px-4 -mt-4">
        <View
          className="rounded-2xl p-4 border mb-4"
          style={{ backgroundColor: c.card, borderColor: c.border }}
        >
          <InfoRow icon={Mail} label="Email" value={user?.email ?? '—'} />
          <InfoRow icon={Building2} label="Department" value={user?.department?.name ?? '—'} />
          <InfoRow icon={Shield} label="Role" value={user?.role ?? 'LEARNER'} />
          <InfoRow
            icon={Award}
            label="Streak"
            value={`${recognition?.currentStreak ?? 0} days`}
          />
        </View>

        <View
          className="rounded-2xl p-4 border mb-4"
          style={{ backgroundColor: c.card, borderColor: c.border }}
        >
          <Text className="font-semibold mb-3" style={{ color: c.text }}>
            Appearance
          </Text>
          <TouchableOpacity
            onPress={() => setMode(isDark ? 'light' : 'dark')}
            className="flex-row items-center gap-3 py-2"
          >
            {isDark ? <Sun color={c.muted} size={18} /> : <Moon color={c.muted} size={18} />}
            <Text style={{ color: c.text }}>{isDark ? 'Switch to light' : 'Switch to dark'}</Text>
          </TouchableOpacity>
        </View>

        <View
          className="rounded-2xl p-4 border mb-4"
          style={{ backgroundColor: c.card, borderColor: c.border }}
        >
          <View className="flex-row justify-between items-center mb-2">
            <Text className="font-semibold" style={{ color: c.text }}>
              Certificates
            </Text>
            <TouchableOpacity onPress={() => router.push('/certificates')}>
              <Text className="text-sm font-semibold" style={{ color: c.primary }}>
                View all
              </Text>
            </TouchableOpacity>
          </View>
          {(certificates ?? []).slice(0, 3).map((cert) => (
            <View key={cert.id} className="flex-row items-center gap-2 py-2">
              <Award color={c.success} size={16} />
              <Text className="flex-1 text-sm" style={{ color: c.text }} numberOfLines={1}>
                {cert.training.title}
              </Text>
            </View>
          ))}
          {(certificates ?? []).length === 0 ? (
            <Text className="text-sm" style={{ color: c.muted }}>
              None yet
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          className="flex-row items-center justify-center gap-2 py-3 mb-10"
        >
          <LogOut color={c.muted} size={16} />
          <Text className="text-sm" style={{ color: c.muted }}>
            Sign out
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  const { c } = useTheme();
  return (
    <View className="flex-row items-center py-2.5 border-b" style={{ borderColor: c.border }}>
      <Icon color={c.muted} size={16} />
      <Text className="text-sm ml-3 w-24" style={{ color: c.muted }}>
        {label}
      </Text>
      <Text className="text-sm font-medium flex-1" style={{ color: c.text }}>
        {value}
      </Text>
    </View>
  );
}
