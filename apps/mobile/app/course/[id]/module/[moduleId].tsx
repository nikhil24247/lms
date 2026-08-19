import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getCourse, markVideoComplete } from '../../../../lib/api';
import { VideoPlayer } from '../../../../components/VideoPlayer';
import { QuizPlayer } from '../../../../components/QuizPlayer';
import { ScormPlayer } from '../../../../components/ScormPlayer';
import { RichTextPlayer } from '../../../../components/RichTextPlayer';
import { PdfPlayer } from '../../../../components/PdfPlayer';
import { ScreenLoader } from '../../../../components/ui';
import { useTheme } from '../../../../context/ThemeContext';

export default function ModuleScreen() {
  const { id, moduleId } = useLocalSearchParams<{ id: string; moduleId: string }>();
  const { c } = useTheme();

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', id],
    queryFn: () => getCourse(id),
    enabled: !!id,
  });

  const module = course?.modules.find((m) => m.id === moduleId);

  if (isLoading || !course) return <ScreenLoader />;

  if (!module) {
    return (
      <View className="flex-1 items-center justify-center p-6" style={{ backgroundColor: c.bg }}>
        <Text className="text-center" style={{ color: c.muted }}>
          Step not found
        </Text>
      </View>
    );
  }

  const passingScore = module.passingScorePercentage ?? course.passingScorePercentage ?? 70;
  const videoUri = module.videoUrl || module.contentUrl;
  const scormUri = module.scormContentUrl || module.contentUrl;
  const pdfUri = module.fileUrl || module.contentUrl;

  return (
    <View className="flex-1" style={{ backgroundColor: c.bg }}>
      <View className="p-4 border-b" style={{ borderColor: c.border, backgroundColor: c.card }}>
        <Text className="text-lg font-semibold" style={{ color: c.text }}>
          {module.title}
        </Text>
      </View>

      {module.contentType === 'VIDEO_MP4' && videoUri ? (
        <VideoPlayer
          uri={videoUri}
          enrollmentId={course.enrollmentId}
          onComplete={() => {
            markVideoComplete(course.enrollmentId).catch(() => {});
          }}
        />
      ) : null}

      {module.contentType === 'QUIZ_EXCEL' ? (
        <QuizPlayer
          trainingId={course.id}
          enrollmentId={course.enrollmentId}
          moduleId={module.id}
          passingScore={passingScore}
          questions={course.questions}
        />
      ) : null}

      {module.contentType === 'SCORM_ZIP' && scormUri ? (
        <ScormPlayer
          baseUrl={scormUri}
          entryPoint={module.scormEntryPointHtml ?? module.scormEntryPoint ?? 'index.html'}
          enrollmentId={course.enrollmentId}
          moduleId={module.id}
        />
      ) : null}

      {module.contentType === 'RICH_TEXT' && module.richTextContent ? (
        <RichTextPlayer content={module.richTextContent} />
      ) : null}

      {(module.contentType === 'DOCUMENT_PDF' || module.contentType === 'PDF_POLICY') && pdfUri ? (
        <PdfPlayer uri={pdfUri} />
      ) : null}

      {!videoUri &&
      !scormUri &&
      !pdfUri &&
      module.contentType !== 'QUIZ_EXCEL' &&
      module.contentType !== 'RICH_TEXT' ? (
        <View className="flex-1 items-center justify-center p-8">
          <Text className="text-center" style={{ color: c.muted }}>
            Content not yet uploaded. Ask your administrator to add content for this step.
          </Text>
        </View>
      ) : null}
    </View>
  );
}
