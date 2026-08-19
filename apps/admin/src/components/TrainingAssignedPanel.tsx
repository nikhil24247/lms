import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Pencil, UserPlus, Users, X } from 'lucide-react';
import { StatusBadge } from './ui';
import { TrainingAssignForm, TrainingAssignValues } from './TrainingAssignForm';
import { TrainingReportExportButtons } from './TrainingReportExportButtons';
import { api, getApiError } from '../lib/api';

interface EnrollmentRow {
  id: string;
  status: string;
  progressPercentage: number;
  completionScore: number | null;
  dueDate: string | null;
  completedAt: string | null;
  user: { id: string; fullName: string; email: string; department: string };
}

export function TrainingAssignedPanel({
  trainingId,
  trainingTitle,
  onClose,
}: {
  trainingId: string;
  trainingTitle: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignStatus, setAssignStatus] = useState<string | null>(null);

  const { data: enrollments, isLoading, error } = useQuery({
    queryKey: ['training-enrollments', trainingId],
    queryFn: async () =>
      (await api.get(`/api/v1/admin/trainings/${trainingId}/enrollments`)).data.data as EnrollmentRow[],
  });

  const handleAssign = async (values: TrainingAssignValues) => {
    setAssignError(null);
    setAssignStatus(null);
    try {
      await api.post('/api/v1/admin/assignments', {
        trainingId,
        targetType: values.targetType,
        targetId: values.targetType === 'USER' || values.targetType === 'DEPARTMENT' ? values.targetId : undefined,
        targetGroupId: values.targetType === 'GROUP' ? values.targetGroupId : undefined,
        dueDate: values.dueDate || undefined,
        isMandatory: values.isMandatory,
        autoRemindDaysBefore: values.autoRemindDaysBefore,
      });
      setAssignStatus('Learners assigned');
      setShowAssignForm(false);
      queryClient.invalidateQueries({ queryKey: ['training-enrollments', trainingId] });
      queryClient.invalidateQueries({ queryKey: ['trainings'] });
    } catch (e) {
      setAssignError(getApiError(e));
      throw e;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="card p-0 w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-hidden flex flex-col animate-slide-up safe-bottom">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-100">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Assigned training</p>
            <h3 className="font-semibold text-lg text-slate-900 truncate">{trainingTitle}</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {enrollments?.length ?? 0} learner{(enrollments?.length ?? 0) === 1 ? '' : 's'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 p-4 border-b border-slate-100 bg-slate-50/80">
          <Link to={`/trainings/${trainingId}`} className="btn-secondary text-sm">
            <Pencil className="w-4 h-4" /> Edit training
          </Link>
          <TrainingReportExportButtons trainingId={trainingId} trainingTitle={trainingTitle} compact />
          <button type="button" className="btn-primary text-sm" onClick={() => setShowAssignForm((v) => !v)}>
            <UserPlus className="w-4 h-4" /> {showAssignForm ? 'Hide assign form' : 'Assign more'}
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {showAssignForm && (
            <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4">
              <p className="text-sm font-semibold text-slate-800 mb-3">Assign to more learners</p>
              {assignError && <p className="text-sm text-rose-600 mb-2">{assignError}</p>}
              {assignStatus && <p className="text-sm text-emerald-600 mb-2">{assignStatus}</p>}
              <TrainingAssignForm submitLabel="Assign learners" onSubmit={handleAssign} />
            </div>
          )}

          {isLoading && <p className="text-sm text-slate-500 py-8 text-center">Loading assigned users…</p>}
          {error && <p className="text-sm text-rose-600">{getApiError(error)}</p>}

          {!isLoading && !error && (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">Learner</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-3 py-2.5 font-medium">Progress</th>
                    <th className="px-3 py-2.5 font-medium">Score</th>
                    <th className="px-3 py-2.5 font-medium">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {(enrollments ?? []).map((e) => (
                    <tr key={e.id} className="border-t border-slate-100">
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-slate-900">{e.user.fullName}</p>
                        <p className="text-xs text-slate-500">{e.user.email}</p>
                        <p className="text-[11px] text-slate-400">{e.user.department}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={e.status} />
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">{e.progressPercentage}%</td>
                      <td className="px-3 py-2.5 text-slate-700">
                        {e.completionScore != null ? `${Math.round(e.completionScore)}%` : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                        {e.dueDate ? new Date(e.dueDate).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(enrollments ?? []).length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm">No learners assigned yet.</p>
                  <button type="button" className="text-brand-600 text-sm font-medium mt-2" onClick={() => setShowAssignForm(true)}>
                    Assign learners
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
