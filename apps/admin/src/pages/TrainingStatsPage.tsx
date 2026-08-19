import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader, StatusBadge } from '../components/ui';
import { DeleteButton } from '../components/DeleteButton';
import { TrainingReportExportButtons } from '../components/TrainingReportExportButtons';
import { api, getApiError } from '../lib/api';

interface TrainingStats {
  assignments: Array<{
    id: string;
    trainingId: string;
    trainingTitle: string;
    trainingType: string;
    targetType: string;
    isMandatory: boolean;
    totalEnrolled: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    overdue: number;
    completionRate: number;
    enrollments: Array<{
      id: string;
      status: string;
      progressPercentage: number;
      user: { fullName: string; email: string; department: string };
    }>;
  }>;
  enrollments: Array<{
    id: string;
    status: string;
    progressPercentage: number;
    dueDate: string | null;
    completedAt: string | null;
    user: { fullName: string; email: string; department: string };
    training: { title: string; type: string };
    assignment: { isMandatory: boolean; passingScorePercentage: number } | null;
  }>;
}

export function TrainingStatsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['training-stats'],
    queryFn: async () => {
      const { data: res } = await api.get('/api/v1/admin/training-stats');
      return res.data as TrainingStats;
    },
  });

  if (isLoading) return <div className="text-slate-500">Loading training statistics...</div>;
  if (error) return <div className="card p-8 text-rose-600">Failed to load stats: {getApiError(error)}</div>;

  return (
    <div>
      <PageHeader
        title="Training Statistics"
        subtitle="Progress and completion rates for all assigned training"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {(data?.assignments ?? []).map((a) => (
          <div key={a.id} className="card p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">{a.targetType} assignment</p>
                <h3 className="font-bold text-slate-900 mt-1">{a.trainingTitle}</h3>
                <p className="text-sm text-slate-500">{a.trainingType === 'VIDEO_QUIZ' ? 'Video + Quiz' : 'SCORM'}</p>
              </div>
              <DeleteButton
                confirmMessage={`Delete this assignment for "${a.trainingTitle}"? All enrollments will be removed.`}
                onDelete={async () => {
                  await api.delete(`/api/v1/admin/assignments/${a.id}`);
                  queryClient.invalidateQueries({ queryKey: ['training-stats'] });
                }}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div className="bg-slate-50 rounded-lg p-2">
                <p className="text-slate-500 text-xs">Enrolled</p>
                <p className="font-bold">{a.totalEnrolled}</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-2">
                <p className="text-emerald-600 text-xs">Completed</p>
                <p className="font-bold text-emerald-700">{a.completed}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-2">
                <p className="text-blue-600 text-xs">In Progress</p>
                <p className="font-bold text-blue-700">{a.inProgress}</p>
              </div>
              <div className="bg-rose-50 rounded-lg p-2">
                <p className="text-rose-600 text-xs">Overdue</p>
                <p className="font-bold text-rose-700">{a.overdue}</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Completion rate</span>
                <span>{a.completionRate}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full">
                <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${a.completionRate}%` }} />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-2">Download training report</p>
              <TrainingReportExportButtons trainingId={a.trainingId} trainingTitle={a.trainingTitle} compact />
            </div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">All Learner Progress</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left p-4 font-semibold text-slate-600">Learner</th>
                <th className="text-left p-4 font-semibold text-slate-600">Department</th>
                <th className="text-left p-4 font-semibold text-slate-600">Training</th>
                <th className="text-left p-4 font-semibold text-slate-600">Progress</th>
                <th className="text-left p-4 font-semibold text-slate-600">Status</th>
                <th className="text-left p-4 font-semibold text-slate-600">Due Date</th>
                <th className="text-left p-4 font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.enrollments ?? []).map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="p-4">
                    <p className="font-medium text-slate-900">{e.user.fullName}</p>
                    <p className="text-xs text-slate-400">{e.user.email}</p>
                  </td>
                  <td className="p-4 text-slate-600">{e.user.department}</td>
                  <td className="p-4 text-slate-600">{e.training.title}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-slate-100 rounded-full">
                        <div
                          className="h-full bg-indigo-600 rounded-full"
                          style={{ width: `${e.progressPercentage}%` }}
                        />
                      </div>
                      <span className="text-slate-600">{Math.round(e.progressPercentage)}%</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <StatusBadge status={e.status} />
                  </td>
                  <td className="p-4 text-slate-600">
                    {e.dueDate ? new Date(e.dueDate).toLocaleDateString() : '—'}
                    {e.completedAt && (
                      <p className="text-xs text-emerald-600">
                        Done {new Date(e.completedAt).toLocaleDateString()}
                      </p>
                    )}
                  </td>
                  <td className="p-4">
                    <DeleteButton
                      confirmMessage={`Remove ${e.user.fullName} from "${e.training.title}"?`}
                      onDelete={async () => {
                        await api.delete(`/api/v1/admin/enrollments/${e.id}`);
                        queryClient.invalidateQueries({ queryKey: ['training-stats'] });
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!data?.enrollments || data.enrollments.length === 0) && (
            <p className="p-8 text-center text-slate-400">No enrollments yet. Create an assignment to get started.</p>
          )}
        </div>
      </div>
    </div>
  );
}
