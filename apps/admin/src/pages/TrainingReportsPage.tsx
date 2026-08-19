import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileDown, Filter } from 'lucide-react';
import { PageHeader, StatusBadge } from '../components/ui';
import { QueryState } from '../components/QueryState';
import { TrainingReportExportButtons } from '../components/TrainingReportExportButtons';
import { api, downloadTrainingReport, getApiError, type TrainingReportFormat } from '../lib/api';

interface ReportFilters {
  trainingId: string;
  departmentId: string;
  groupId: string;
  location: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}

export function TrainingReportsPage() {
  const [filters, setFilters] = useState<ReportFilters>({
    trainingId: '',
    departmentId: '',
    groupId: '',
    location: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  });
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const queryParams = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v),
  );

  const { data: reports, isLoading, error } = useQuery({
    queryKey: ['training-reports', queryParams],
    queryFn: async () => (await api.get('/api/v1/admin/reports/training', { params: queryParams })).data.data,
  });

  const { data: trainings } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => (await api.get('/api/v1/admin/trainings')).data.data,
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => (await api.get('/api/v1/admin/departments')).data.data,
  });

  const { data: groups } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => (await api.get('/api/v1/admin/groups')).data.data,
  });

  const handleExportAll = async (format: TrainingReportFormat) => {
    setExporting(format);
    setExportError(null);
    try {
      if (filters.trainingId) {
        await downloadTrainingReport(filters.trainingId, format, undefined, queryParams);
      } else {
        const { data, headers } = await api.get(`/api/v1/admin/reports/training/export/${format}`, {
          params: queryParams,
          responseType: 'blob',
        });
        const disposition = headers['content-disposition'] as string | undefined;
        const match = disposition?.match(/filename="?([^";\n]+)"?/);
        const ext = format === 'excel' ? 'xlsx' : format;
        const filename = match?.[1] ?? `training-report.${ext}`;
        const url = URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      setExportError(getApiError(e));
    } finally {
      setExporting(null);
    }
  };

  if (error) return <div className="card p-8 text-rose-600">Failed to load: {getApiError(error)}</div>;

  return (
    <div>
      <PageHeader
        title="Training Reports"
        subtitle="Per-training completion, scores, and learner progress with downloadable exports"
        action={
          <div className="flex flex-wrap gap-2">
            {(['csv', 'excel', 'pdf'] as const).map((f) => (
              <button key={f} onClick={() => handleExportAll(f)} disabled={!!exporting} className="btn-secondary text-sm">
                <FileDown className="w-4 h-4" />
                {exporting === f ? '...' : `All ${f.toUpperCase()}`}
              </button>
            ))}
          </div>
        }
      />

      {exportError && <p className="text-sm text-rose-600 mb-4">{exportError}</p>}

      <div className="card p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-slate-500" />
          <h3 className="font-semibold text-slate-900">Filters</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <select className="input" value={filters.trainingId} onChange={(e) => setFilters({ ...filters, trainingId: e.target.value })}>
            <option value="">All Trainings</option>
            {trainings?.map((t: { id: string; title: string }) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
          <select className="input" value={filters.departmentId} onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}>
            <option value="">All Departments</option>
            {departments?.map((d: { id: string; name: string }) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select className="input" value={filters.groupId} onChange={(e) => setFilters({ ...filters, groupId: e.target.value })}>
            <option value="">All Groups</option>
            {groups?.map((g: { id: string; name: string }) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <input className="input" placeholder="Location" value={filters.location} onChange={(e) => setFilters({ ...filters, location: e.target.value })} />
          <select className="input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="NOT_STARTED">Not Started</option>
            <option value="FAILED">Failed</option>
          </select>
          <input type="date" className="input" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
          <input type="date" className="input" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
        </div>
      </div>

      <QueryState isLoading={isLoading} error={error}>
        <div className="space-y-6">
          {(reports ?? []).map((r: {
            trainingId: string;
            trainingTitle: string;
            trainingType: string;
            totalAssigned: number;
            completed: number;
            pending: number;
            completionPercentage: number;
            averageScore: number | null;
            passCount: number;
            failCount: number;
            averageTimeSpentSec: number;
            learners: Array<{
              fullName: string;
              email: string;
              department: string;
              location: string;
              status: string;
              progressPercentage: number;
              passFail: string;
              quizScore: number | null;
              scormScore: number | null;
              averageScore: number | null;
              timeSpentSec: number;
              completedAt: string | null;
              dueDate: string | null;
            }>;
          }) => (
            <div key={r.trainingId} className="card overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900">{r.trainingTitle}</h3>
                    <p className="text-sm text-slate-500">{r.trainingType === 'VIDEO_QUIZ' ? 'Video + Quiz' : 'SCORM'}</p>
                  </div>
                  <div className="flex flex-col sm:items-end gap-3 shrink-0">
                    <div className="text-sm">
                      <p className="font-bold text-indigo-600">{r.completionPercentage}% complete</p>
                      <p className="text-slate-500">{r.completed}/{r.totalAssigned} done · {r.pending} pending</p>
                    </div>
                    <TrainingReportExportButtons trainingId={r.trainingId} trainingTitle={r.trainingTitle} />
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div><span className="text-slate-500">Avg Score:</span> <strong>{r.averageScore ?? '—'}%</strong></div>
                  <div><span className="text-slate-500">Pass:</span> <strong className="text-emerald-600">{r.passCount}</strong></div>
                  <div><span className="text-slate-500">Fail:</span> <strong className="text-rose-600">{r.failCount}</strong></div>
                  <div><span className="text-slate-500">Avg Time:</span> <strong>{Math.round(r.averageTimeSpentSec / 60)}m</strong></div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white">
                      <th className="text-left p-3 font-semibold text-slate-600">Learner</th>
                      <th className="text-left p-3 font-semibold text-slate-600">Dept</th>
                      <th className="text-left p-3 font-semibold text-slate-600">Location</th>
                      <th className="text-left p-3 font-semibold text-slate-600">Status</th>
                      <th className="text-left p-3 font-semibold text-slate-600">Progress</th>
                      <th className="text-left p-3 font-semibold text-slate-600">Pass/Fail</th>
                      <th className="text-left p-3 font-semibold text-slate-600">Quiz</th>
                      <th className="text-left p-3 font-semibold text-slate-600">SCORM</th>
                      <th className="text-left p-3 font-semibold text-slate-600">Time</th>
                      <th className="text-left p-3 font-semibold text-slate-600">Due</th>
                      <th className="text-left p-3 font-semibold text-slate-600">Completed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {r.learners.map((l, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-3">
                          <p className="font-medium">{l.fullName}</p>
                          <p className="text-xs text-slate-400">{l.email}</p>
                        </td>
                        <td className="p-3 text-slate-600">{l.department}</td>
                        <td className="p-3 text-slate-600">{l.location}</td>
                        <td className="p-3"><StatusBadge status={l.status} /></td>
                        <td className="p-3 font-medium">{l.progressPercentage}%</td>
                        <td className="p-3">
                          <span className={`badge ${l.passFail === 'PASS' ? 'bg-emerald-100 text-emerald-700' : l.passFail === 'FAIL' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                            {l.passFail}
                          </span>
                        </td>
                        <td className="p-3">{l.quizScore != null ? `${l.quizScore}%` : '—'}</td>
                        <td className="p-3">{l.scormScore != null ? `${l.scormScore}%` : '—'}</td>
                        <td className="p-3">{Math.round(l.timeSpentSec / 60)}m</td>
                        <td className="p-3 text-slate-600">{l.dueDate ? new Date(l.dueDate).toLocaleDateString() : '—'}</td>
                        <td className="p-3 text-slate-600">{l.completedAt ? new Date(l.completedAt).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {(!reports || reports.length === 0) && (
            <p className="text-center text-slate-400 p-12">No report data for selected filters</p>
          )}
        </div>
      </QueryState>
    </div>
  );
}
