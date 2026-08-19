import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus } from 'lucide-react';
import { PageHeader } from '../components/ui';
import { QueryState } from '../components/QueryState';
import { api, getApiError } from '../lib/api';

export function CompaniesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: companies, isLoading, error: loadError } = useQuery({
    queryKey: ['platform-companies'],
    queryFn: async () => (await api.get('/api/v1/platform/companies')).data.data,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/api/v1/platform/companies', {
        name,
        slug,
        adminEmail: adminEmail || undefined,
        adminName: adminName || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-companies'] });
      queryClient.invalidateQueries({ queryKey: ['platform-dashboard'] });
      setShowForm(false);
      setName('');
      setSlug('');
      setAdminEmail('');
      setAdminName('');
      setError(null);
    },
    onError: (err) => setError(getApiError(err)),
  });

  return (
    <div>
      <PageHeader
        title="Companies"
        subtitle="Create and manage tenant organizations"
        action={
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> New Company
          </button>
        }
      />

      {showForm && (
        <div className="card p-6 mb-6 space-y-4">
          <h3 className="font-semibold font-display">Create Company</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Company Name</label>
              <input className="input" value={name} onChange={(e) => { setName(e.target.value); setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-')); }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Slug</label>
              <input className="input" value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">First Admin Email (optional)</label>
              <input className="input" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">First Admin Name (optional)</label>
              <input className="input" value={adminName} onChange={(e) => setAdminName(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => createMutation.mutate()} disabled={!name || !slug || createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? 'Creating...' : 'Create Company'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <QueryState isLoading={isLoading} error={loadError}>
        <div className="grid gap-4">
          {(companies ?? []).map((c: {
            id: string;
            name: string;
            slug: string;
            status: string;
            userCount: number;
            courseCount: number;
            maxUsers: number;
          }) => (
            <div key={c.id} className="card p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-violet-50">
                  <Building2 className="w-6 h-6 text-violet-600" />
                </div>
                <div>
                  <h3 className="font-semibold font-display">{c.name}</h3>
                  <p className="text-sm text-slate-500">{c.slug} · {c.userCount}/{c.maxUsers} users · {c.courseCount} courses</p>
                </div>
              </div>
              <span className={`badge ${c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                {c.status}
              </span>
            </div>
          ))}
        </div>
      </QueryState>
    </div>
  );
}
