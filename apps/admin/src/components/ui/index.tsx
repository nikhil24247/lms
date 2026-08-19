import type { ReactNode } from 'react';
import { EmptyIllustration } from '../graphics';

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6 md:mb-8">
      <div className="min-w-0">
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 w-full sm:w-auto">{action}</div>}
    </div>
  );
}

const gradientMap = {
  indigo: 'stat-gradient-indigo',
  emerald: 'stat-gradient-emerald',
  amber: 'stat-gradient-amber',
  rose: 'stat-gradient-rose',
  brand: 'bg-gradient-to-br from-brand-500 to-brand-700',
};

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  color = 'brand',
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'brand';
}) {
  const gradient = gradientMap[color === 'brand' ? 'brand' : color];

  return (
    <div className="card p-5 relative overflow-hidden group hover:shadow-md transition-shadow">
      <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-brand-50 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex items-start justify-between relative">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1 font-display">{value}</p>
          {trend && <p className="text-xs text-brand-600 mt-1 font-medium">{trend}</p>}
        </div>
        <div className={`p-3 rounded-xl text-white shadow-sm ${gradient}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    NOT_STARTED: 'bg-slate-100 text-slate-600',
    EXPIRED: 'bg-rose-100 text-rose-700',
    PENDING: 'bg-amber-100 text-amber-700',
    PROCESSING: 'bg-blue-100 text-blue-700',
    FAILED: 'bg-rose-100 text-rose-700',
    LEARNER: 'bg-slate-100 text-slate-600',
    LINE_MANAGER: 'bg-purple-100 text-purple-700',
    LMS_ADMIN: 'bg-brand-100 text-brand-700',
    SYSTEM_ADMIN: 'bg-rose-100 text-rose-700',
  };

  return (
    <span className={`badge ${styles[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="card p-12 text-center">
      <EmptyIllustration className="w-40 h-32 mx-auto mb-4" />
      <p className="text-lg font-semibold text-slate-800 font-display">{title}</p>
      <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">{description}</p>
    </div>
  );
}
