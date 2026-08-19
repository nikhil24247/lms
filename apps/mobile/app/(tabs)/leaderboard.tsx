import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getLeaderboard } from '../../lib/api';
import { ScreenLoader, SectionHeader } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';

type ViewMode = 'organization' | 'department';

export default function LeaderboardScreen() {
  const { c } = useTheme();
  const [view, setView] = useState<ViewMode>('organization');

  const { data, isLoading, error } = useQuery({
    queryKey: ['leaderboard', view],
    queryFn: () => getLeaderboard(view),
  });

  if (isLoading) return <ScreenLoader />;

  if (error) {
    return (
      <View className="flex-1 items-center justify-center p-6" style={{ backgroundColor: c.bg }}>
        <Text style={{ color: c.danger }}>
          {error instanceof Error ? error.message : 'Failed to load leaderboard'}
        </Text>
      </View>
    );
  }

  const nearby = data?.nearbyEntries?.length ? data.nearbyEntries : data?.entries ?? [];

  return (
    <ScrollView className="flex-1" style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 16 }}>
      <View className="flex-row gap-2 mb-4">
        {(['organization', 'department'] as ViewMode[]).map((v) => (
          <TouchableOpacity
            key={v}
            onPress={() => setView(v)}
            className="px-4 py-2 rounded-full"
            style={{ backgroundColor: view === v ? c.primary : c.card, borderWidth: 1, borderColor: c.border }}
          >
            <Text className="text-sm font-semibold" style={{ color: view === v ? '#fff' : c.text }}>
              {v === 'organization' ? 'Organization' : 'Department'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {data?.me ? (
        <View
          className="rounded-2xl p-4 mb-4 border"
          style={{ backgroundColor: c.primarySoft, borderColor: c.primary }}
        >
          <Text className="text-xs font-bold uppercase" style={{ color: c.primary }}>
            Your standing
          </Text>
          <View className="flex-row items-end justify-between mt-1">
            <View>
              <Text className="text-3xl font-bold" style={{ color: c.text }}>
                #{data.me.rank}
              </Text>
              <Text className="text-sm" style={{ color: c.muted }}>
                {data.me.department} · of {data.lowestRank}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-2xl font-bold" style={{ color: c.text }}>
                {data.me.learningPoints}
              </Text>
              <Text className="text-xs" style={{ color: c.muted }}>
                Total points
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <Text className="mb-4 text-sm" style={{ color: c.muted }}>
          Complete training to appear on the leaderboard.
        </Text>
      )}

      {nearby.length > 0 ? (
        <>
          <SectionHeader title="Near you" subtitle="±3 around your rank" />
          <View
            className="rounded-2xl border overflow-hidden mb-4"
            style={{ borderColor: c.border, backgroundColor: c.card }}
          >
            {nearby.map((e) => {
              const you = e.isCurrentUser || e.userId === data?.me?.userId;
              return (
                <View
                  key={`near-${e.userId}`}
                  className="flex-row items-center px-4 py-3 border-b"
                  style={{
                    borderColor: c.border,
                    backgroundColor: you ? c.primarySoft : c.card,
                  }}
                >
                  <Text className="w-12 font-bold" style={{ color: you ? c.primary : c.muted }}>
                    #{e.rank}
                  </Text>
                  <View className="flex-1">
                    <Text className="font-semibold" style={{ color: c.text }} numberOfLines={1}>
                      {you ? 'YOU' : e.email}
                    </Text>
                    <Text className="text-xs" style={{ color: c.muted }}>
                      {e.department}
                    </Text>
                  </View>
                  <Text className="font-bold" style={{ color: c.text }}>
                    {e.learningPoints}
                  </Text>
                </View>
              );
            })}
          </View>
        </>
      ) : null}

      <SectionHeader title="Full rankings" subtitle="Email · Department · Total points" />
      <View className="rounded-2xl border overflow-hidden mb-2" style={{ borderColor: c.border, backgroundColor: c.card }}>
        {(data?.entries ?? []).map((e) => {
          const you = e.isCurrentUser || e.userId === data?.me?.userId;
          return (
            <View
              key={e.userId}
              className="flex-row items-center px-4 py-3 border-b"
              style={{
                borderColor: c.border,
                backgroundColor: you ? c.primarySoft : c.card,
              }}
            >
              <Text className="w-12 font-bold" style={{ color: you ? c.primary : c.muted }}>
                #{e.rank}
              </Text>
              <View className="flex-1">
                <Text className="font-semibold" style={{ color: c.text }} numberOfLines={1}>
                  {you ? 'YOU' : e.email}
                </Text>
                <Text className="text-xs" style={{ color: c.muted }}>
                  {e.department}
                </Text>
              </View>
              <Text className="font-bold" style={{ color: c.text }}>
                {e.learningPoints}
              </Text>
            </View>
          );
        })}
        {(data?.entries ?? []).length === 0 ? (
          <Text className="p-6 text-center" style={{ color: c.muted }}>
            No rankings yet
          </Text>
        ) : null}
      </View>
      {data && data.lowestRank > 0 ? (
        <Text className="text-xs mb-6" style={{ color: c.muted }}>
          Lowest rank #{data.lowestRank}
        </Text>
      ) : null}
    </ScrollView>
  );
}
