import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Play, FileQuestion, Monitor, FileText, Clock, ChevronRight } from 'lucide-react-native';
import { getCourse, startTraining } from '../../../lib/api';
import { ProgressBar, ScreenLoader } from '../../../components/ui';
import { useTheme } from '../../../context/ThemeContext';
import { useEffect } from 'react';

const contentIcons: Record<string, typeof Play> = {
  VIDEO_MP4: Play,
  QUIZ_EXCEL: FileQuestion,
  SCORM_ZIP: Monitor,
  PDF_POLICY: FileText,
  DOCUMENT_PDF: FileText,
  RICH_TEXT: FileText,
};

const contentLabels: Record<string, string> = {
  VIDEO_MP4: 'Video',
  QUIZ_EXCEL: 'Quiz',
  SCORM_ZIP: 'SCORM',
  PDF_POLICY: 'Document',
  DOCUMENT_PDF: 'Document',
  RICH_TEXT: 'Reading',
};

function trainingTypeLabel(type: string) {
  if (type.includes('SCORM')) return type.includes('2004') ? 'SCORM 2004' : 'SCORM 1.2';
  if (type.includes('VIDEO') || type.includes('QUIZ')) return 'Video + Quiz';
  return type.replace(/_/g, ' ');
}

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { c } = useTheme();

  const { data: course, isLoading, error } = useQuery({
    queryKey: ['course', id],
    queryFn: () => getCourse(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (course?.enrollmentId) {
      startTraining(course.enrollmentId).catch(() => {});
    }
  }, [course?.enrollmentId]);

  if (isLoading) return <ScreenLoader />;

  if (error || !course) {
    return (
      <View className="flex-1 items-center justify-center p-6" style={{ backgroundColor: c.bg }}>
        <Text className="text-center" style={{ color: c.danger }}>
          {error instanceof Error ? error.message : 'Training not found or not assigned to you'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1" style={{ backgroundColor: c.bg }}>
      <View className="p-5" style={{ backgroundColor: c.primary }}>
        <Text className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.75)' }}>
          {trainingTypeLabel(course.type)}
        </Text>
        <Text className="text-white text-2xl font-bold mt-1">{course.title}</Text>
        {course.description ? (
          <Text className="text-sm mt-2 leading-5" style={{ color: 'rgba(255,255,255,0.8)' }}>
            {course.description}
          </Text>
        ) : null}
        <View className="flex-row items-center gap-1 mt-3">
          <Clock color="rgba(255,255,255,0.7)" size={14} />
          <Text className="text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
            {course.estimatedMinutes} minutes
          </Text>
        </View>
        <View className="mt-4">
          <ProgressBar progress={course.progressPercentage} color="#ffffff" />
          <Text className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.85)' }}>
            {course.progressPercentage}% complete
          </Text>
        </View>
      </View>

      <View className="p-4">
        <Text
          className="text-sm font-semibold uppercase tracking-wider mb-3"
          style={{ color: c.muted }}
        >
          Steps ({course.modules.length})
        </Text>

        {course.modules.map((module, idx) => {
          const Icon = contentIcons[module.contentType] ?? Play;
          const hasContent =
            !!module.contentUrl ||
            module.contentType === 'QUIZ_EXCEL' ||
            module.contentType === 'RICH_TEXT';

          return (
            <TouchableOpacity
              key={module.id}
              onPress={() => router.push(`/course/${id}/module/${module.id}`)}
              className="rounded-2xl mb-3 p-4 flex-row items-center border"
              style={{ backgroundColor: c.card, borderColor: c.border }}
            >
              <View
                className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                style={{ backgroundColor: c.primarySoft }}
              >
                <Text className="font-bold text-sm" style={{ color: c.primary }}>
                  {idx + 1}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold" style={{ color: c.text }}>
                  {module.title}
                </Text>
                <Text className="text-xs mt-0.5" style={{ color: c.muted }}>
                  {contentLabels[module.contentType] ?? module.contentType}
                </Text>
                {!hasContent ? (
                  <Text className="text-xs mt-0.5" style={{ color: c.warning }}>
                    Content not uploaded yet
                  </Text>
                ) : null}
              </View>
              <View className="flex-row items-center gap-2">
                <Icon color={c.primary} size={18} />
                <ChevronRight color={c.muted} size={16} />
              </View>
            </TouchableOpacity>
          );
        })}

        {course.modules.length === 0 ? (
          <View
            className="rounded-2xl p-6 items-center border"
            style={{ backgroundColor: c.card, borderColor: c.border }}
          >
            <Text className="text-center" style={{ color: c.muted }}>
              No content steps yet. Ask your admin to publish content.
            </Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
