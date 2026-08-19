import {
  BookOpen,
  Users,
  CheckCircle,
  AlertTriangle,
  Library,
  UserPlus,
  Clock,
  Plus,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QueryState } from '../components/QueryState';
import { CircularProgress, MiniBarChart, PatternOverlay } from '../components/graphics';
import { QuickActionCard } from '../components/flow/QuickActionCard';
import { PageTransition } from '../components/ui/motion';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';
import { PartnerLogo } from '../components/PartnerLogo';
import { getDashboard } from '../lib/api';

interface DashboardData {
  branding?: {
    companyName: string;
    logoUrl: string | null;
    showPartnerLogo: boolean;
    partnerLogoUrl: string | null;
    primaryColor: string | null;
  } | null;
  stats: {
    complianceRate: number;
    activeLearners: number;
    totalTrainings: number;
    totalEnrollments: number;
    completedCount: number;
    overdueCount: number;
  };
  recentEnrollments: Array<{
    id: string;
    status: string;
    progressPercentage: number;
    user: { fullName: string; department: string };
    training: { title: string; type: string };
    dueDate: string | null;
  }>;
  recentActivity?: Array<{
    id: string;
    action: string;
    userEmail: string;
    timestamp: string;
  }>;
}

export function DashboardPage() {
  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: getDashboard as () => Promise<DashboardData>,
  });

  const stats = data?.stats;
  const branding = data?.branding;
  const inProgress = (stats?.totalEnrollments ?? 0) - (stats?.completedCount ?? 0);

  return (
    <QueryState isLoading={isLoading} error={error} skeleton="dashboard">
      <PageTransition>
        <div className="space-y-6">
          <div className="hero-banner animate-fade-in">
            <PatternOverlay />
            <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {branding?.showPartnerLogo && (
                  <div className="mb-3">
                    <PartnerLogo src={branding.partnerLogoUrl} className="h-10 w-auto" />
                  </div>
                )}
                <p className="text-brand-200 text-sm font-medium">Admin home</p>
                <h1 className="text-2xl sm:text-3xl font-bold font-display mt-1">Your training hub</h1>
                <p className="text-white/75 text-sm mt-2 max-w-md">
                  Live compliance, learner progress, and quick actions — updated as your team learns.
                </p>
                {(stats?.overdueCount ?? 0) > 0 && (
                  <Link
                    to="/training-reports"
                    className="mt-4 inline-flex items-center gap-2 bg-rose-500/25 border border-rose-400/40 rounded-xl px-3 py-2 text-sm hover:bg-rose-500/35 transition-colors"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      <AnimatedNumber value={stats?.overdueCount ?? 0} /> overdue — review reports
                    </span>
                  </Link>
                )}
              </div>
              <CircularProgress value={stats?.complianceRate ?? 0} size={120} label="Compliance" sublabel="live" />
            </div>
          </div>

          <section>
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
              Quick actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <QuickActionCard
                to="/trainings/new"
                title="Create training"
                description="Guided flow: details → upload → assign"
                icon={BookOpen}
                accent="brand"
              />
              <QuickActionCard
                to="/content-library"
                title="Content library"
                description="Upload, preview, reuse across trainings"
                icon={Library}
                accent="indigo"
              />
              <QuickActionCard
                to="/training-reports"
                title="View reports"
                description="Interactive completion data & exports"
                icon={CheckCircle}
                accent="emerald"
              />
              <QuickActionCard
                to="/users"
                title="Manage people"
                description="Learners, departments, assignments"
                icon={Users}
                accent="amber"
              />
            </div>
          </section>

          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Trainings', value: stats?.totalTrainings ?? 0, color: 'text-slate-900 dark:text-white' },
              { label: 'Active learners', value: stats?.activeLearners ?? 0, color: 'text-slate-900 dark:text-white' },
              { label: 'Completed', value: stats?.completedCount ?? 0, color: 'text-emerald-600' },
              { label: 'In progress', value: inProgress, color: 'text-amber-600' },
            ].map((kpi, i) => (
              <div
                key={kpi.label}
                className="card p-4 text-center transition-transform hover:scale-[1.02] duration-300"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <p className={`text-2xl font-bold font-display ${kpi.color}`}>
                  <AnimatedNumber value={kpi.value} />
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{kpi.label}</p>
              </div>
            ))}
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900 dark:text-white">Learner progress</h2>
                <Link to="/training-reports" className="text-sm text-brand-600 font-medium">Reports</Link>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
                {(data?.recentEnrollments ?? []).slice(0, 8).map((e, i) => (
                  <div
                    key={e.id}
                    className="p-4 flex items-center gap-3 animate-fade-in"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {e.user.fullName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{e.user.fullName}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{e.training.title}</p>
                      <div className="mt-1.5 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full max-w-[140px]">
                        <div
                          className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 rounded-full transition-all duration-700"
                          style={{ width: `${e.progressPercentage ?? 0}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-medium text-slate-500 shrink-0">
                      {Math.round(e.progressPercentage ?? 0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="card p-5">
                <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Completion breakdown</h2>
                <MiniBarChart
                  data={[
                    { label: 'Done', value: stats?.completedCount ?? 0, color: 'bg-gradient-to-t from-emerald-500 to-emerald-400' },
                    { label: 'Active', value: inProgress, color: 'bg-gradient-to-t from-brand-500 to-brand-400' },
                    { label: 'Overdue', value: stats?.overdueCount ?? 0, color: 'bg-gradient-to-t from-rose-500 to-rose-400' },
                  ]}
                />
              </div>

              <div className="card p-5">
                <h2 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand-500" /> Recent activity
                </h2>
                <div className="relative pl-6 space-y-4 max-h-48 overflow-y-auto">
                  <div className="timeline-line" />
                  {(data?.recentActivity ?? []).slice(0, 6).map((a, i) => (
                    <div key={a.id} className="relative animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                      <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-brand-500 ring-4 ring-brand-500/20" />
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{a.action}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {a.userEmail} · {new Date(a.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
                  {(data?.recentActivity ?? []).length === 0 && (
                    <p className="text-sm text-slate-400">Activity will appear as learners train.</p>
                  )}
                </div>
              </div>

              <Link to="/trainings" className="btn-secondary w-full touch-target">
                <UserPlus className="w-4 h-4" /> Manage trainings
              </Link>
            </div>
          </div>
        </div>

        <Link to="/trainings/new" className="fab lg:hidden" aria-label="Create training">
          <Plus className="w-6 h-6" />
        </Link>
      </PageTransition>
    </QueryState>
  );
}
