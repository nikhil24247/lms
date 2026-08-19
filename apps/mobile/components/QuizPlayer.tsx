import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { submitAssessment } from '../lib/api';
import { useSyncQueueStore } from '../stores/syncQueue.store';
import NetInfo from '@react-native-community/netinfo';
import { useTheme } from '../context/ThemeContext';
import { ProgressBar } from './ui';

interface QuizPlayerProps {
  trainingId: string;
  enrollmentId: string;
  moduleId: string;
  passingScore: number;
  questions: {
    id: string;
    questionText: string;
    questionType: string;
    points: number;
    options: { id: string; optionText: string }[];
  }[];
  allowRetry?: boolean;
  onSubmitted?: () => void;
}

export function QuizPlayer({
  enrollmentId,
  moduleId,
  passingScore,
  questions,
  allowRetry = true,
  onSubmitted,
}: QuizPlayerProps) {
  const { c } = useTheme();
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ score: number; isPassed: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addItem = useSyncQueueStore((s) => s.addItem);

  const total = questions?.length ?? 0;
  const q = questions?.[idx];
  const answeredCount = Object.keys(answers).length;
  const allAnswered = total > 0 && answeredCount >= total;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const payload = { enrollmentId, moduleId, answers };
    try {
      const net = await NetInfo.fetch();
      if (!net.isConnected) {
        addItem({ type: 'ASSESSMENT_SUBMIT', payload });
        setError('Saved offline — will sync when you are back online.');
        return;
      }
      const res = await submitAssessment(enrollmentId, moduleId, answers);
      setResult(res);
      onSubmitted?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submit failed');
      addItem({ type: 'ASSESSMENT_SUBMIT', payload });
    } finally {
      setSubmitting(false);
    }
  };

  if (!questions?.length) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <Text style={{ color: c.muted }}>No quiz questions available yet.</Text>
      </View>
    );
  }

  if (result) {
    return (
      <View className="flex-1 items-center justify-center p-8" style={{ backgroundColor: c.bg }}>
        <View
          className="w-full rounded-3xl p-6 items-center border"
          style={{ backgroundColor: c.card, borderColor: c.border }}
        >
          <Text className="text-2xl font-bold" style={{ color: result.isPassed ? c.success : c.danger }}>
            {result.isPassed ? 'Passed' : 'Not passed'}
          </Text>
          <Text className="text-4xl font-bold mt-3" style={{ color: c.text }}>
            {Number(result.score).toFixed(0)}%
          </Text>
          <Text className="text-sm mt-2" style={{ color: c.muted }}>
            Required: {passingScore}%
          </Text>
          {allowRetry && !result.isPassed ? (
            <TouchableOpacity
              onPress={() => {
                setResult(null);
                setAnswers({});
                setIdx(0);
              }}
              className="mt-6 px-6 py-3 rounded-xl"
              style={{ backgroundColor: c.primary }}
            >
              <Text className="text-white font-semibold">Retry quiz</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 p-4" style={{ backgroundColor: c.bg }}>
      <Text className="text-xs font-semibold mb-2" style={{ color: c.muted }}>
        Question {idx + 1} of {total}
      </Text>
      <ProgressBar progress={((idx + 1) / total) * 100} />

      <View
        className="mt-4 rounded-2xl p-5 border flex-1"
        style={{ backgroundColor: c.card, borderColor: c.border }}
      >
        <Text className="text-lg font-semibold leading-6" style={{ color: c.text }}>
          {q.questionText}
        </Text>
        <View className="mt-5 gap-2">
          {q.options.map((opt) => {
            const selected = answers[q.id] === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                onPress={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.id }))}
                className="p-4 rounded-xl border"
                style={{
                  borderColor: selected ? c.primary : c.border,
                  backgroundColor: selected ? c.primarySoft : c.card,
                }}
              >
                <Text style={{ color: selected ? c.primary : c.text }} className="text-base">
                  {opt.optionText}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {error ? (
        <Text className="text-sm mt-3" style={{ color: c.danger }}>
          {error}
        </Text>
      ) : null}

      <View className="flex-row gap-2 mt-4 mb-2">
        <TouchableOpacity
          disabled={idx === 0}
          onPress={() => setIdx((i) => Math.max(0, i - 1))}
          className="flex-1 py-3.5 rounded-xl items-center border"
          style={{ borderColor: c.border, opacity: idx === 0 ? 0.4 : 1 }}
        >
          <Text className="font-semibold" style={{ color: c.text }}>
            Previous
          </Text>
        </TouchableOpacity>
        {idx < total - 1 ? (
          <TouchableOpacity
            onPress={() => setIdx((i) => Math.min(total - 1, i + 1))}
            className="flex-1 py-3.5 rounded-xl items-center"
            style={{ backgroundColor: c.primary }}
          >
            <Text className="text-white font-semibold">Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting || !allAnswered}
            className="flex-1 py-3.5 rounded-xl items-center"
            style={{ backgroundColor: c.primary, opacity: !allAnswered || submitting ? 0.5 : 1 }}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold">Submit</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
      <Text className="text-center text-xs mb-4" style={{ color: c.muted }}>
        {answeredCount}/{total} answered
      </Text>
    </View>
  );
}
