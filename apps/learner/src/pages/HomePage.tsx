import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronRight, Video, Package, CheckCircle, Clock, Play } from 'lucide-react';
import { api } from '../lib/api';
import { QueryState } from '../components/QueryState';
import { CircularProgress, PatternOverlay } from '../components/graphics';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { PartnerLogo } from '../components/PartnerLogo';
import { Flame, Trophy } from 'lucide-react';

type Filter = 'ALL' | 'ACTIVE' | 'DONE';

function trainingTypeLabel(type: string) {
  if (type === 'VIDEO_QUIZ') return 'Video + quiz';
  if (type === 'SCORM') return 'SCORM';
  if (type === 'MODULAR') return 'Course';
  return type.replace('_', ' ');
}

function actionLabel(status: string) {
  if (status === 'COMPLETED') return 'Review';
  if (status === 'IN_PROGRESS') return 'Continue';
  return 'Start';
}

export function HomePage() {
  const [filter, setFilter] = useState<Filter>('ALL');

  const { data: assigned, isLoading, error } = useQuery({
    queryKey: ['assigned'],
    queryFn: async () => (await api.get('/api/v1/enrollments/assigned')).data.data,
  });

  const { data: me } = useQuery({
    queryKey: ['learner-me'],
    queryFn: async () => (await api.get('/api/v1/auth/me')).data.data,
  });

  const { data: rankData } = useQuery({
    queryKey: ['learner-leaderboard-home'],
    queryFn: async () =>
      (await api.get('/api/v1/leaderboard', {
        params: { view: 'organization', sortBy: 'learningPoints' },
      })).data.data,
  });

  const items = assigned ?? [];
  const completed = items.filter((e: { status: string }) => e.status === 'COMPLETED').length;
  const total = items.length;
  const completionRate = total > 0 ? (completed / total) * 100 : 0;
  const inProgress = items.filter((e: { status: string }) => e.status === 'IN_PROGRESS').length;

  const filtered = items.filter((e: { status: string }) => {
    if (filter === 'DONE') return e.status === 'COMPLETED';
    if (filter === 'ACTIVE') return e.status !== 'COMPLETED';
    return true;
  });

  const showPartner = me?.company?.showPartnerLogo;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-24 md:pb-8">
      <div className="hero-banner mb-6 mt-4 sm:mt-6 animate-fade-in">
        <PatternOverlay />
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            {showPartner && (
              <div className="mb-3">
                <PartnerLogo src={me?.company?.partnerLogoUrl} className="h-9 w-auto" />
              </div>
            )}
            <h1 className="text-2xl md:text-3xl font-bold font-display">My training</h1>
            <p className="text-white/75 text-sm mt-1">
              <AnimatedNumber value={completed} /> of <AnimatedNumber value={total} /> complete
              {inProgress > 0 && ` · ${inProgress} in progress`}
            </p>
            {rankData?.me && (
              <Link
                to="/leaderboard"
                className="mt-3 mr-2 inline-flex items-center gap-1.5 text-sm bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg border border-white/10 transition-colors"
              >
                <Trophy className="w-4 h-4" /> Rank #{rankData.me.rank} of {rankData.lowestRank}
              </Link>
            )}
            {completed > 0 && (
              <Link
                to="/recognition"
                className="mt-3 inline-flex items-center gap-1.5 text-sm bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg border border-white/10 transition-colors"
              >
                <Flame className="w-4 h-4" /> View rewards & badges
              </Link>
            )}
          </div>
          <CircularProgress value={completionRate} size={100} label="Complete" />
        </div>
      </div>

      {total > 0 && completionRate >= 50 && (
        <div className="card p-4 mb-4 flex items-center gap-3 bg-gradient-to-r from-amber-50 to-brand-50 dark:from-amber-950/30 dark:to-brand-950/20 border-amber-200/60 dark:border-amber-800/40 animate-celebrate">
          <Trophy className="w-8 h-8 text-amber-500 shrink-0" />
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">Great momentum!</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              You&apos;ve completed {Math.round(completionRate)}% of assigned training. Keep your streak going.
            </p>
          </div>
        </div>
      )}

      {rankData?.entries?.length > 0 && (
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900">Leaderboard</h2>
            {rankData.me && (
              <span className="text-xs text-slate-500">
                You: #{rankData.me.rank} · {rankData.me.learningPoints} pts
              </span>
            )}
          </div>
          <ul className="space-y-2">
            {(rankData.entries as {
              rank: number;
              userId: string;
              email: string;
              learningPoints: number;
              isCurrentUser?: boolean;
            }[])
              .slice(0, 6)
              .map((e) => (
                <li
                  key={e.userId}
                  className={`flex items-center gap-2 text-sm ${e.isCurrentUser ? 'font-semibold text-sky-700' : 'text-slate-700'}`}
                >
                  <span className="w-12 shrink-0 text-slate-500">
                    {e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : ''}
                    #{e.rank}
                  </span>
                  <span className="flex-1 truncate">{e.email}</span>
                  <span className="font-bold tabular-nums">{e.learningPoints}</span>
                </li>
              ))}
          </ul>
          <Link
            to="/leaderboard"
            className="mt-3 block w-full text-center text-sm font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg py-2.5"
          >
            Full leaderboard
          </Link>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {(['ALL', 'ACTIVE', 'DONE'] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium touch-target min-h-[40px] transition-colors ${
              filter === f ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            {f === 'ALL' ? 'All' : f === 'ACTIVE' ? 'To do' : 'Done'}
          </button>
        ))}
      </div>

      <QueryState
        isLoading={isLoading}
        error={error}
        empty={!isLoading && !error && items.length === 0}
        emptyTitle="Nothing assigned yet"
        emptyDescription="When your admin assigns training, it will show up here."
      >
        <div className="space-y-3">
          {filtered.map((e: {
            id: string;
            status: string;
            progressPercentage: number;
            dueDate?: string;
            completionPoints?: number | null;
            training: { title: string; type: string; estimatedMinutes: number };
          }, i: number) => {
            const isVideo = e.training.type === 'VIDEO_QUIZ';
            const isOverdue = e.dueDate && new Date(e.dueDate) < new Date() && e.status !== 'COMPLETED';
            const cta = actionLabel(e.status);

            return (
              <Link
                key={e.id}
                to={`/training/${e.id}`}
                className="card p-4 sm:p-5 flex items-center gap-3 sm:gap-4 hover:shadow-lg hover:border-brand-200/60 dark:hover:border-brand-500/30 transition-all group active:scale-[0.99] animate-fade-in"
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              >
                <div
                  className={`relative p-3 sm:p-4 rounded-2xl shrink-0 ${
                    isVideo ? 'bg-gradient-to-br from-brand-50 to-indigo-50' : 'bg-gradient-to-br from-amber-50 to-orange-50'
                  }`}
                >
                  {isVideo ? (
                    <Video className="w-6 h-6 text-brand-600" />
                  ) : (
                    <Package className="w-6 h-6 text-amber-600" />
                  )}
                  {e.status === 'COMPLETED' && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 font-display group-hover:text-brand-700 transition-colors line-clamp-2">
                    {e.training.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>{trainingTypeLabel(e.training.type)}</span>
                    <span>·</span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-3 h-3" /> {e.training.estimatedMinutes} min
                    </span>
                    {e.dueDate && (
                      <>
                        <span>·</span>
                        <span className={isOverdue ? 'text-rose-600 font-medium' : ''}>
                          Due {new Date(e.dueDate).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          e.status === 'COMPLETED'
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                            : 'bg-gradient-to-r from-brand-500 to-indigo-500'
                        }`}
                        style={{ width: `${e.progressPercentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-500 w-8">{Math.round(e.progressPercentage)}%</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600">
                    <Play className="w-4 h-4" />
                    {cta}
                  </span>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-brand-500" />
                </div>
              </Link>
            );
          })}
          {filtered.length === 0 && items.length > 0 && (
            <p className="text-center text-sm text-slate-500 py-8">No trainings in this filter.</p>
          )}
        </div>
      </QueryState>
    </div>
  );
}
