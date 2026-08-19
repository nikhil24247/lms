import { useQuery } from '@tanstack/react-query';
import { Award, Star, Flame, Trophy } from 'lucide-react';
import { PageHeader, StatCard } from '../components/ui';
import { QueryState } from '../components/QueryState';
import { api } from '../lib/api';

export function RecognitionAdminPage() {
  const { data: stats } = useQuery({
    queryKey: ['recognition-stats'],
    queryFn: async () => (await api.get('/api/v1/admin/recognition/stats')).data.data,
  });

  const { data: badges, isLoading, error } = useQuery({
    queryKey: ['badges'],
    queryFn: async () => (await api.get('/api/v1/admin/recognition/badges')).data.data,
  });

  const criteriaLabels: Record<string, string> = {
    COURSE_COMPLETION: 'First course completed',
    MILESTONE: 'Completion milestone',
    STREAK: 'Learning streak',
    TOP_PERFORMER: 'High quiz score',
    CUSTOM: 'Custom',
  };

  return (
    <div>
      <PageHeader
        title="Badges & Recognition"
        subtitle="Points, badges, streaks, and learner rewards"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Badges Awarded" value={stats?.totalBadgesAwarded ?? 0} icon={Award} color="amber" />
        <StatCard label="Active Badges" value={stats?.badgeCount ?? 0} icon={Trophy} color="indigo" />
        <StatCard label="Total Points" value={stats?.totalPoints ?? 0} icon={Star} color="emerald" />
        <StatCard label="Active Learners" value={stats?.activeLearners ?? 0} icon={Flame} color="indigo" />
      </div>

      <div className="card p-6 mb-6">
        <h2 className="font-semibold mb-2">How rewards work</h2>
        <ul className="text-sm text-slate-600 space-y-1 list-disc ml-4">
          <li><strong>10 points</strong> awarded per course completion</li>
          <li><strong>Badges</strong> auto-awarded when learners hit milestones, streaks, or high scores</li>
          <li><strong>Streaks</strong> track consecutive days of learning activity</li>
          <li><strong>Certificates</strong> issued automatically as PDF on completion (see Certificates page)</li>
        </ul>
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-semibold">Badge Catalog</h2>
        </div>
        <QueryState isLoading={isLoading} error={error}>
          <div className="divide-y divide-slate-100">
            {(badges ?? []).map((b: {
              id: string;
              code: string;
              name: string;
              description: string;
              criteria: string;
              threshold: number | null;
              points: number;
              isActive: boolean;
            }) => (
              <div key={b.id} className="p-5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{b.name}</p>
                  <p className="text-sm text-slate-500">{b.description}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {criteriaLabels[b.criteria] ?? b.criteria}
                    {b.threshold != null && ` · threshold: ${b.threshold}`}
                    {' · '}+{b.points} pts
                  </p>
                </div>
                <span className={`badge text-xs ${b.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {b.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        </QueryState>
      </div>
    </div>
  );
}
