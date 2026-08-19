import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileDown,
  Users,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  ClipboardList,
  Shield,
} from 'lucide-react';
import { PageHeader, StatCard, StatusBadge } from '../components/ui';
import { api, downloadAuditExport, downloadEnrollmentExport, getApiError } from '../lib/api';
import type { AnalyticsOverview } from '@lms/shared';

interface TrainingStats {
  assignments: Array<{
    id: string;
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
    dueDate: string | null;
  }>;
  enrollments: Array<{
    id: string;
    status: string;
    progressPercentage: number;
    dueDate: string | null;
    completedAt: string | null;
    videoCompleted: boolean;
    quizPassed: boolean;
    scormScore: number | null;
    user: { fullName: string; email: string; department: string };
    training: { title: string; type: string };
    assignment: { isMandatory: boolean } | null;
  }>;
}

interface AuditLog {
  id: string;
  action: string;
  resource: string;
  ipAddress: string | null;
  timestamp: string;
  userEmail: string;
  userName: string;
}

export function ReportsPage() {
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  const { data: analytics, isLoading: analyticsLoading, error: analyticsError } = useQuery<AnalyticsOverview>({
    queryKey: ['reports-analytics'],
    queryFn: async () => (await api.get('/api/v1/admin/analytics/overview')).data.data,
  });

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<TrainingStats>({
    queryKey: ['reports-training-stats'],
    queryFn: async () => (await api.get('/api/v1/admin/training-stats')).data.data,
  });

  const { data: auditLogs, isLoading: logsLoading, error: logsError } = useQuery<AuditLog[]>({
    queryKey: ['reports-audit-logs'],
    queryFn: async () => (await api.get('/api/v1/admin/reports/audit-logs')).data.data,
  });

  const isLoading = analyticsLoading || statsLoading || logsLoading;
  const loadError = analyticsError || statsError || logsError;

  const handleExport = async (type: 'audit' | 'enrollment') => {
    setExportError(null);
    setExporting(type);
    try {
      if (type === 'audit') await downloadAuditExport();
      else await downloadEnrollmentExport();
    } catch (err) {
      setExportError(getApiError(err));
    } finally {
      setExporting(null);
    }
  };

  if (isLoading) return <div className="text-slate-500">Loading reports...</div>;

  if (loadError) {
    return (
      <div className="card p-8 text-center text-rose-600">
        Failed to load reports: {getApiError(loadError)}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Compliance overview, training progress, and audit trail"
        action={
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('enrollment')}
              disabled={!!exporting}
              className="btn-secondary"
            >
              <FileDown className="w-4 h-4" />
              {exporting === 'enrollment' ? 'Exporting...' : 'Enrollment CSV'}
            </button>
            <button
              onClick={() => handleExport('audit')}
              disabled={!!exporting}
              className="btn-primary"
            >
              <FileDown className="w-4 h-4" />
              {exporting === 'audit' ? 'Exporting...' : 'Audit CSV'}
            </button>
          </div>
        }
      />

      {exportError && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">
          {exportError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Compliance Rate" value={`${analytics?.complianceRate ?? 0}%`} icon={TrendingUp} color="emerald" />
        <StatCard label="Total Enrollments" value={analytics?.totalEnrollments ?? 0} icon={Users} color="indigo" />
        <StatCard label="Completed" value={analytics?.completedCount ?? 0} icon={CheckCircle} color="emerald" />
        <StatCard label="Overdue" value={analytics?.overdueCount ?? 0} icon={AlertTriangle} color="rose" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-slate-900">Department Compliance</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left p-4 font-semibold text-slate-600">Department</th>
                <th className="text-left p-4 font-semibold text-slate-600">Completed</th>
                <th className="text-left p-4 font-semibold text-slate-600">Total</th>
                <th className="text-left p-4 font-semibold text-slate-600">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(analytics?.departmentBreakdown ?? []).map((d) => {
                const rate = d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0;
                return (
                  <tr key={d.department} className="hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-900">{d.department}</td>
                    <td className="p-4 text-slate-600">{d.completed}</td>
                    <td className="p-4 text-slate-600">{d.total}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-slate-100 rounded-full">
                          <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${rate}%` }} />
                        </div>
                        <span className="text-slate-600">{rate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(!analytics?.departmentBreakdown || analytics.departmentBreakdown.length === 0) && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">No department data yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-slate-900">Assignment Summary</h2>
          </div>
          <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto">
            {(stats?.assignments ?? []).map((a) => (
              <div key={a.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{a.trainingTitle}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {a.trainingType === 'VIDEO_QUIZ' ? 'Video + Quiz' : 'SCORM'} · {a.targetType}
                      {a.isMandatory ? ' · Mandatory' : ''}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-indigo-600">{a.completionRate}%</span>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
                  <div className="bg-slate-50 rounded p-2 text-center">
                    <p className="text-slate-400">Enrolled</p>
                    <p className="font-bold text-slate-700">{a.totalEnrolled}</p>
                  </div>
                  <div className="bg-emerald-50 rounded p-2 text-center">
                    <p className="text-emerald-600">Done</p>
                    <p className="font-bold text-emerald-700">{a.completed}</p>
                  </div>
                  <div className="bg-blue-50 rounded p-2 text-center">
                    <p className="text-blue-600">Active</p>
                    <p className="font-bold text-blue-700">{a.inProgress}</p>
                  </div>
                  <div className="bg-rose-50 rounded p-2 text-center">
                    <p className="text-rose-600">Overdue</p>
                    <p className="font-bold text-rose-700">{a.overdue}</p>
                  </div>
                </div>
              </div>
            ))}
            {(!stats?.assignments || stats.assignments.length === 0) && (
              <p className="p-8 text-center text-slate-400">No assignments yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden mb-8">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">All Learner Enrollments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left p-4 font-semibold text-slate-600">Learner</th>
                <th className="text-left p-4 font-semibold text-slate-600">Department</th>
                <th className="text-left p-4 font-semibold text-slate-600">Training</th>
                <th className="text-left p-4 font-semibold text-slate-600">Type</th>
                <th className="text-left p-4 font-semibold text-slate-600">Progress</th>
                <th className="text-left p-4 font-semibold text-slate-600">Status</th>
                <th className="text-left p-4 font-semibold text-slate-600">Due</th>
                <th className="text-left p-4 font-semibold text-slate-600">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(stats?.enrollments ?? []).map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="p-4">
                    <p className="font-medium text-slate-900">{e.user.fullName}</p>
                    <p className="text-xs text-slate-400">{e.user.email}</p>
                  </td>
                  <td className="p-4 text-slate-600">{e.user.department}</td>
                  <td className="p-4 text-slate-600">{e.training.title}</td>
                  <td className="p-4 text-slate-500 text-xs">
                    {e.training.type === 'VIDEO_QUIZ' ? 'Video + Quiz' : 'SCORM'}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-slate-100 rounded-full">
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
                  </td>
                  <td className="p-4 text-slate-600">
                    {e.completedAt ? new Date(e.completedAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!stats?.enrollments || stats.enrollments.length === 0) && (
            <p className="p-8 text-center text-slate-400">No enrollments to report</p>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-600" />
          <h2 className="font-semibold text-slate-900">Audit Trail</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left p-4 font-semibold text-slate-600">Timestamp</th>
                <th className="text-left p-4 font-semibold text-slate-600">User</th>
                <th className="text-left p-4 font-semibold text-slate-600">Action</th>
                <th className="text-left p-4 font-semibold text-slate-600">Resource</th>
                <th className="text-left p-4 font-semibold text-slate-600">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(auditLogs ?? []).map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="p-4 text-slate-600 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <p className="font-medium text-slate-900">{log.userName}</p>
                    <p className="text-xs text-slate-400">{log.userEmail}</p>
                  </td>
                  <td className="p-4 text-slate-700">{log.action}</td>
                  <td className="p-4 text-slate-500 text-xs max-w-xs truncate" title={log.resource}>
                    {log.resource}
                  </td>
                  <td className="p-4 text-slate-500">{log.ipAddress ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!auditLogs || auditLogs.length === 0) && (
            <p className="p-8 text-center text-slate-400">No audit events recorded yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
