import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, HelpCircle, Share2 } from 'lucide-react';
import { PageHeader } from '../components/ui';
import { QueryState } from '../components/QueryState';
import { DeleteButton } from '../components/DeleteButton';
import { api } from '../lib/api';

const tabs = [
  { key: 'FEED', label: 'Knowledge Feed', icon: Share2 },
  { key: 'FORUM', label: 'Forums', icon: MessageSquare },
  { key: 'QA', label: 'Q&A', icon: HelpCircle },
] as const;

export function CommunityAdminPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'FEED' | 'FORUM' | 'QA'>('FEED');

  const { data: posts, isLoading, error } = useQuery({
    queryKey: ['admin-community', tab],
    queryFn: async () => (await api.get('/api/v1/admin/community/posts', { params: { type: tab } })).data.data,
  });

  return (
    <div>
      <PageHeader
        title="Social & Collaborative Learning"
        subtitle="Discussion forums, peer Q&A, and knowledge-sharing feeds"
      />

      <div className="flex gap-2 mb-6">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${
              tab === key ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      <QueryState isLoading={isLoading} error={error}>
        <div className="space-y-3">
          {(posts ?? []).map((p: {
            id: string;
            title: string | null;
            body: string;
            type: string;
            isPinned: boolean;
            createdAt: string;
            user: { fullName: string };
            training: { title: string } | null;
            _count: { replies: number };
          }) => (
            <div key={p.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="badge bg-slate-100 text-slate-600 text-xs">{p.type}</span>
                    {p.isPinned && <span className="badge bg-amber-100 text-amber-700 text-xs">Pinned</span>}
                  </div>
                  {p.title && <h3 className="font-semibold">{p.title}</h3>}
                  <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{p.body}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    {p.user.fullName} · {new Date(p.createdAt).toLocaleString()}
                    {p.training && ` · ${p.training.title}`} · {p._count.replies} replies
                  </p>
                </div>
                <DeleteButton
                  confirmMessage="Delete this post and all its replies?"
                  onDelete={async () => {
                    await api.delete(`/api/v1/admin/community/posts/${p.id}`);
                    queryClient.invalidateQueries({ queryKey: ['admin-community', tab] });
                  }}
                />
              </div>
            </div>
          ))}
          {(!posts || posts.length === 0) && (
            <p className="text-center text-slate-400 p-12 card">No community posts yet</p>
          )}
        </div>
      </QueryState>
    </div>
  );
}
