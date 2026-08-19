import { getApiError } from '../lib/api';
import { EmptyIllustration } from './graphics';

function ListSkeleton() {
  return (
    <div className="space-y-3 animate-fade-in">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card p-5 space-y-3">
          <div className="skeleton-shimmer h-5 w-1/2 rounded-lg" />
          <div className="skeleton-shimmer h-2 w-full rounded-lg" />
          <div className="skeleton-shimmer h-2 w-1/3 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function QueryState({
  isLoading,
  error,
  empty,
  emptyTitle = 'Nothing here yet',
  emptyDescription = 'Check back later for updates.',
  children,
}: {
  isLoading: boolean;
  error: unknown;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  children: React.ReactNode;
}) {
  if (isLoading) {
    return <ListSkeleton />;
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
