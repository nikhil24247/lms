import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { AlertTriangle, Flame, Trophy, ChevronRight } from 'lucide-react-native';
import {
  getAssignedEnrollments,
  getCurrentUser,
  getLeaderboard,
  getRecognitionProfile,
} from '../../lib/api';
import { SectionHeader, ScreenLoader, ProgressBar, Skeleton } from '../../components/ui';
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
  const inProgress = items.filter((e) => e.status === 'IN_PROGRESS');
  const continueItem = inProgress[0] ?? items.find((e) => e.status === 'NOT_STARTED');
  const overdue = items.filter(
    (e) => e.dueDate && new Date(e.dueDate) < new Date() && e.status !== 'COMPLETED',
  );
  const pct = items.length ? Math.round((completed / items.length) * 100) : 0;
  const points = recognition?.learningPoints ?? user?.learningPoints ?? 0;

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
        <View
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
        </View>
      </View>

      {overdue.length > 0 ? (
        <View
          className="mx-4 mt-3 p-3 rounded-2xl flex-row items-center gap-2"
          style={{ backgroundColor: '#fff1f2' }}
        >
          <AlertTriangle color={c.danger} size={18} />
          <Text className="text-sm flex-1 font-medium" style={{ color: c.danger }}>
            {overdue.length} overdue training{overdue.length > 1 ? 's' : ''}
          </Text>
        </View>
      ) : null}

      {continueItem ? (
        <View className="mx-4 mt-4">
          <SectionHeader title="Continue learning" />
          <TrainingCard
            enrollment={continueItem}
            onPress={() => router.push(`/course/${continueItem.training.id}`)}
          />
        </View>
      ) : null}

      <View className="mx-4 mt-2">
        <View className="flex-row justify-between items-center mb-2">
          <SectionHeader title="Assigned training" />
          <TouchableOpacity onPress={() => router.push('/training')}>
            <Text className="text-sm font-semibold" style={{ color: c.primary }}>
              See all
            </Text>
          </TouchableOpacity>
        </View>
        {items.slice(0, 3).map((e) => (
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

      <View className="mx-4 mt-2">
        <TouchableOpacity
          onPress={() => router.push('/leaderboard')}
          className="flex-row items-center justify-between mb-2"
        >
          <SectionHeader title="Recent achievements" />
          <ChevronRight color={c.muted} size={18} />
        </TouchableOpacity>
        {(recognition?.badges ?? []).length === 0 ? (
          <Text className="text-sm" style={{ color: c.muted }}>
            Complete training to earn badges
          </Text>
        ) : (
          <View className="flex-row flex-wrap gap-2">
            {recognition!.badges.slice(0, 6).map((b) => (
              <View
                key={b.code}
                className="px-3 py-2 rounded-xl border"
                style={{ backgroundColor: c.card, borderColor: c.border }}
              >
                <Text className="text-sm font-semibold" style={{ color: c.text }}>
                  {b.name}
                </Text>
              </View>
            ))}
          </View>
        )}
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
