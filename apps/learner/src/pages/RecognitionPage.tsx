import { useQuery } from '@tanstack/react-query';
import { Award, Flame, Star, Trophy, Download, Clock, Zap } from 'lucide-react';
import { QueryState } from '../components/QueryState';
import { PatternOverlay } from '../components/graphics';
import { api } from '../lib/api';

function BadgeIcon({ name }: { name: string }) {
  const colors = [
    'from-amber-400 to-orange-500',
    'from-brand-400 to-teal-500',
    'from-violet-400 to-purple-500',
    'from-rose-400 to-pink-500',
  ];
  const idx = name.length % colors.length;
  return (
    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${colors[idx]} flex items-center justify-center shadow-sm shrink-0`}>
      <Award className="w-6 h-6 text-white" />
    </div>
  );
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function RecognitionPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-recognition'],
    queryFn: async () => (await api.get('/api/v1/recognition/my')).data.data,
  });

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="hero-banner mb-8">
        <PatternOverlay />
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-bold font-display">My Recognition</h1>
          <p className="text-white/70 text-sm mt-1">Badges, points, and learning streaks</p>
        </div>
      </div>

      <QueryState isLoading={isLoading} error={error}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { icon: Star, value: data?.learningPoints ?? 0, label: 'Points', gradient: 'from-amber-500 to-orange-500' },
            { icon: Flame, value: data?.currentStreak ?? 0, label: 'Day Streak', gradient: 'from-orange-500 to-rose-500' },
            { icon: Trophy, value: data?.trainingsCompleted ?? 0, label: 'Completed', gradient: 'from-brand-500 to-indigo-500' },
            { icon: Clock, value: data?.avgTimeSpentSec ? formatDuration(data.avgTimeSpentSec) : '—', label: 'Avg Time', gradient: 'from-violet-500 to-purple-500' },
          ].map(({ icon: Icon, value, label, gradient }) => (
            <div key={label} className="card p-5 text-center relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5`} />
              <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${gradient} text-white mb-2`}>
                <Icon className="w-5 h-5 m-2" />
              </div>
              <p className="text-3xl font-bold font-display text-slate-900">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="card p-5 mb-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2 font-display">
            <Award className="w-5 h-5 text-amber-500" /> Badges Earned
          </h2>
          {(data?.badges ?? []).length === 0 ? (
            <p className="text-sm text-slate-400">Complete courses to earn your first badge!</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.badges.map((b: { code: string; name: string; description: string; earnedAt: string }) => (
                <div key={b.code} className="flex items-start gap-3 p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-xl">
                  <BadgeIcon name={b.name} />
                  <div>
                    <p className="font-semibold text-amber-900 font-display">{b.name}</p>
                    <p className="text-xs text-amber-700 mt-0.5">{b.description}</p>
                    <p className="text-[10px] text-amber-600 mt-1">{new Date(b.earnedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5 mb-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2 font-display">
            <Zap className="w-5 h-5 text-brand-500" /> Recent Completions
          </h2>
          {(data?.recentCompletions ?? []).length === 0 ? (
            <p className="text-sm text-slate-400">Complete trainings to earn time-based points and badges.</p>
          ) : (
            <div className="space-y-2">
              {data.recentCompletions.map((c: {
                trainingTitle: string;
                startedAt: string | null;
                completedAt: string | null;
                timeSpentSec: number;
                completionScore: number | null;
                completionPoints: number | null;
              }, i: number) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0 text-sm">
                  <div>
                    <p className="font-medium text-slate-800">{c.trainingTitle}</p>
                    <p className="text-xs text-slate-400">
                      {c.timeSpentSec > 0 ? formatDuration(c.timeSpentSec) : '—'}
                      {c.completionScore != null ? ` · ${Math.round(c.completionScore)}%` : ''}
                    </p>
                  </div>
                  {c.completionPoints != null && (
                    <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-xs">
                      +{c.completionPoints}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-5">
            <h2 className="font-semibold mb-3 font-display">Recent Points</h2>
            <div className="space-y-2">
              {(data?.recentPoints ?? []).map((p: { id: string; amount: number; reason: string; createdAt: string }) => (
                <div key={p.id} className="flex justify-between text-sm py-2 border-b border-slate-50 last:border-0">
                  <span className="text-slate-600">{p.reason}</span>
                  <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-xs">+{p.amount}</span>
                </div>
              ))}
              {(!data?.recentPoints || data.recentPoints.length === 0) && (
                <p className="text-sm text-slate-400">No points activity yet</p>
              )}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold mb-3 font-display">Certificates</h2>
            <div className="space-y-2">
              {(data?.recentCertificates ?? []).map((c: {
                id: string;
                certificateNumber: string;
                pdfUrl: string | null;
                issuedAt: string;
                training: { title: string };
              }) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-brand-50 to-indigo-50 rounded-xl border border-brand-100">
                  <div>
                    <p className="font-medium text-sm text-slate-900">{c.training.title}</p>
                    <p className="text-xs text-slate-400">{c.certificateNumber}</p>
                  </div>
                  {c.pdfUrl && (
                    <a href={c.pdfUrl} target="_blank" rel="noreferrer" className="btn-secondary text-xs py-1.5">
                      <Download className="w-3 h-3" /> PDF
                    </a>
                  )}
                </div>
              ))}
              {(!data?.recentCertificates || data.recentCertificates.length === 0) && (
                <p className="text-sm text-slate-400">Certificates appear here when you complete training</p>
              )}
            </div>
          </div>
        </div>
      </QueryState>
    </div>
  );
}
