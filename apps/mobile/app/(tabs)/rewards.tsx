import { View, Text, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Flame, Trophy, Award, Zap } from 'lucide-react-native';
import { getRecognitionProfile } from '../../lib/api';
import { ScreenLoader, SectionHeader } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';

export default function RewardsScreen() {
  const { c } = useTheme();
  const { data, isLoading, error } = useQuery({
    queryKey: ['recognition'],
    queryFn: getRecognitionProfile,
  });

  if (isLoading) return <ScreenLoader />;

  if (error) {
    return (
      <View className="flex-1 items-center justify-center p-6" style={{ backgroundColor: c.bg }}>
        <Text style={{ color: c.danger }}>
          {error instanceof Error ? error.message : 'Failed to load rewards'}
        </Text>
      </View>
    );
  }

  const badges = data?.badges ?? [];

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    >
      <View className="rounded-3xl p-5 mb-4" style={{ backgroundColor: c.primary }}>
        <Text className="text-white/80 text-sm">Your rewards</Text>
        <Text className="text-white text-3xl font-bold mt-1">{data?.learningPoints ?? 0}</Text>
        <Text className="text-white/75 text-sm">Total learning points</Text>
      </View>

      <View className="flex-row gap-3 mb-4">
        <View
          className="flex-1 rounded-2xl p-4 border"
          style={{ backgroundColor: c.card, borderColor: c.border }}
        >
          <Zap color={c.warning} size={18} />
          <Text className="text-2xl font-bold mt-2" style={{ color: c.text }}>
            {data?.currentStreak ?? 0}
          </Text>
          <Text className="text-xs" style={{ color: c.muted }}>
            Day streak
          </Text>
        </View>
        <View
          className="flex-1 rounded-2xl p-4 border"
          style={{ backgroundColor: c.card, borderColor: c.border }}
        >
          <Trophy color={c.primary} size={18} />
          <Text className="text-2xl font-bold mt-2" style={{ color: c.text }}>
            {data?.trainingsCompleted ?? 0}
          </Text>
          <Text className="text-xs" style={{ color: c.muted }}>
            Trainings done
          </Text>
        </View>
      </View>

      <SectionHeader title="Badges" subtitle="Earned by completing training" />
      {badges.length === 0 ? (
        <View
          className="rounded-2xl p-8 items-center border"
          style={{ backgroundColor: c.card, borderColor: c.border }}
        >
          <Award color={c.border} size={40} />
          <Text className="mt-3 font-medium" style={{ color: c.text }}>
            No badges yet
          </Text>
          <Text className="text-sm text-center mt-1" style={{ color: c.muted }}>
            Finish a training to unlock your first badge
          </Text>
        </View>
      ) : (
        badges.map((b) => (
          <View
            key={b.code}
            className="rounded-2xl p-4 mb-3 border flex-row gap-3"
            style={{ backgroundColor: c.card, borderColor: c.border }}
          >
            <View className="p-3 rounded-xl" style={{ backgroundColor: c.primarySoft }}>
              <Flame color={c.primary} size={20} />
            </View>
            <View className="flex-1">
              <Text className="font-bold" style={{ color: c.text }}>
                {b.name}
              </Text>
              <Text className="text-sm mt-0.5" style={{ color: c.muted }}>
                {b.description}
              </Text>
              <Text className="text-xs mt-1" style={{ color: c.muted }}>
                Earned {new Date(b.earnedAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}
