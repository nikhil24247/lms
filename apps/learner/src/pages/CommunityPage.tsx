import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, HelpCircle, Share2, Send } from 'lucide-react';
import { QueryState } from '../components/QueryState';
import { DeleteButton } from '../components/DeleteButton';
import { api, getApiError, getCurrentUser } from '../lib/api';

const tabs = [
  { key: 'FEED', label: 'Knowledge Feed', icon: Share2 },
  { key: 'FORUM', label: 'Forums', icon: MessageSquare },
  { key: 'QA', label: 'Q&A', icon: HelpCircle },
] as const;

export function CommunityPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'FEED' | 'FORUM' | 'QA'>('FEED');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const { data: posts, isLoading, error: loadError } = useQuery({
    queryKey: ['community', tab],
    queryFn: async () => (await api.get('/api/v1/community/posts', { params: { type: tab } })).data.data,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: getCurrentUser,
  });

  const { data: expanded } = useQuery({
    queryKey: ['community-post', expandedId],
    queryFn: async () => (await api.get(`/api/v1/community/posts/${expandedId}`)).data.data,
    enabled: !!expandedId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/api/v1/community/posts', {
        type: tab,
        title: tab !== 'FEED' ? title : undefined,
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', tab] });
      setTitle('');
      setBody('');
      setError(null);
    },
    onError: (err) => setError(getApiError(err)),
  });

  const replyMutation = useMutation({
    mutationFn: (postId: string) => api.post(`/api/v1/community/posts/${postId}/replies`, { body: replyText }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-post', expandedId] });
      queryClient.invalidateQueries({ queryKey: ['community', tab] });
      setReplyText('');
    },
  });

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Community</h1>
      <p className="text-sm text-slate-500 mb-6">Discuss lessons, ask questions, share knowledge</p>

      <div className="flex gap-2 mb-6">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setExpandedId(null); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${
              tab === key ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      <div className="card p-4 mb-6">
        {tab !== 'FEED' && (
          <input className="input mb-2" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        )}
        <textarea
          className="input min-h-[80px] mb-2"
          placeholder={tab === 'QA' ? 'Ask a question...' : 'Share your thoughts...'}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        {error && <p className="text-sm text-rose-600 mb-2">{error}</p>}
        <button
          onClick={() => createMutation.mutate()}
          disabled={!body.trim() || createMutation.isPending}
          className="btn-primary text-sm"
        >
          <Send className="w-4 h-4" /> Post
        </button>
      </div>

      <QueryState isLoading={isLoading} error={loadError}>
        <div className="space-y-3">
          {(posts ?? []).map((p: {
            id: string;
            userId: string;
            title: string | null;
            body: string;
            isPinned: boolean;
            createdAt: string;
            user: { id: string; fullName: string; department: { name: string } | null };
            training: { title: string } | null;
            _count: { replies: number };
          }) => (
            <div key={p.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {p.isPinned && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full mr-2">Pinned</span>}
                  {p.title && <h3 className="font-semibold text-slate-900">{p.title}</h3>}
                  <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{p.body}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    {p.user.fullName} · {p.user.department?.name ?? '—'} · {new Date(p.createdAt).toLocaleString()}
                    {p.training && ` · ${p.training.title}`}
                  </p>
                </div>
                {currentUser?.id === p.userId && (
                  <DeleteButton
                    confirmMessage="Delete your post?"
                    onDelete={async () => {
                      await api.delete(`/api/v1/community/posts/${p.id}`);
                      queryClient.invalidateQueries({ queryKey: ['community', tab] });
                      if (expandedId === p.id) setExpandedId(null);
                    }}
                  />
                )}
              </div>
              <button
                onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                className="text-xs text-indigo-600 mt-2"
              >
                {p._count.replies} repl{p._count.replies === 1 ? 'y' : 'ies'}
              </button>
              {expandedId === p.id && expanded && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                  {expanded.replies?.map((r: { id: string; userId: string; body: string; createdAt: string; user: { fullName: string } }) => (
                    <div key={r.id} className="flex items-start justify-between gap-2 p-2 bg-slate-50 rounded-lg text-sm">
                      <div>
                        <p>{r.body}</p>
                        <p className="text-xs text-slate-400 mt-1">{r.user.fullName} · {new Date(r.createdAt).toLocaleString()}</p>
                      </div>
                      {currentUser?.id === r.userId && (
                        <DeleteButton
                          confirmMessage="Delete your reply?"
                          onDelete={async () => {
                            await api.delete(`/api/v1/community/replies/${r.id}`);
                            queryClient.invalidateQueries({ queryKey: ['community-post', expandedId] });
                            queryClient.invalidateQueries({ queryKey: ['community', tab] });
                          }}
                        />
                      )}
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      className="input flex-1 text-sm"
                      placeholder="Write a reply..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                    />
                    <button
                      onClick={() => replyMutation.mutate(p.id)}
                      disabled={!replyText.trim()}
                      className="btn-secondary text-sm"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {(!posts || posts.length === 0) && (
            <p className="text-center text-slate-400 p-8">No posts yet. Start the conversation!</p>
          )}
        </div>
      </QueryState>
    </div>
  );
}
