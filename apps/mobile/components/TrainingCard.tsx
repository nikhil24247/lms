import { View, Text, TouchableOpacity } from 'react-native';
import { Clock, Play } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { ProgressBar, StatusChip, trainingTypeLabel, actionLabel } from './ui';
import type { EnrollmentRow } from '../lib/api';

function effectiveStatus(e: EnrollmentRow) {
  const overdue =
    e.dueDate && new Date(e.dueDate) < new Date() && e.status !== 'COMPLETED';
  return overdue ? 'OVERDUE' : e.status;
}

export function TrainingCard({
  enrollment,
  onPress,
}: {
  enrollment: EnrollmentRow;
  onPress: () => void;
}) {
  const { c } = useTheme();
  const status = effectiveStatus(enrollment);
  const progress =
    enrollment.progressPercentage ??
    (enrollment.status === 'COMPLETED' ? 100 : enrollment.status === 'IN_PROGRESS' ? 50 : 0);
  const score = enrollment.completionScore ?? enrollment.scormScore ?? null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className="rounded-2xl mb-3 overflow-hidden border"
      style={{ backgroundColor: c.card, borderColor: c.border }}
    >
      <View className="p-4">
        <View className="flex-row justify-between items-start gap-2">
          <View className="flex-1">
            <Text className="text-base font-bold" style={{ color: c.text }}>
              {enrollment.training.title}
            </Text>
            <Text className="text-xs mt-1 font-medium" style={{ color: c.primary }}>
              {trainingTypeLabel(enrollment.training.type)}
            </Text>
          </View>
          <StatusChip status={status} />
        </View>

        <View className="flex-row items-center gap-3 mt-3">
          <View className="flex-row items-center gap-1">
            <Clock color={c.muted} size={12} />
            <Text className="text-xs" style={{ color: c.muted }}>
              {enrollment.training.estimatedMinutes} min
            </Text>
          </View>
          {enrollment.dueDate ? (
            <Text className="text-xs" style={{ color: status === 'OVERDUE' ? c.danger : c.muted }}>
              Due {new Date(enrollment.dueDate).toLocaleDateString()}
            </Text>
          ) : null}
          {score != null ? (
            <Text className="text-xs font-semibold" style={{ color: c.accent }}>
              Score {Math.round(score)}%
            </Text>
          ) : null}
        </View>

        <View className="mt-3">
          <View className="flex-row justify-between mb-1">
            <Text className="text-xs" style={{ color: c.muted }}>
              Progress
            </Text>
            <Text className="text-xs font-semibold" style={{ color: c.text }}>
              {Math.round(progress)}%
            </Text>
          </View>
          <ProgressBar
            progress={progress}
            color={enrollment.status === 'COMPLETED' ? c.success : c.primary}
          />
        </View>

        <View
          className="mt-3 self-start flex-row items-center gap-1.5 px-3 py-2 rounded-xl"
          style={{ backgroundColor: c.primarySoft }}
        >
          <Play color={c.primary} size={14} />
          <Text className="text-sm font-semibold" style={{ color: c.primary }}>
            {actionLabel(enrollment.status)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
