import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { PageHeader, StatCard } from '../components/ui';
import { getAnalytics, getApiError } from '../lib/api';
import type { AnalyticsOverview } from '@lms/shared';
import { Users, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';

const PIE_COLORS = ['#4f46e5', '#e2e8f0'];

export function AnalyticsPage() {
  const { data, isLoading, error } = useQuery<AnalyticsOverview>({
    queryKey: ['analytics'],
    queryFn: getAnalytics,
  });

  if (isLoading) return <div className="text-slate-500">Loading analytics...</div>;
  if (error) return <div className="card p-8 text-rose-600">Failed to load analytics: {getApiError(error)}</div>;

  const chartData =
    data?.departmentBreakdown.map((d) => ({
      name: d.department,
      completed: d.completed,
      pending: d.total - d.completed,
      total: d.total,
      rate: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0,
    })) ?? [];

  const pieData = [
    { name: 'Completed', value: data?.completedCount ?? 0 },
    { name: 'Pending', value: (data?.totalEnrollments ?? 0) - (data?.completedCount ?? 0) },
  ];

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Organization compliance metrics and department breakdown"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Compliance Rate" value={`${data?.complianceRate ?? 0}%`} icon={TrendingUp} color="emerald" />
        <StatCard label="Total Enrollments" value={data?.totalEnrollments ?? 0} icon={Users} color="indigo" />
        <StatCard label="Completed" value={data?.completedCount ?? 0} icon={CheckCircle} color="emerald" />
        <StatCard label="Overdue" value={data?.overdueCount ?? 0} icon={AlertTriangle} color="rose" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 card p-6">
          <h2 className="font-semibold text-slate-900 mb-6">Department Comparison</h2>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="completed" fill="#4f46e5" name="Completed" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pending" fill="#e2e8f0" name="Pending" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 mb-6">Completion Overview</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="text-center mt-2">
            <p className="text-3xl font-bold text-slate-900">{data?.complianceRate ?? 0}%</p>
            <p className="text-sm text-slate-500">Overall compliance</p>
          </div>
        </div>
      </div>

      <div className="card mt-6 overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Department Details</h2>
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
            {chartData.map((d) => (
              <tr key={d.name} className="hover:bg-slate-50">
                <td className="p-4 font-medium text-slate-900">{d.name}</td>
                <td className="p-4 text-slate-600">{d.completed}</td>
                <td className="p-4 text-slate-600">{d.total}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-200 rounded-full max-w-[100px]">
                      <div
                        className="h-2 bg-indigo-600 rounded-full"
                        style={{ width: `${d.rate}%` }}
                      />
                    </div>
                    <span className="text-slate-600">{d.rate}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
