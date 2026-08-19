import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import {
  getCourse,
  getEnrollmentProgress,
  getModuleQuestions,
  submitAssessment,
  completeModule,
} from '../lib/api';

function RichTextViewer({
  content,
  onComplete,
}: {
  content: string;
  onComplete: () => void;
}) {
  const [done, setDone] = useState(false);

  const handleComplete = () => {
    setDone(true);
    onComplete();
  };

  return (
    <div>
      <div className="prose prose-slate max-w-none p-6 bg-white rounded-xl card">
        {content.split('\n').map((line, i) => {
          if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold mt-4">{line.slice(2)}</h1>;
          if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-semibold mt-3">{line.slice(3)}</h2>;
          if (line.startsWith('- ')) return <li key={i} className="ml-4">{line.slice(2)}</li>;
          if (!line.trim()) return <br key={i} />;
          return <p key={i} className="my-2 text-slate-700">{line.replace(/\*\*(.*?)\*\*/g, '$1')}</p>;
        })}
      </div>
      <button
        type="button"
        onClick={handleComplete}
        disabled={done}
        className={`btn-primary w-full mt-4 py-3 ${done ? 'bg-emerald-600' : ''}`}
      >
        {done ? (
          <span className="flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4" /> Lesson Completed
          </span>
        ) : (
          'Mark Lesson Complete'
        )}
      </button>
    </div>
  );
}

function VideoViewer({ uri, onComplete }: { uri: string; onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);

  const handleProgress = (pct: number) => {
    setProgress(pct);
    if (pct >= 90 && !completed) {
      setCompleted(true);
      onComplete();
    }
  };

  return (
    <div>
      <video
        src={uri}
        controls
        className="w-full rounded-xl bg-black"
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (v.duration) handleProgress((v.currentTime / v.duration) * 100);
        }}
      />
      <div className="mt-3 h-2 bg-slate-200 rounded-full">
        <div className="h-full bg-indigo-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>
      {completed && (
        <p className="text-emerald-600 text-sm mt-2 font-medium flex items-center gap-1">
          <CheckCircle className="w-4 h-4" /> Module completed (90%+ watched)
        </p>
      )}
    </div>
  );
}

function QuizViewer({
  moduleId,
  enrollmentId,
  passingScore,
}: {
  moduleId: string;
  enrollmentId: string;
  passingScore: number;
}) {
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ score: number; isPassed: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: questions, isLoading } = useQuery({
    queryKey: ['questions', moduleId],
    queryFn: () => getModuleQuestions(moduleId),
  });

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await submitAssessment(enrollmentId, moduleId, answers);
      setResult(res);
      if (res.isPassed) {
        queryClient.invalidateQueries({ queryKey: ['progress'] });
        queryClient.invalidateQueries({ queryKey: ['assigned'] });
        queryClient.invalidateQueries({ queryKey: ['learner-stats'] });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return <p className="text-slate-500">Loading quiz...</p>;

  if (result) {
    return (
      <div className="card p-8 text-center">
        <h3 className={`text-xl font-bold ${result.isPassed ? 'text-emerald-700' : 'text-rose-700'}`}>
          {result.isPassed ? 'Passed!' : 'Not Passed'}
        </h3>
        <p className="text-slate-500 mt-2">
          Score: {result.score.toFixed(0)}% (Required: {passingScore}%)
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(questions ?? []).map((q, idx) => (
        <div key={q.id} className="card p-4">
          <p className="text-xs text-slate-400">Question {idx + 1}</p>
          <p className="font-medium mt-1">{q.questionText}</p>
          <div className="mt-3 space-y-2">
            {q.options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.id }))}
                className={`w-full text-left p-3 rounded-lg border ${
                  answers[q.id] === opt.id ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200'
                }`}
              >
                {opt.optionText}
              </button>
            ))}
          </div>
        </div>
      ))}
      <button
        onClick={handleSubmit}
        disabled={submitting || Object.keys(answers).length === 0}
        className="btn-primary w-full py-3"
      >
        {submitting ? 'Submitting...' : 'Submit Quiz'}
      </button>
    </div>
  );
}

function PdfViewer({ uri, onComplete }: { uri: string; onComplete: () => void }) {
  const [acknowledged, setAcknowledged] = useState(false);

  const handleAck = () => {
    setAcknowledged(true);
    onComplete();
  };

  return (
    <div>
      <iframe src={uri} className="w-full h-[60vh] rounded-xl border border-slate-200" title="Policy document" />
      <div className="mt-4 card p-4">
        <button
          type="button"
          disabled={acknowledged}
          onClick={handleAck}
          className={`btn-primary w-full ${acknowledged ? 'bg-emerald-600' : ''}`}
        >
          {acknowledged ? 'Policy Acknowledged' : 'I Acknowledge This Policy'}
        </button>
      </div>
    </div>
  );
}

export function ModulePage() {
  const { enrollmentId, moduleId } = useParams<{ enrollmentId: string; moduleId: string }>();
  const queryClient = useQueryClient();
  const [moduleDone, setModuleDone] = useState(false);

  const { data: progress } = useQuery({
    queryKey: ['progress', enrollmentId],
    queryFn: () => getEnrollmentProgress(enrollmentId!),
    enabled: !!enrollmentId,
  });

  const { data: course } = useQuery({
    queryKey: ['course', progress?.courseId],
    queryFn: () => getCourse(progress!.courseId),
    enabled: !!progress?.courseId,
  });

  const completeMutation = useMutation({
    mutationFn: () => completeModule(enrollmentId!, moduleId!),
    onSuccess: (data) => {
      setModuleDone(true);
      queryClient.invalidateQueries({ queryKey: ['progress', enrollmentId] });
      queryClient.invalidateQueries({ queryKey: ['assigned'] });
      queryClient.invalidateQueries({ queryKey: ['learner-stats'] });
      if (data.isComplete) {
        queryClient.invalidateQueries({ queryKey: ['progress'] });
      }
    },
  });

  const module = course?.modules.find((m) => m.id === moduleId);
  const alreadyComplete = progress?.completedModuleIds.includes(moduleId ?? '');

  if (!module || !enrollmentId) {
    return <div className="p-6 text-slate-500">Loading module...</div>;
  }

  const passingScore = module.passingScorePercentage ?? 70;
  const handleComplete = () => {
    if (!alreadyComplete && !moduleDone) {
      completeMutation.mutate();
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Link
        to={`/training/${enrollmentId}`}
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to course
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900">{module.title}</h1>
        {(alreadyComplete || moduleDone) && (
          <span className="flex items-center gap-1 text-sm text-emerald-600 font-medium">
            <CheckCircle className="w-4 h-4" /> Completed
          </span>
        )}
      </div>

      {module.contentType === 'VIDEO_MP4' && module.contentUrl && (
        <VideoViewer uri={module.contentUrl} onComplete={handleComplete} />
      )}

      {module.contentType === 'QUIZ_EXCEL' && (
        <QuizViewer moduleId={module.id} enrollmentId={enrollmentId} passingScore={passingScore} />
      )}

      {module.contentType === 'RICH_TEXT' && module.richTextContent && (
        <RichTextViewer content={module.richTextContent} onComplete={handleComplete} />
      )}

      {(module.contentType === 'DOCUMENT_PDF' || module.contentType === 'PDF_POLICY') && module.contentUrl && (
        <PdfViewer uri={module.contentUrl} onComplete={handleComplete} />
      )}

      {module.contentType === 'SCORM_ZIP' && module.contentUrl && (
        <>
          <iframe
            src={`${module.contentUrl}/${module.scormEntryPointHtml ?? 'index.html'}`}
            className="w-full h-[70vh] rounded-xl border border-slate-200"
            title="SCORM content"
          />
          {!alreadyComplete && !moduleDone && (
            <button type="button" onClick={handleComplete} className="btn-primary w-full mt-4 py-3">
              Mark SCORM Module Complete
            </button>
          )}
        </>
      )}

      {!module.contentUrl && module.contentType !== 'QUIZ_EXCEL' && module.contentType !== 'RICH_TEXT' && (
        <div className="card p-8 text-center text-slate-500">
          Content not yet uploaded for this module.
        </div>
      )}
    </div>
  );
}
