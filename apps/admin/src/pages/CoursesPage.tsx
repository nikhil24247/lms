import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Video, Package, UserPlus, Clock } from 'lucide-react';
import { PageHeader } from '../components/ui';
import { QueryState } from '../components/QueryState';
import { DeleteButton } from '../components/DeleteButton';
import { TrainingAssignedPanel } from '../components/TrainingAssignedPanel';
import { api } from '../lib/api';

interface Training {
  id: string;
  title: string;
  description?: string;
  type: string;
  publishedAt: string | null;
  questionCount: number;
  hasVideo: boolean;
  hasScorm: boolean;
  thumbnailUrl?: string | null;
  difficulty?: string | null;
  category?: string | null;
  estimatedMinutes?: number;
  passingScorePercentage?: number;
  certificateEnabled?: boolean;
  enrollmentCount?: number;
}

function TrainingCardThumb({ t }: { t: Training }) {
  if (t.thumbnailUrl) {
    return (
      <img
        src={t.thumbnailUrl}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
    );
  }
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center ${
        t.type === 'VIDEO_QUIZ' ? 'bg-gradient-to-br from-indigo-100 to-indigo-50' : 'bg-gradient-to-br from-amber-100 to-amber-50'
      }`}
    >
      {t.type === 'VIDEO_QUIZ' ? (
        <Video className="w-10 h-10 text-indigo-500/80" />
      ) : (
        <Package className="w-10 h-10 text-amber-500/80" />
      )}
    </div>
  );
}

export function CoursesPage() {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [manageId, setManageId] = useState<string | null>(null);
  const [manageTitle, setManageTitle] = useState('');
  const justAssigned = params.get('assigned') === '1';

  const { data: trainings, isLoading, error } = useQuery({
    queryKey: ['trainings'],
    queryFn: async () => (await api.get('/api/v1/admin/trainings')).data.data as Training[],
  });

  return (
    <div>
      <PageHeader
        title="Trainings"
        subtitle="Browse courses as cards — pick content from the library, then assign"
        action={
          <Link to="/trainings/new" className="btn-primary touch-target w-full sm:w-auto">
            <Plus className="w-4 h-4" /> Create training
          </Link>
        }
      />

      <p className="text-sm text-slate-500 mb-4">
        Reuse videos from the{' '}
        <Link to="/content-library" className="text-brand-600 font-medium">content library</Link>
        {' '}when creating training. Click <strong>Assign</strong> to see learners, scores, edit, and reports.
      </p>

      {justAssigned && (
        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">
          Training published and assigned successfully.
          <button type="button" className="ml-2 underline" onClick={() => setParams({})}>Dismiss</button>
        </div>
      )}

      {manageId && (
        <TrainingAssignedPanel
          trainingId={manageId}
          trainingTitle={manageTitle}
          onClose={() => setManageId(null)}
        />
      )}

      <QueryState isLoading={isLoading} error={error}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {trainings?.map((t) => (
            <article
              key={t.id}
              className="card overflow-hidden flex flex-col hover:shadow-md transition-shadow border border-slate-100"
            >
              <Link to={`/trainings/${t.id}`} className="relative block aspect-[16/10] bg-slate-100">
                <TrainingCardThumb t={t} />
                <span
                  className={`absolute top-2 left-2 badge text-[10px] ${
                    t.publishedAt ? 'bg-emerald-100 text-emerald-700' : 'bg-white/90 text-slate-600'
                  }`}
                >
                  {t.publishedAt ? 'Live' : 'Draft'}
                </span>
                {t.estimatedMinutes != null && (
                  <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-black/55 text-white text-[11px] px-1.5 py-0.5">
                    <Clock className="w-3 h-3" /> {t.estimatedMinutes}m
                  </span>
                )}
              </Link>

              <div className="p-3.5 flex flex-col flex-1 gap-2">
                <div className="min-w-0">
                  <Link to={`/trainings/${t.id}`} className="font-semibold text-slate-900 text-sm line-clamp-2 hover:text-brand-700">
                    {t.title}
                  </Link>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                    {t.type === 'VIDEO_QUIZ' ? 'Video + Quiz' : t.type === 'SCORM' ? 'SCORM' : t.type}
                    {t.category ? ` · ${t.category}` : ''}
                    {t.enrollmentCount != null ? ` · ${t.enrollmentCount} assigned` : ''}
                  </p>
                </div>

                <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                  {t.publishedAt ? (
                    <button
                      type="button"
                      onClick={() => {
                        setManageId(t.id);
                        setManageTitle(t.title);
                      }}
                      className="btn-primary text-xs px-2.5 py-1.5"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Assign
                    </button>
                  ) : (
                    <Link to={`/trainings/${t.id}?step=assign`} className="btn-secondary text-xs px-2.5 py-1.5">
                      Continue
                    </Link>
                  )}
                  <Link to={`/trainings/${t.id}`} className="btn-secondary text-xs px-2.5 py-1.5">
                    Edit
                  </Link>
                  <DeleteButton
                    confirmMessage={`Delete "${t.title}"?`}
                    onDelete={async () => {
                      await api.delete(`/api/v1/admin/trainings/${t.id}`);
                      queryClient.invalidateQueries({ queryKey: ['trainings'] });
                    }}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>

        {(!trainings || trainings.length === 0) && (
          <div className="card p-12 text-center text-slate-500">
            No trainings yet.{' '}
            <Link to="/trainings/new" className="text-brand-600 underline">Create your first training</Link>
          </div>
        )}
      </QueryState>
    </div>
  );
}
