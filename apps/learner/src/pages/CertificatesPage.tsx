import { useQuery } from '@tanstack/react-query';
import { Award, Download } from 'lucide-react';
import { QueryState } from '../components/QueryState';
import { api } from '../lib/api';

export function CertificatesPage() {
  const { data: certs, isLoading, error } = useQuery({
    queryKey: ['my-certificates'],
    queryFn: async () => (await api.get('/api/v1/certificates/my')).data.data,
  });

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">My Certificates</h1>
      <p className="text-sm text-slate-500 mb-6">Download certificates earned from completed training</p>

      <QueryState isLoading={isLoading} error={error}>
        <div className="space-y-3">
          {(certs ?? []).map((c: {
            id: string;
            certificateNumber: string;
            type: string;
            score: number | null;
            pdfUrl: string | null;
            issuedAt: string;
            training: { title: string };
          }) => (
            <div key={c.id} className="card p-5 flex items-center gap-4">
              <div className="p-3 bg-amber-50 rounded-xl">
                <Award className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">{c.training.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {c.type === 'COMPLETION_PASS' ? 'Completion Certificate' : 'Participation Certificate'}
                  {c.score != null && ` · ${c.score}%`}
                  {' · '}{new Date(c.issuedAt).toLocaleDateString()}
                </p>
                <p className="text-xs text-slate-400">{c.certificateNumber}</p>
              </div>
              {c.pdfUrl && (
                <a href={c.pdfUrl} target="_blank" rel="noreferrer" className="btn-secondary text-sm">
                  <Download className="w-4 h-4" /> PDF
                </a>
              )}
            </div>
          ))}
          {(!certs || certs.length === 0) && (
            <div className="card p-12 text-center text-slate-500">
              <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              Complete training to earn certificates
            </div>
          )}
        </div>
      </QueryState>
    </div>
  );
}
