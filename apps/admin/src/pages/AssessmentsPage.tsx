import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, CheckCircle, XCircle } from 'lucide-react';
import { PageHeader, StatCard } from '../components/ui';
import { QueryState } from '../components/QueryState';
import { api, getApiError } from '../lib/api';

interface Submission {
  id: string;
  textAnswer: string | null;
  fileUrl: string | null;
  score: number | null;
  feedback: string | null;
  status: string;
  submittedAt: string;
  user: { fullName: string; email: string; department: { name: string } | null };
  question: { questionText: string; questionType: string };
  enrollment: { training: { title: string } };
}

export function AssessmentsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('PENDING_REVIEW');
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradeScore, setGradeScore] = useState(80);
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [gradePassed, setGradePassed] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data: stats } = useQuery({
    queryKey: ['assessment-stats'],
    queryFn: async () => (await api.get('/api/v1/admin/assessments/stats')).data.data,
  });

  const { data: submissions, isLoading, error: loadError } = useQuery({
    queryKey: ['assessment-submissions', statusFilter],
    queryFn: async () =>
      (await api.get('/api/v1/admin/assessments/submissions', {
        params: statusFilter ? { status: statusFilter } : {},
      })).data.data as Submission[],
  });

  const gradeMutation = useMutation({
    mutationFn: (id: string) =>
      api.post(`/api/v1/admin/assessments/submissions/${id}/grade`, {
        score: gradeScore,
        feedback: gradeFeedback,
        passed: gradePassed,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['assessment-stats'] });
      setGradingId(null);
      setGradeFeedback('');
    },
    onError: (err) => setError(getApiError(err)),
  });

  const statusColor: Record<string, string> = {
    PENDING_REVIEW: 'bg-amber-100 text-amber-700',
    GRADED: 'bg-emerald-100 text-emerald-700',
    AUTO_PASSED: 'bg-blue-100 text-blue-700',
    REJECTED: 'bg-rose-100 text-rose-700',
  };

  return (
    <div>
      <PageHeader
        title="Assessments & Submissions"
        subtitle="Review hands-on assignments and interactive quiz submissions"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Pending Review" value={stats?.pending ?? 0} icon={ClipboardCheck} color="amber" />
        <StatCard label="Graded" value={stats?.graded ?? 0} icon={CheckCircle} color="emerald" />
        <StatCard label="Auto-Passed" value={stats?.autoPassed ?? 0} icon={CheckCircle} color="indigo" />
        <StatCard label="Rejected" value={stats?.rejected ?? 0} icon={XCircle} color="rose" />
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold">Hands-On Submissions</h2>
          <select className="input w-auto text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="GRADED">Graded</option>
            <option value="AUTO_PASSED">Auto-Passed</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <QueryState isLoading={isLoading} error={loadError}>
          <div className="divide-y divide-slate-100">
            {(submissions ?? []).map((s) => (
              <div key={s.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">{s.user.fullName}</p>
                    <p className="text-sm text-slate-500">
                      {s.enrollment.training.title} · {s.user.department?.name ?? 'No dept'}
                    </p>
                    <p className="text-sm text-slate-700 mt-2 font-medium">{s.question.questionText}</p>
                    {s.textAnswer && (
                      <div className="mt-2 p-3 bg-slate-50 rounded-lg text-sm text-slate-700 whitespace-pre-wrap">
                        {s.textAnswer}
                      </div>
                    )}
                    {s.fileUrl && (
                      <a href={s.fileUrl} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 underline mt-1 inline-block">
                        View uploaded file
                      </a>
                    )}
                    <p className="text-xs text-slate-400 mt-2">
                      Submitted {new Date(s.submittedAt).toLocaleString()}
                    </p>
                    {s.feedback && <p className="text-sm text-slate-600 mt-2">Feedback: {s.feedback}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`badge text-xs ${statusColor[s.status] ?? 'bg-slate-100'}`}>{s.status}</span>
                    {s.score != null && <span className="text-sm font-bold text-indigo-600">{s.score}%</span>}
                    {s.status === 'PENDING_REVIEW' && (
                      <button onClick={() => setGradingId(s.id)} className="btn-primary text-xs py-1.5 px-3">
                        Grade
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {(!submissions || submissions.length === 0) && (
              <p className="p-8 text-center text-slate-400">No submissions found</p>
            )}
          </div>
        </QueryState>
      </div>

      {error && <p className="text-sm text-rose-600 mt-4">{error}</p>}

      {gradingId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50" onClick={() => setGradingId(null)}>
          <div className="card p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold mb-4">Grade Submission</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Score %</label>
                <input type="number" className="input" value={gradeScore} onChange={(e) => setGradeScore(+e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Feedback</label>
                <textarea className="input min-h-[80px]" value={gradeFeedback} onChange={(e) => setGradeFeedback(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={gradePassed} onChange={(e) => setGradePassed(e.target.checked)} />
                Mark as passed
              </label>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setGradingId(null)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={() => gradeMutation.mutate(gradingId)}
                disabled={gradeMutation.isPending}
                className="btn-primary flex-1"
              >
                {gradeMutation.isPending ? 'Saving...' : 'Submit Grade'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
