import type { ReactNode } from 'react';

export function PageTransition({ children }: { children: ReactNode }) {
  return <div className="animate-fade-in">{children}</div>;
}

export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-lg ${className}`} />;
}

export function ListPageSkeleton() {
  return (
    <div className="space-y-3 py-2 animate-fade-in">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="card p-5 space-y-3">
          <SkeletonBlock className="h-5 w-1/3" />
          <SkeletonBlock className="h-3 w-full" />
          <SkeletonBlock className="h-2 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <SkeletonBlock className="h-40 rounded-2xl" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonBlock key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <SkeletonBlock className="h-64 rounded-2xl" />
        <SkeletonBlock className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}
