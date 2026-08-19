import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Info } from 'lucide-react';
import { PageHeader } from '../components/ui';
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
  entries: Entry[];
  nearbyEntries: Entry[];
  departmentRankings: DeptRank[];
}

function rankBadge(rank: number) {
  if (rank === 1) return <span className="font-bold text-amber-600">🥇 #{rank}</span>;
  if (rank === 2) return <span className="font-bold text-slate-500">🥈 #{rank}</span>;
  if (rank === 3) return <span className="font-bold text-amber-700">🥉 #{rank}</span>;
  return <span className="font-semibold text-slate-500">#{rank}</span>;
}

export function LeaderboardPage() {
  const [view, setView] = useState<View>('organization');
  const [trainingId, setTrainingId] = useState('');
  const [departmentId, setDepartmentId] = useState('');

  const params = Object.fromEntries(
    Object.entries({
      view,
      trainingId,
      departmentId,
      sortBy: 'learningPoints',
    }).filter(([, v]) => v),
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ['leaderboard', params],
    queryFn: async () =>
      (await api.get('/api/v1/admin/leaderboard', { params })).data.data as LeaderboardData,
  });

  const { data: trainings } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => (await api.get('/api/v1/admin/trainings')).data.data,
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => (await api.get('/api/v1/admin/departments')).data.data,
  });

  const views: { id: View; label: string }[] = [
    { id: 'department', label: 'Department' },
    { id: 'organization', label: 'Organization' },
    { id: 'departments', label: 'All Departments' },
  ];

  return (
    <div>
      <PageHeader
        title="Leaderboard"
        subtitle="Ranked by total learning points — same metric as the learner dashboard"
      />

      <div className="flex gap-1 mb-4 overflow-x-auto">
        {views.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setView(v.id)}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${
              view === v.id ? 'bg-sky-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="card p-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <select className="input" value={trainingId} onChange={(e) => setTrainingId(e.target.value)}>
          <option value="">All Trainings</option>
          {trainings?.map((t: { id: string; title: string }) => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
        <select
          className="input"
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          disabled={view === 'departments'}
        >
          <option value="">{view === 'department' ? 'My / selected dept' : 'All Departments'}</option>
          {departments?.map((d: { id: string; name: string }) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      <p className="text-sm text-slate-500 mb-3 flex items-center gap-1.5">
        <Info className="w-4 h-4" />
        Only total points are shown (no consolidated score or percentage).
      </p>

      {data?.me && (
        <div className="card p-4 mb-4 border-2 border-sky-200 bg-sky-50/50 flex items-center gap-4">
          <div className="text-xl">{rankBadge(data.me.rank)}</div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-sky-700 uppercase">Your standing</p>
            <p className="font-semibold">{data.me.email}</p>
            <p className="text-xs text-slate-500">{data.me.department}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{data.me.learningPoints}</p>
            <p className="text-[10px] uppercase text-slate-400">Total points</p>
            <p className="text-xs text-slate-400">Lowest #{data.lowestRank}</p>
          </div>
        </div>
      )}

      <QueryState isLoading={isLoading} error={error}>
        {view === 'departments' ? (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="p-4 text-left">Rank</th>
                  <th className="p-4 text-left">Department</th>
                  <th className="p-4 text-left">Users</th>
                  <th className="p-4 text-right">Total points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.departmentRankings ?? []).map((d) => (
                  <tr key={`${d.department}-${d.rank}`} className={d.isCurrentUserDepartment ? 'bg-sky-50' : ''}>
                    <td className="p-4">{rankBadge(d.rank)}</td>
                    <td className="p-4 font-medium">
                      {d.department}
                      {d.isCurrentUserDepartment && (
                        <span className="ml-2 text-[10px] text-sky-700 font-bold uppercase">Yours</span>
                      )}
                    </td>
                    <td className="p-4">{d.userCount}</td>
                    <td className="p-4 text-right font-bold">{d.totalLearningPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-4 py-2 text-xs text-slate-400 border-t">
              Lowest department rank: #{data?.departmentRankings?.length ?? 0}
            </p>
          </div>
        ) : (
          <>
            {data && data.nearbyEntries.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-500 mb-2">Near you (±3)</h3>
                <PointsTable rows={data.nearbyEntries} lowestRank={data.lowestRank} />
              </div>
            )}
            <div className="mb-2 flex justify-between text-xs text-slate-500">
              <span>{view === 'department' ? 'Department rankings' : 'Organization rankings'}</span>
              <span>Lowest rank #{data?.lowestRank ?? 0}</span>
            </div>
            <PointsTable rows={data?.entries ?? []} lowestRank={data?.lowestRank ?? 0} />
            {(!data?.entries || data.entries.length === 0) && (
              <p className="p-8 text-center text-slate-400">No leaderboard data yet</p>
            )}
          </>
        )}
      </QueryState>
    </div>
  );
}

function PointsTable({ rows, lowestRank }: { rows: Entry[]; lowestRank: number }) {
  if (rows.length === 0) return null;
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50">
            <th className="p-4 text-left">Rank</th>
            <th className="p-4 text-left">Email</th>
            <th className="p-4 text-left">Department</th>
            <th className="p-4 text-right">Total points</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((e) => (
            <tr key={e.userId} className={e.isCurrentUser ? 'bg-sky-50' : 'hover:bg-slate-50'}>
              <td className="p-4">{rankBadge(e.rank)}</td>
              <td className="p-4">
                <p className="font-medium text-slate-900">
                  {e.email}
                  {e.isCurrentUser && (
                    <span className="ml-2 text-[10px] uppercase text-sky-700 font-bold">You</span>
                  )}
                </p>
                <p className="text-xs text-slate-400">{e.fullName}</p>
              </td>
              <td className="p-4 text-slate-600">{e.department}</td>
              <td className="p-4 text-right font-bold text-slate-900">{e.learningPoints}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {lowestRank > 0 && (
        <p className="px-4 py-2 text-xs text-slate-400 border-t">Lowest rank #{lowestRank}</p>
      )}
    </div>
  );
}
