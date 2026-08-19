import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Info } from 'lucide-react';
import { QueryState } from '../components/QueryState';
import { api } from '../lib/api';

type View = 'department' | 'organization' | 'departments';

interface Entry {
  rank: number;
  userId: string;
  fullName: string;
  email: string;
  department: string;
  learningPoints: number;
  isCurrentUser?: boolean;
}

interface DeptRank {
  rank: number;
  department: string;
  userCount: number;
  totalLearningPoints: number;
  isCurrentUserDepartment?: boolean;
}

interface LeaderboardData {
  view: View;
  lowestRank: number;
  me: Entry | null;
  nearbyEntries: Entry[];
  entries: Entry[];
  departmentRankings: DeptRank[];
}

function rankBadge(rank: number) {
  if (rank === 1) return <span className="inline-flex items-center gap-1 font-bold text-amber-600">🥇 #{rank}</span>;
  if (rank === 2) return <span className="inline-flex items-center gap-1 font-bold text-slate-500">🥈 #{rank}</span>;
  if (rank === 3) return <span className="inline-flex items-center gap-1 font-bold text-amber-700">🥉 #{rank}</span>;
  return <span className="font-semibold text-slate-500">#{rank}</span>;
}

export function LeaderboardPage() {
  const [view, setView] = useState<View>('organization');

  const { data, isLoading, error } = useQuery({
    queryKey: ['learner-leaderboard', view],
    queryFn: async () =>
      (await api.get('/api/v1/leaderboard', {
        params: { view, sortBy: 'learningPoints' },
      })).data.data as LeaderboardData,
  });

  const views: { id: View; label: string }[] = [
    { id: 'department', label: 'Department' },
    { id: 'organization', label: 'Organization' },
    { id: 'departments', label: 'All Departments' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 pb-24 md:pb-8">
      <div className="flex items-start gap-2 mb-1">
        <h1 className="text-2xl font-bold text-slate-900">Leaderboard</h1>
        <span title="Ranked by total learning points earned from completed training.">
          <Info className="w-4 h-4 text-slate-400 mt-2" />
        </span>
      </div>
      <p className="text-sm text-slate-500 mb-4">Ranked by total points. Your standing is always shown.</p>

      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {views.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setView(v.id)}
            className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              view === v.id ? 'bg-sky-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <QueryState isLoading={isLoading} error={error}>
        {data?.me && (
          <div className="rounded-xl border-2 border-sky-200 bg-sky-50 p-4 mb-4 flex items-center gap-4">
            <div className="text-2xl font-bold text-sky-700">{rankBadge(data.me.rank)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide">Your standing</p>
              <p className="font-semibold text-slate-900 truncate">{data.me.email}</p>
              <p className="text-xs text-slate-500">{data.me.department}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold text-slate-900">{data.me.learningPoints}</p>
              <p className="text-[10px] uppercase text-slate-400">Total points</p>
              <p className="text-xs text-slate-400 mt-0.5">of {data.lowestRank}</p>
            </div>
          </div>
        )}

        {view !== 'departments' && data && data.nearbyEntries.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-slate-500 mb-2">Near you (±3)</h2>
            <PointsTable rows={data.nearbyEntries} lowestRank={data.lowestRank} />
          </section>
        )}

        {view === 'departments' ? (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-600">
                  <th className="p-3 font-semibold">Rank</th>
                  <th className="p-3 font-semibold">Department</th>
                  <th className="p-3 font-semibold">Users</th>
                  <th className="p-3 font-semibold text-right">Total points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.departmentRankings ?? []).map((d) => (
                  <tr
                    key={`${d.department}-${d.rank}`}
                    className={d.isCurrentUserDepartment ? 'bg-sky-50' : ''}
                  >
                    <td className="p-3">{rankBadge(d.rank)}</td>
                    <td className="p-3 font-medium">
                      {d.department}
                      {d.isCurrentUserDepartment && (
                        <span className="ml-2 text-[10px] uppercase text-sky-700 font-bold">Yours</span>
                      )}
                    </td>
                    <td className="p-3">{d.userCount}</td>
                    <td className="p-3 text-right font-bold">{d.totalLearningPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-3 py-2 text-xs text-slate-400 border-t">
              Lowest department rank: #{data?.departmentRankings?.length ?? 0}
            </p>
          </div>
        ) : (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-slate-500">
                {view === 'department' ? 'Department rankings' : 'Organization rankings'}
              </h2>
              {data && data.lowestRank > 0 && (
                <span className="text-xs text-slate-400">Lowest rank #{data.lowestRank}</span>
              )}
            </div>
            <PointsTable rows={data?.entries ?? []} lowestRank={data?.lowestRank ?? 0} />
            {(!data?.entries || data.entries.length === 0) && (
              <p className="text-center text-slate-400 p-8">Leaderboard not available</p>
            )}
          </section>
        )}
      </QueryState>
    </div>
  );
}

function PointsTable({ rows, lowestRank }: { rows: Entry[]; lowestRank: number }) {
  if (rows.length === 0) return null;
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-slate-600">
            <th className="p-3 font-semibold w-20">Rank</th>
            <th className="p-3 font-semibold">Email</th>
            <th className="p-3 font-semibold">Department</th>
            <th className="p-3 font-semibold text-right">Total points</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((e) => (
            <tr key={e.userId} className={e.isCurrentUser ? 'bg-sky-50' : 'hover:bg-slate-50'}>
              <td className="p-3">{rankBadge(e.rank)}</td>
              <td className="p-3">
                <span className="font-medium text-slate-900">{e.email}</span>
                {e.isCurrentUser && (
                  <span className="ml-2 text-[10px] uppercase text-sky-700 font-bold">You</span>
                )}
              </td>
              <td className="p-3 text-slate-600">{e.department}</td>
              <td className="p-3 text-right font-bold text-slate-900">{e.learningPoints}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {lowestRank > 0 && (
        <p className="px-3 py-2 text-xs text-slate-400 border-t">Lowest rank #{lowestRank}</p>
      )}
    </div>
  );
}
