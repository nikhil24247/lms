import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Video, Package, ExternalLink, Star, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { QueryState } from '../components/QueryState';
import { QuizPlayer } from '../components/QuizPlayer';

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function TrainingPlayerPage() {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [quizResult, setQuizResult] = useState<{ score: number; isPassed: boolean } | null>(null);
  const [videoDone, setVideoDone] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [policyAgreed, setPolicyAgreed] = useState(false);
  const [signature, setSignature] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['learn', enrollmentId],
    queryFn: async () => {
      const enrollment = await api.get('/api/v1/enrollments/assigned').then((r) =>
        r.data.data.find((e: { id: string }) => e.id === enrollmentId),
      );
      if (!enrollment) throw new Error('Not found');
      const { data: learn } = await api.get(`/api/v1/trainings/${enrollment.training.id}/learn`);
      return learn.data;
    },
    enabled: !!enrollmentId,
  });

  useEffect(() => {
    if (!enrollmentId || isLoading || !data || data.enrollment.status === 'COMPLETED') return;
    void api.post('/api/v1/trainings/progress/training-start', { enrollmentId }).catch(() => {});
  }, [enrollmentId, isLoading, data]);

  const moduleCompleteMutation = useMutation({
    mutationFn: (body: { moduleId: string; signatureText?: string }) =>
      api.post('/api/v1/trainings/progress/module-complete', {
        enrollmentId,
        moduleId: body.moduleId,
        signatureText: body.signatureText,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learn', enrollmentId] });
      queryClient.invalidateQueries({ queryKey: ['assigned'] });
      setPolicyAgreed(false);
      setSignature('');
    },
  });

  const videoMutation = useMutation({
    mutationFn: () => api.post('/api/v1/trainings/progress/video-complete', { enrollmentId }),
    onSuccess: () => {
      setVideoDone(true);
      queryClient.invalidateQueries({ queryKey: ['learn', enrollmentId] });
      queryClient.invalidateQueries({ queryKey: ['assigned'] });
    },
  });

  const quizMutation = useMutation({
    mutationFn: (moduleId?: string) =>
      api.post('/api/v1/trainings/progress/quiz-submit', { enrollmentId, answers, moduleId }),
    onSuccess: (res) => {
      setQuizResult(res.data.data);
      queryClient.invalidateQueries({ queryKey: ['assigned'] });
      queryClient.invalidateQueries({ queryKey: ['learn', enrollmentId] });
    },
  });

  const scormMutation = useMutation({
    mutationFn: (body: { score?: number; status?: string; moduleId?: string }) =>
      api.post('/api/v1/trainings/progress/scorm', { enrollmentId, ...body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assigned'] }),
  });

  if (isLoading || !data) {
    return (
      <div className="p-6">
        <QueryState isLoading={isLoading} error={error}><></></QueryState>
      </div>
    );
  }

  const { enrollment, training } = data;
  const isModular = training.type === 'MODULAR' && training.modules?.length > 0;
  const isComplete = enrollment.status === 'COMPLETED';
  const modules = training.modules ?? [];
  const moduleProgress = enrollment.moduleProgress ?? [];
  const currentModuleId = activeModuleId ?? modules.find((m: { id: string }) =>
    !moduleProgress.some((p: { moduleId: string; isCompleted: boolean }) => p.moduleId === m.id && p.isCompleted),
  )?.id ?? modules[0]?.id;
  const currentModule = modules.find((m: { id: string }) => m.id === currentModuleId);

  const isModuleDone = (moduleId: string) =>
    moduleProgress.some((p: { moduleId: string; isCompleted: boolean }) => p.moduleId === moduleId && p.isCompleted);

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 pb-8">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <div className="hero-banner rounded-2xl p-6 text-white mb-6 shadow-lg">
        <div className="flex items-center gap-2 text-indigo-200 text-sm">
          {isModular ? <Package className="w-4 h-4" /> : training.type === 'VIDEO_QUIZ' ? <Video className="w-4 h-4" /> : <Package className="w-4 h-4" />}
          {isModular ? 'Modular Course' : training.type === 'VIDEO_QUIZ' ? 'Video + Quiz' : 'SCORM Training'}
        </div>
        <h1 className="text-2xl font-bold mt-1">{training.title}</h1>
        {enrollment.expiresAt && (
          <p className="text-xs text-amber-200 mt-2">Certification expires: {new Date(enrollment.expiresAt).toLocaleDateString()}</p>
        )}
        <div className="mt-3 h-2 bg-white/20 rounded-full">
          <div className="h-full bg-white rounded-full" style={{ width: `${enrollment.progressPercentage}%` }} />
        </div>
        <p className="text-indigo-200 text-xs mt-1">{enrollment.progressPercentage}% complete</p>
      </div>

      {isComplete && (
        <div className="card p-6 text-center bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50 mb-6 animate-celebrate">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-100 mt-2">Training complete!</h3>
          {enrollment.completionPoints != null && (
            <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm">
              <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-3 py-1 rounded-full">
                <Star className="w-4 h-4" /> +{enrollment.completionPoints} points
              </span>
              {enrollment.completionScore != null && (
                <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full">
                  Score: {Math.round(enrollment.completionScore)}%
                </span>
              )}
              {enrollment.timeSpentSec > 0 && (
                <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
                  <Clock className="w-4 h-4" /> {formatDuration(enrollment.timeSpentSec)}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {!isComplete && enrollment.startedAt && (
        <p className="text-xs text-slate-500 mb-4 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          Started {new Date(enrollment.startedAt).toLocaleString()} — faster completion earns more points
        </p>
      )}

      {isModular && (
        <>
          <div className="card p-4 mb-4 flex flex-wrap gap-2">
            {modules.map((m: { id: string; title: string; moduleType: string }, i: number) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveModuleId(m.id)}
                className={`text-xs px-3 py-2 rounded-lg border ${currentModuleId === m.id ? 'border-brand-500 bg-brand-50' : 'border-slate-200'} ${isModuleDone(m.id) ? 'text-emerald-700' : ''}`}
              >
                {i + 1}. {m.title} {isModuleDone(m.id) ? '✓' : ''}
              </button>
            ))}
          </div>

          {currentModule && (
            <div className="card p-5 mb-4">
              <h3 className="font-semibold mb-3">{currentModule.title}</h3>

              {currentModule.moduleType === 'VIDEO' && currentModule.videoUrl && (
                <video src={currentModule.videoUrl} controls className="w-full rounded-xl bg-black" onEnded={() => moduleCompleteMutation.mutate({ moduleId: currentModule.id })} />
              )}

              {currentModule.moduleType === 'PDF' && (
                <div className="space-y-4">
                  {currentModule.fileUrl ? (
                    <iframe src={currentModule.fileUrl} className="w-full h-96 rounded-xl border" title={currentModule.title} />
                  ) : (
                    <p className="text-amber-600 text-sm">PDF not available.</p>
                  )}
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={policyAgreed} onChange={(e) => setPolicyAgreed(e.target.checked)} />
                    I have read and agree to this policy
                  </label>
                  <input className="input" placeholder="Type your full name to sign" value={signature} onChange={(e) => setSignature(e.target.value)} />
                  <button
                    disabled={!policyAgreed || !signature.trim() || isModuleDone(currentModule.id)}
                    onClick={() => moduleCompleteMutation.mutate({ moduleId: currentModule.id, signatureText: signature })}
                    className="btn-primary"
                  >
                    Acknowledge & Sign
                  </button>
                </div>
              )}

              {currentModule.moduleType === 'RICH_TEXT' && (
                <div>
                  <div className="prose prose-slate max-w-none mb-4" dangerouslySetInnerHTML={{ __html: currentModule.richTextContent?.replace(/\n/g, '<br/>') ?? '' }} />
                  <button onClick={() => moduleCompleteMutation.mutate({ moduleId: currentModule.id })} className="btn-primary" disabled={isModuleDone(currentModule.id)}>Mark Complete</button>
                </div>
              )}

              {currentModule.moduleType === 'EXTERNAL' && (
                <div className="space-y-3">
                  <a href={currentModule.externalUrl} target="_blank" rel="noreferrer" className="btn-secondary inline-flex">
                    <ExternalLink className="w-4 h-4" /> Open External Course
                  </a>
                  <button onClick={() => moduleCompleteMutation.mutate({ moduleId: currentModule.id })} className="btn-primary block" disabled={isModuleDone(currentModule.id)}>Mark Complete</button>
                </div>
              )}

              {currentModule.moduleType === 'SCORM' && (
                <div className="space-y-3">
                  {currentModule.scormContentUrl && (
                    <iframe src={currentModule.scormContentUrl} className="w-full h-96 rounded-xl border" title="SCORM" />
                  )}
                  <button
                    onClick={() => {
                      scormMutation.mutate({ status: 'completed', score: 100, moduleId: currentModule.id });
                      moduleCompleteMutation.mutate({ moduleId: currentModule.id });
                    }}
                    className="btn-primary"
                    disabled={isModuleDone(currentModule.id)}
                  >
                    Mark SCORM Complete
                  </button>
                </div>
              )}

              {currentModule.moduleType === 'QUIZ' && training.questions?.length > 0 && (
                <>
                  <QuizPlayer
                    questions={training.questions}
                    answers={answers}
                    onAnswer={(qId, val) => setAnswers((prev) => ({ ...prev, [qId]: val }))}
                    enrollmentId={enrollment.id}
                  />
                  {!isModuleDone(currentModule.id) && (
                    <button onClick={() => quizMutation.mutate(currentModule.id)} disabled={quizMutation.isPending} className="btn-primary mt-4">
                      Submit Quiz
                    </button>
                  )}
                  {quizResult && (
                    <p className={`text-sm mt-2 ${quizResult.isPassed ? 'text-emerald-600' : 'text-rose-600'}`}>
                      Score: {quizResult.score}% — {quizResult.isPassed ? 'Passed' : 'Failed'}
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {!isModular && training.type === 'VIDEO_QUIZ' && (
        <>
          <div className="card p-5 mb-4">
            <h3 className="font-semibold mb-3">1. Watch Video</h3>
            {training.videoUrl ? (
              <>
                <video src={training.videoUrl} controls className="w-full rounded-xl bg-black" onTimeUpdate={(e) => {
                  const v = e.currentTarget;
                  if (v.duration && v.currentTime / v.duration >= 0.9 && !enrollment.videoCompleted && !videoDone) videoMutation.mutate();
                }} />
                {(enrollment.videoCompleted || videoDone) && <p className="text-emerald-600 text-sm mt-2 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Video completed</p>}
              </>
            ) : <p className="text-amber-600 text-sm">Video not yet uploaded.</p>}
          </div>
          <div className="card p-5">
            <h3 className="font-semibold mb-3">2. Complete Quiz</h3>
            <QuizPlayer
              questions={training.questions}
              answers={answers}
              onAnswer={(qId, val) => setAnswers((prev) => ({ ...prev, [qId]: val }))}
              enrollmentId={enrollment.id}
            />
            <button onClick={() => quizMutation.mutate(undefined)} disabled={quizMutation.isPending || (!enrollment.videoCompleted && !videoDone)} className="btn-primary mt-4">
              Submit Quiz
            </button>
            {quizResult && (
              <p className={`text-sm mt-2 ${quizResult.isPassed ? 'text-emerald-600' : 'text-rose-600'}`}>
                Score: {quizResult.score}% — {quizResult.isPassed ? 'Passed' : 'Failed'}
              </p>
            )}
          </div>
        </>
      )}

      {!isModular && training.type === 'SCORM' && (
        <div className="card p-5">
          <h3 className="font-semibold mb-3">SCORM Content</h3>
          {training.scormContentUrl ? (
            <iframe src={training.scormContentUrl} className="w-full h-96 rounded-xl border mb-3" title="SCORM" />
          ) : <p className="text-amber-600 text-sm">SCORM not uploaded.</p>}
          <button onClick={() => scormMutation.mutate({ status: 'completed', score: 100 })} className="btn-primary">Mark Complete</button>
        </div>
      )}
    </div>
  );
}
