import { useState, useMemo } from 'react';
import { View, Text, ScrollView, TextInput } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Search } from 'lucide-react-native';
import { getAssignedEnrollments, type EnrollmentRow } from '../../lib/api';
import { TrainingCard } from '../../components/TrainingCard';
import { ScreenLoader } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';

type Filter = 'ALL' | 'LIVE' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'EXPIRED';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'LIVE', label: 'Live' },
  { id: 'ASSIGNED', label: 'Assigned' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'OVERDUE', label: 'Overdue' },
  { id: 'EXPIRED', label: 'Expired' },
];

function isExpired(e: EnrollmentRow) {
  if (e.status === 'EXPIRED') return true;
  return !!(e.expiresAt && new Date(e.expiresAt) < new Date());
}

function isOverdue(e: EnrollmentRow) {
  return !!(e.dueDate && new Date(e.dueDate) < new Date() && e.status !== 'COMPLETED' && !isExpired(e));
}

function isLive(e: EnrollmentRow) {
  return !isExpired(e) && (e.status === 'NOT_STARTED' || e.status === 'IN_PROGRESS');
}

export default function TrainingScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const [filter, setFilter] = useState<Filter>('LIVE');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['assigned-enrollments'],
    queryFn: getAssignedEnrollments,
  });

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (filter === 'LIVE') rows = rows.filter(isLive);
    if (filter === 'ASSIGNED') rows = rows.filter((e) => e.status === 'NOT_STARTED' && !isExpired(e));
    if (filter === 'IN_PROGRESS') rows = rows.filter((e) => e.status === 'IN_PROGRESS' && !isExpired(e));
    if (filter === 'COMPLETED') rows = rows.filter((e) => e.status === 'COMPLETED' && !isExpired(e));
    if (filter === 'OVERDUE') rows = rows.filter(isOverdue);
    if (filter === 'EXPIRED') rows = rows.filter(isExpired);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((e) => e.training.title.toLowerCase().includes(q));
    }
    return rows;
  }, [data, filter, search]);

  if (isLoading) return <ScreenLoader />;

  return (
    <View className="flex-1" style={{ backgroundColor: c.bg }}>
      <View className="px-4 pt-3">
        <View
          className="flex-row items-center rounded-xl border px-3 py-2.5"
          style={{ backgroundColor: c.card, borderColor: c.border }}
        >
          <Search color={c.muted} size={18} />
          <TextInput
            placeholder="Search training…"
            placeholderTextColor={c.muted}
            value={search}
            onChangeText={setSearch}
            className="flex-1 ml-2 text-sm"
            style={{ color: c.text }}
          />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-3">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <Text
              key={f.id}
              onPress={() => setFilter(f.id)}
              className="mr-2 px-4 py-2 rounded-full overflow-hidden text-sm font-semibold"
              style={{
                backgroundColor: active ? c.primary : c.card,
                color: active ? '#fff' : c.text,
                borderWidth: active ? 0 : 1,
                borderColor: c.border,
                overflow: 'hidden',
              }}
            >
              {f.label}
            </Text>
          );
        })}
      </ScrollView>

      <ScrollView className="px-4" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="text-sm mb-3" style={{ color: c.muted }}>
          {filtered.length} training{filtered.length === 1 ? '' : 's'}
        </Text>
        {filtered.map((e) => (
          <TrainingCard
            key={e.id}
            enrollment={e}
            onPress={() => router.push(`/course/${e.training.id}`)}
          />
        ))}
        {filtered.length === 0 ? (
          <Text className="text-center py-12" style={{ color: c.muted }}>
            No training in this filter
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
