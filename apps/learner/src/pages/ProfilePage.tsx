import { useQuery } from '@tanstack/react-query';
import { User, Mail, Building2, MapPin, Award, Briefcase } from 'lucide-react';
import { QueryState } from '../components/QueryState';
import { api, getApiError } from '../lib/api';
import { Link } from 'react-router-dom';

interface Me {
  id: string;
  fullName: string;
  email: string;
  role: string;
  designation?: string | null;
  location?: string | null;
  learningPoints?: number;
  department?: { id: string; name: string } | null;
  company?: { id: string; name: string; showPartnerLogo?: boolean } | null;
}

export function ProfilePage() {
  const { data: me, isLoading, error, isError } = useQuery({
    queryKey: ['learner-me'],
    queryFn: async () => (await api.get('/api/v1/auth/me')).data.data as Me,
    retry: 1,
  });

  const { data: certs } = useQuery({
    queryKey: ['my-certificates'],
    queryFn: async () => (await api.get('/api/v1/certificates/my')).data.data,
    enabled: !!me,
  });

  const { data: rankData } = useQuery({
    queryKey: ['learner-leaderboard-me'],
    queryFn: async () =>
      (await api.get('/api/v1/leaderboard', {
        params: { view: 'organization', sortBy: 'learningPoints' },
      })).data.data,
    enabled: !!me,
  });

  return (
    <div className="max-w-3xl mx-auto p-6 pb-24 md:pb-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Profile</h1>
      <p className="text-sm text-slate-500 mb-6">Your account and learning standing</p>

      <QueryState isLoading={isLoading} error={isError ? error : null}>
        {me && (
          <>
            <div className="card p-6 mb-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center">
                  <User className="w-8 h-8 text-brand-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{me.fullName}</h2>
                  <p className="text-sm text-slate-500">{me.role.replace(/_/g, ' ')}</p>
                </div>
              </div>
              <dl className="space-y-3 text-sm">
                <Row icon={Mail} label="Email" value={me.email} />
                <Row icon={Building2} label="Department" value={me.department?.name ?? '—'} />
                <Row icon={Briefcase} label="Designation" value={me.designation ?? '—'} />
                <Row icon={MapPin} label="Location" value={me.location ?? '—'} />
                <Row icon={Building2} label="Organization" value={me.company?.name ?? '—'} />
                <Row icon={Award} label="Learning points" value={String(me.learningPoints ?? 0)} />
              </dl>
            </div>

            {rankData?.me && (
              <div className="card p-4 mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-brand-700 uppercase">Organization rank</p>
                  <p className="text-2xl font-bold text-slate-900">#{rankData.me.rank}</p>
                  <p className="text-xs text-slate-500">
                    {rankData.me.learningPoints} total points · of {rankData.lowestRank} ranked
                  </p>
                </div>
                <Link to="/leaderboard" className="btn-secondary text-sm">
                  View leaderboard
                </Link>
              </div>
            )}

            <div className="card p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" /> Certificates
              </h3>
              {(certs ?? []).length === 0 ? (
                <p className="text-sm text-slate-500">
                  No certificates yet.{' '}
                  <Link to="/certificates" className="text-brand-600">
                    View certificates
                  </Link>
                </p>
              ) : (
                <ul className="space-y-2">
                  {(certs as { id: string; training: { title: string }; issuedAt: string }[])
                    .slice(0, 5)
                    .map((c) => (
                      <li key={c.id} className="text-sm flex justify-between gap-2">
                        <span className="truncate">{c.training.title}</span>
                        <span className="text-slate-400 shrink-0">
                          {new Date(c.issuedAt).toLocaleDateString()}
                        </span>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </>
        )}
      </QueryState>

      {isError && !isLoading && (
        <p className="text-sm text-rose-600 mt-2">{getApiError(error)}</p>
      )}
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-slate-400 shrink-0" />
      <dt className="w-28 text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}
