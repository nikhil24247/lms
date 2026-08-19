import { View, Text, FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { getAssignedEnrollments } from '../../lib/api';
import { TrainingCard } from '../../components/TrainingCard';
import { ScreenLoader } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';

export default function TrainingScreen() {
  const router = useRouter();
  const { c } = useTheme();

  const { data, isLoading } = useQuery({
    queryKey: ['assigned-enrollments'],
    queryFn: getAssignedEnrollments,
  });

  const rows = data ?? [];

  if (isLoading) return <ScreenLoader />;

  return (
    <View className="flex-1" style={{ backgroundColor: c.bg }}>
      <FlatList
        data={rows}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ListEmptyComponent={
          <Text className="text-center py-12" style={{ color: c.muted }}>
            No trainings assigned
          </Text>
        }
        renderItem={({ item }) => (
          <TrainingCard
            enrollment={item}
            onPress={() => router.push(`/course/${item.training.id}`)}
          />
        )}
      />
    </View>
  );
}
