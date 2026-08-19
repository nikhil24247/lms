import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { StatusChip } from './ui';
import type { EnrollmentRow } from '../lib/api';

function effectiveStatus(e: EnrollmentRow) {
  if (e.status === 'EXPIRED' || (e.expiresAt && new Date(e.expiresAt) < new Date())) {
    return 'EXPIRED';
  }
  const overdue =
    e.dueDate && new Date(e.dueDate) < new Date() && e.status !== 'COMPLETED';
  return overdue ? 'OVERDUE' : e.status;
}

function dateLine(e: EnrollmentRow, status: string) {
  if (e.expiresAt) {
    return {
      label: status === 'EXPIRED' ? 'Expired' : 'Expires',
      value: new Date(e.expiresAt).toLocaleDateString(),
      danger: status === 'EXPIRED',
    };
  }
  if (e.dueDate) {
    return {
      label: status === 'OVERDUE' ? 'Overdue' : 'Due',
      value: new Date(e.dueDate).toLocaleDateString(),
      danger: status === 'OVERDUE',
    };
  }
  return null;
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
  const score = enrollment.completionScore ?? enrollment.scormScore ?? null;
  const date = dateLine(enrollment, status);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className="rounded-2xl mb-3 border px-4 py-3.5"
      style={{ backgroundColor: c.card, borderColor: c.border }}
    >
      <View className="flex-row justify-between items-start gap-3">
        <Text className="flex-1 text-base font-semibold" style={{ color: c.text }} numberOfLines={2}>
          {enrollment.training.title}
        </Text>
        <StatusChip status={status} />
      </View>

      <View className="flex-row items-center justify-between mt-3">
        <Text className="text-sm" style={{ color: score != null ? c.accent : c.muted }}>
          {score != null ? `Score ${Math.round(score)}%` : 'No score yet'}
        </Text>
        {date ? (
          <Text className="text-sm" style={{ color: date.danger ? c.danger : c.muted }}>
            {date.label} {date.value}
          </Text>
        ) : (
          <Text className="text-sm" style={{ color: c.muted }}>
            No deadline
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}
