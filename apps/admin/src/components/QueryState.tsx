import { getApiError } from '../lib/api';
import { EmptyIllustration } from './graphics';
import { DashboardSkeleton, ListPageSkeleton } from './ui/motion';

export function QueryState({
  isLoading,
  error,
  empty,
  emptyTitle = 'No data found',
  emptyDescription = 'There is nothing to show here yet.',
  skeleton = 'list',
  children,
}: {
  isLoading: boolean;
  error: unknown;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  skeleton?: 'list' | 'dashboard';
  children: React.ReactNode;
}) {
  if (isLoading) {
    return skeleton === 'dashboard' ? <DashboardSkeleton /> : <ListPageSkeleton />;
  }
  if (error) {
    return (
      <div className="card p-6 text-rose-600 border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/30">
        <p className="font-medium font-display">Failed to load data</p>
        <p className="text-sm mt-1">{getApiError(error)}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
          Make sure the API is running: <code className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border">cd apps/api && npm run dev</code>
        </p>
      </div>
    );
  }
  if (empty) {
    return (
      <div className="card p-10 text-center animate-fade-in">
        <EmptyIllustration className="w-36 h-28 mx-auto mb-4" />
        <p className="font-semibold text-slate-800 dark:text-slate-100 font-display">{emptyTitle}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{emptyDescription}</p>
      </div>
    );
  }
  return <>{children}</>;
}
