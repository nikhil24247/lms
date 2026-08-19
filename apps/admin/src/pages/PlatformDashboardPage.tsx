import { useQuery } from '@tanstack/react-query';
import { Building2, Globe, Users, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader, StatCard } from '../components/ui';
import { QueryState } from '../components/QueryState';
import { api } from '../lib/api';

export function PlatformDashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['platform-dashboard'],
    queryFn: async () => (await api.get('/api/v1/platform/dashboard')).data.data,
  });

  return (
    <div>
      <PageHeader
        title="Platform Dashboard"
        subtitle="Global overview across all tenant companies"
        action={
          <Link to="/platform/companies" className="btn-primary">
            <Building2 className="w-4 h-4" /> Manage Companies
          </Link>
        }
      />

      <div className="hero-banner mb-8">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
            <Globe className="w-4 h-4" /> Super Admin · Global View
          </div>
          <h2 className="text-2xl font-bold font-display">ProPhish Platform</h2>
          <p className="text-white/70 mt-1 max-w-lg">
            Create companies, manage licenses, and switch into any tenant to inspect their training data.
          </p>
        </div>
      </div>

      <QueryState isLoading={isLoading} error={error}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <StatCard label="Companies" value={data?.stats?.totalCompanies ?? 0} icon={Building2} color="indigo" />
          <StatCard label="Active Tenants" value={data?.stats?.activeCompanies ?? 0} icon={Globe} color="brand" />
          <StatCard label="Total Learners" value={data?.stats?.totalUsers ?? 0} icon={Users} color="emerald" />
          <StatCard label="Platform Compliance" value={`${data?.stats?.platformComplianceRate ?? 0}%`} icon={BarChart3} color="amber" />
        </div>

        <div className="card overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="font-semibold font-display">All Companies</h2>
            <p className="text-sm text-slate-500 mt-0.5">Select a company from the switcher above to manage its training</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="text-left p-4 font-semibold text-slate-600">Company</th>
                <th className="text-left p-4 font-semibold text-slate-600">Status</th>
                <th className="text-left p-4 font-semibold text-slate-600">Users</th>
                <th className="text-left p-4 font-semibold text-slate-600">Courses</th>
                <th className="text-left p-4 font-semibold text-slate-600">License</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.companies ?? []).map((c: {
                id: string;
                name: string;
                slug: string;
                status: string;
                userCount: number;
                courseCount: number;
                licenseUsage: string;
              }) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="p-4">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.slug}</p>
                  </td>
                  <td className="p-4">
                    <span className={`badge text-xs ${c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="p-4">{c.userCount}</td>
                  <td className="p-4">{c.courseCount}</td>
                  <td className="p-4 text-slate-500">{c.licenseUsage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>
    </div>
  );
}
