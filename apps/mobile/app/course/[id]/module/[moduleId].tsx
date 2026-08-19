import { useState } from 'react';
import { View, Text, Linking, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react-native';
import {
  getCourse,
  markVideoComplete,
  completeModule,
} from '../../../../lib/api';
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
  const queryClient = useQueryClient();

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', id],
    queryFn: () => getCourse(id),
    enabled: !!id,
  });

  const module = course?.modules.find((m) => m.id === moduleId);
  const [done, setDone] = useState(false);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['course', id] });
    queryClient.invalidateQueries({ queryKey: ['assigned-enrollments'] });
  };

  const markModuleDone = async (signatureText?: string) => {
    if (!course || !module) return;
    if (module.id.startsWith('video-') || module.id.startsWith('quiz-') || module.id.startsWith('scorm-')) {
      return;
    }
    try {
      await completeModule(course.enrollmentId, module.id, signatureText);
      setDone(true);
      refresh();
    } catch {
      // keep UI usable
    }
  };

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
  const externalUrl = module.externalUrl || module.contentUrl;
  const alreadyDone =
    done ||
    course.completedModuleIds.includes(module.id) ||
    (module.contentType === 'VIDEO_MP4' &&
      (module.id.startsWith('video-') ? course.videoCompleted : course.completedModuleIds.includes(module.id)));

  return (
    <View className="flex-1" style={{ backgroundColor: c.bg }}>
      <View className="p-4 border-b" style={{ borderColor: c.border, backgroundColor: c.card }}>
        <Text className="text-lg font-semibold" style={{ color: c.text }}>
          {module.title}
        </Text>
        {alreadyDone ? (
          <Text className="text-xs mt-1 font-medium" style={{ color: c.success }}>
            Completed
          </Text>
        ) : null}
      </View>

      {module.contentType === 'VIDEO_MP4' && videoUri ? (
        <VideoPlayer
          uri={videoUri}
          enrollmentId={course.enrollmentId}
          moduleId={module.id}
          alreadyComplete={alreadyDone}
          onComplete={() => {
            if (module.id.startsWith('video-')) {
              markVideoComplete(course.enrollmentId).then(refresh).catch(() => {});
            } else {
              void markModuleDone();
            }
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
          onSubmitted={refresh}
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
        <RichTextPlayer
          content={module.richTextContent}
          alreadyComplete={alreadyDone}
          onComplete={() => void markModuleDone()}
        />
      ) : null}

      {(module.contentType === 'DOCUMENT_PDF' || module.contentType === 'PDF_POLICY') && pdfUri ? (
        <PdfPlayer
          uri={pdfUri}
          alreadyComplete={alreadyDone}
          onAcknowledge={(signature) => void markModuleDone(signature)}
        />
      ) : null}

      {module.contentType === 'EXTERNAL' && externalUrl ? (
        <View className="flex-1 p-4 justify-center gap-3">
          <TouchableOpacity
            onPress={() => Linking.openURL(externalUrl)}
            className="flex-row items-center justify-center gap-2 py-3.5 rounded-xl"
            style={{ backgroundColor: c.primarySoft }}
          >
            <ExternalLink color={c.primary} size={18} />
            <Text className="font-semibold" style={{ color: c.primary }}>
              Open external course
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={alreadyDone}
            onPress={() => void markModuleDone()}
            className="py-3.5 rounded-xl items-center"
            style={{ backgroundColor: alreadyDone ? c.border : c.primary, opacity: alreadyDone ? 0.7 : 1 }}
          >
            <Text className="font-semibold" style={{ color: alreadyDone ? c.muted : '#fff' }}>
              {alreadyDone ? 'Marked complete' : 'Mark complete'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!videoUri &&
      !scormUri &&
      !pdfUri &&
      !externalUrl &&
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
