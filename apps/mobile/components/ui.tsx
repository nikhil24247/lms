import { View, Text, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export function ProgressBar({ progress, color }: { progress: number; color?: string }) {
  const { c } = useTheme();
  return (
    <View className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: c.border }}>
      <View
        className="h-2 rounded-full"
        style={{
          width: `${Math.min(Math.max(progress, 0), 100)}%`,
          backgroundColor: color ?? c.primary,
        }}
      />
    </View>
  );
}

export function StatusChip({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    COMPLETED: { bg: '#d1fae5', fg: '#047857', label: 'Completed' },
    IN_PROGRESS: { bg: '#e0e7ff', fg: '#4338ca', label: 'In progress' },
    NOT_STARTED: { bg: '#f1f5f9', fg: '#475569', label: 'Not started' },
    OVERDUE: { bg: '#ffe4e6', fg: '#be123c', label: 'Overdue' },
  };
  const s = map[status] ?? map.NOT_STARTED;
  return (
    <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: s.bg }}>
      <Text className="text-xs font-semibold" style={{ color: s.fg }}>
        {s.label}
      </Text>
    </View>
  );
}

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { c } = useTheme();
  return (
    <View className="mb-3">
      <Text className="text-lg font-bold" style={{ color: c.text }}>
        {title}
      </Text>
      {subtitle ? (
        <Text className="text-sm mt-0.5" style={{ color: c.muted }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function Skeleton({ height = 80, className = '' }: { height?: number; className?: string }) {
  const { c } = useTheme();
  return (
    <View
      className={`rounded-2xl mb-3 ${className}`}
      style={{ height, backgroundColor: c.border, opacity: 0.55 }}
    />
  );
}

export function ScreenLoader() {
  const { c } = useTheme();
  return (
    <View className="flex-1 items-center justify-center" style={{ backgroundColor: c.bg }}>
      <ActivityIndicator size="large" color={c.primary} />
    </View>
  );
}

export function trainingTypeLabel(type: string) {
  if (type === 'VIDEO_QUIZ') return 'Video + Quiz';
  if (type === 'SCORM') return 'SCORM';
  if (type === 'MODULAR') return 'Training path';
  return type.replace(/_/g, ' ');
}

export function actionLabel(status: string) {
  if (status === 'COMPLETED') return 'Review';
  if (status === 'IN_PROGRESS') return 'Continue';
  return 'Start';
}
