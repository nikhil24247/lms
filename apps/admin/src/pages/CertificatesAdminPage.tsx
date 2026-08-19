import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, Download } from 'lucide-react';
import { PageHeader } from '../components/ui';
import { QueryState } from '../components/QueryState';
import { DeleteButton } from '../components/DeleteButton';
import { api } from '../lib/api';

type CertRow = {
  id: string;
  certificateNumber: string;
  type: string;
  score: number | null;
  issuedAt: string;
  pdfUrl: string | null;
  user: { fullName: string; email: string; role?: string };
  training: { title: string };
};

export function CertificatesAdminPage() {
  const queryClient = useQueryClient();
  const { data: certs, isLoading, error } = useQuery({
    queryKey: ['admin-certificates'],
    queryFn: async () => (await api.get('/api/v1/admin/certificates')).data.data as CertRow[],
  });

  const { data: myCerts } = useQuery({
    queryKey: ['admin-my-certificates'],
    queryFn: async () => (await api.get('/api/v1/admin/certificates/my')).data.data as CertRow[],
  });

  return (
    <div>
      <PageHeader
        title="Certificates & Recognition"
        subtitle="Automated PDF certificates issued on course completion"
      />

      <div className="card p-5 mb-6 bg-indigo-50 border-indigo-100">
        <p className="text-sm text-indigo-900">
          Certificates are generated automatically as PDF when learners complete training.
          Admins who are also assigned training earn certificates the same way — they appear under{' '}
          <strong>My certificates</strong> below and in the company-wide list.
          Configure certificate type and templates per course under <strong>Trainings → Edit</strong>.
        </p>
      </div>

      {(myCerts?.length ?? 0) > 0 && (
        <div className="card overflow-hidden mb-6">
          <div className="p-5 border-b border-slate-100 flex items-center gap-2">
            <Award className="w-5 h-5 text-brand-600" />
            <h2 className="font-semibold">My certificates</h2>
            <span className="text-xs text-slate-400">(your enrollments as admin)</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="text-left p-4 font-semibold text-slate-600">Training</th>
                <th className="text-left p-4 font-semibold text-slate-600">Type</th>
                <th className="text-left p-4 font-semibold text-slate-600">Score</th>
                <th className="text-left p-4 font-semibold text-slate-600">Issued</th>
                <th className="text-left p-4 font-semibold text-slate-600">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myCerts!.map((c) => (
                <tr key={c.id}>
                  <td className="p-4">{c.training.title}</td>
                  <td className="p-4">
                    <span className="badge bg-amber-100 text-amber-700 text-xs">
                      {c.type === 'COMPLETION_PASS' ? 'Completion' : 'Participation'}
                    </span>
                  </td>
                  <td className="p-4">{c.score != null ? `${c.score.toFixed(0)}%` : '—'}</td>
                  <td className="p-4 text-slate-500">{new Date(c.issuedAt).toLocaleDateString()}</td>
                  <td className="p-4">
                    {c.pdfUrl ? (
                      <a href={c.pdfUrl} target="_blank" rel="noreferrer" className="text-indigo-600 flex items-center gap-1 text-xs">
                        <Download className="w-3 h-3" /> Download
                      </a>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" />
          <h2 className="font-semibold">Issued Certificates</h2>
        </div>
        <QueryState isLoading={isLoading} error={error}>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="text-left p-4 font-semibold text-slate-600">Learner</th>
                <th className="text-left p-4 font-semibold text-slate-600">Role</th>
                <th className="text-left p-4 font-semibold text-slate-600">Training</th>
                <th className="text-left p-4 font-semibold text-slate-600">Type</th>
                <th className="text-left p-4 font-semibold text-slate-600">Score</th>
                <th className="text-left p-4 font-semibold text-slate-600">Issued</th>
                <th className="text-left p-4 font-semibold text-slate-600">PDF</th>
                <th className="text-left p-4 font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(certs ?? []).map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="p-4">
                    <p className="font-medium">{c.user.fullName}</p>
                    <p className="text-xs text-slate-400">{c.user.email}</p>
                  </td>
                  <td className="p-4 text-xs text-slate-500">{c.user.role?.replace(/_/g, ' ') ?? '—'}</td>
                  <td className="p-4 text-slate-600">{c.training.title}</td>
                  <td className="p-4">
                    <span className="badge bg-amber-100 text-amber-700 text-xs">
                      {c.type === 'COMPLETION_PASS' ? 'Completion' : 'Participation'}
                    </span>
                  </td>
                  <td className="p-4">{c.score != null ? `${c.score.toFixed(0)}%` : '—'}</td>
                  <td className="p-4 text-slate-500">{new Date(c.issuedAt).toLocaleDateString()}</td>
                  <td className="p-4">
                    {c.pdfUrl ? (
                      <a href={c.pdfUrl} target="_blank" rel="noreferrer" className="text-indigo-600 flex items-center gap-1 text-xs">
                        <Download className="w-3 h-3" /> Download
                      </a>
                    ) : '—'}
                  </td>
                  <td className="p-4">
                    <DeleteButton
                      confirmMessage={`Revoke certificate for ${c.user.fullName}?`}
                      onDelete={async () => {
                        await api.delete(`/api/v1/admin/certificates/${c.id}`);
                        queryClient.invalidateQueries({ queryKey: ['admin-certificates'] });
                        queryClient.invalidateQueries({ queryKey: ['admin-my-certificates'] });
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!certs || certs.length === 0) && (
            <p className="p-8 text-center text-slate-400">No certificates issued yet</p>
          )}
        </QueryState>
      </div>
    </div>
  );
}
