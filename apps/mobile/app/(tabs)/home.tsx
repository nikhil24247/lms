import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Flame, Trophy, ChevronRight } from 'lucide-react-native';
import {
  getAssignedEnrollments,
  getCurrentUser,
  getLeaderboard,
  getRecognitionProfile,
} from '../../lib/api';
import { SectionHeader, ScreenLoader, ProgressBar } from '../../components/ui';
import { TrainingCard } from '../../components/TrainingCard';
import { useTheme } from '../../context/ThemeContext';

export default function HomeScreen() {
  const router = useRouter();
  const { c } = useTheme();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: getCurrentUser,
  });
  const { data: assigned, isLoading } = useQuery({
    queryKey: ['assigned-enrollments'],
    queryFn: getAssignedEnrollments,
  });
  const { data: recognition } = useQuery({
    queryKey: ['recognition'],
    queryFn: getRecognitionProfile,
  });
  const { data: board } = useQuery({
    queryKey: ['leaderboard-home'],
    queryFn: () => getLeaderboard('organization'),
  });

  const items = assigned ?? [];
  const completed = items.filter((e) => e.status === 'COMPLETED').length;
  const pending = items.filter((e) => e.status !== 'COMPLETED').length;
  const pct = items.length ? Math.round((completed / items.length) * 100) : 0;
  const points = recognition?.learningPoints ?? user?.learningPoints ?? 0;
  const topBoard = (board?.entries ?? []).slice(0, 5);

  if (isLoading || userLoading) return <ScreenLoader />;

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: c.bg }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 28 }}
    >
      <View className="mx-4 mt-4 rounded-3xl p-5" style={{ backgroundColor: c.primary }}>
        <Text className="text-white/80 text-sm">Welcome back</Text>
        <Text className="text-white text-2xl font-bold mt-1">
          {user?.fullName?.split(' ')[0] ?? 'Learner'}
        </Text>
        <Text className="text-white/75 text-sm mt-1">
          {user?.company?.name ?? 'Your learning hub'}
        </Text>

        <View className="flex-row mt-4 gap-2">
          <Stat label="Complete" value={`${pct}%`} />
          <Stat label="Done" value={String(completed)} />
          <Stat label="Pending" value={String(pending)} />
        </View>
        <View className="mt-4">
          <ProgressBar progress={pct} color="#ffffff" />
        </View>
      </View>

      <View className="mx-4 mt-3 flex-row gap-3">
        <View
          className="flex-1 rounded-2xl p-4 border"
          style={{ backgroundColor: c.card, borderColor: c.border }}
        >
          <Trophy color={c.warning} size={18} />
          <Text className="text-2xl font-bold mt-2" style={{ color: c.text }}>
            {board?.me ? `#${board.me.rank}` : '—'}
          </Text>
          <Text className="text-xs" style={{ color: c.muted }}>
            Org rank{board?.lowestRank ? ` of ${board.lowestRank}` : ''}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/rewards')}
          className="flex-1 rounded-2xl p-4 border"
          style={{ backgroundColor: c.card, borderColor: c.border }}
        >
          <Flame color={c.primary} size={18} />
          <Text className="text-2xl font-bold mt-2" style={{ color: c.text }}>
            {points}
          </Text>
          <Text className="text-xs" style={{ color: c.muted }}>
            Total points
          </Text>
        </TouchableOpacity>
      </View>

      <View className="mx-4 mt-4">
        <View className="flex-row justify-between items-center mb-2">
          <SectionHeader title="Assigned training" />
          <TouchableOpacity onPress={() => router.push('/training')}>
            <Text className="text-sm font-semibold" style={{ color: c.primary }}>
              See all
            </Text>
          </TouchableOpacity>
        </View>
        {items.slice(0, 5).map((e) => (
          <TrainingCard
            key={e.id}
            enrollment={e}
            onPress={() => router.push(`/course/${e.training.id}`)}
          />
        ))}
        {items.length === 0 ? (
          <Text className="text-sm py-6 text-center" style={{ color: c.muted }}>
            No training assigned yet
          </Text>
        ) : null}
      </View>

      <View className="mx-4 mt-2 mb-2">
        <TouchableOpacity
          onPress={() => router.push('/leaderboard')}
          className="flex-row items-center justify-between mb-2"
        >
          <SectionHeader title="Leaderboard" subtitle="Total points only" />
          <ChevronRight color={c.muted} size={18} />
        </TouchableOpacity>
        <View
          className="rounded-2xl border overflow-hidden"
          style={{ borderColor: c.border, backgroundColor: c.card }}
        >
          {topBoard.map((e) => {
            const you = e.isCurrentUser || e.userId === board?.me?.userId;
            const medal = e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : '';
            return (
              <View
                key={e.userId}
                className="flex-row items-center px-4 py-3 border-b"
                style={{
                  borderColor: c.border,
                  backgroundColor: you ? c.primarySoft : c.card,
                }}
              >
                <Text className="w-14 font-bold" style={{ color: you ? c.primary : c.muted }}>
                  {medal}#{e.rank}
                </Text>
                <Text className="flex-1 font-medium" style={{ color: c.text }} numberOfLines={1}>
                  {you ? 'YOU' : e.email}
                </Text>
                <Text className="font-bold" style={{ color: c.text }}>
                  {e.learningPoints}
                </Text>
              </View>
            );
          })}
          {topBoard.length === 0 ? (
            <Text className="p-5 text-center text-sm" style={{ color: c.muted }}>
              No rankings yet
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={() => router.push('/leaderboard')}
          className="mt-3 py-3 rounded-xl items-center"
          style={{ backgroundColor: c.primarySoft }}
        >
          <Text className="font-semibold" style={{ color: c.primary }}>
            Full leaderboard
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 bg-white/15 rounded-xl p-3">
      <Text className="text-white text-xl font-bold">{value}</Text>
      <Text className="text-white/75 text-xs mt-0.5">{label}</Text>
    </View>
  );
}
