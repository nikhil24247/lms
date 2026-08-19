import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export function QuickActionCard({
  to,
  title,
  description,
  icon: Icon,
  accent = 'brand',
}: {
  to: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent?: 'brand' | 'amber' | 'emerald' | 'indigo';
}) {
  const gradients = {
    brand: 'from-brand-500 to-teal-600',
    amber: 'from-amber-500 to-orange-600',
    emerald: 'from-emerald-500 to-teal-600',
    indigo: 'from-indigo-500 to-violet-600',
  };

  return (
    <Link
      to={to}
      className="card-hover p-4 sm:p-5 flex items-center gap-4 touch-target min-h-[72px] active:scale-[0.98] transition-transform"
    >
      <div className={`p-3 rounded-xl text-white shadow-sm bg-gradient-to-br shrink-0 ${gradients[accent]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 font-display">{title}</p>
        <p className="text-sm text-slate-500 line-clamp-2">{description}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
    </Link>
  );
}
