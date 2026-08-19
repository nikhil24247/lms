import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { api, getApiError } from '../lib/api';

const MODULE_TYPES = [
  { value: 'VIDEO', label: 'Video' },
  { value: 'QUIZ', label: 'Quiz' },
  { value: 'SCORM', label: 'SCORM' },
  { value: 'PDF', label: 'PDF / Policy' },
  { value: 'RICH_TEXT', label: 'Rich Text' },
  { value: 'EXTERNAL', label: 'External Link' },
] as const;

export function CourseModulesPanel({ trainingId }: { trainingId: string }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [moduleType, setModuleType] = useState<string>('VIDEO');
  const [contentAssetId, setContentAssetId] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [richText, setRichText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: modules } = useQuery({
    queryKey: ['training-modules', trainingId],
    queryFn: async () => (await api.get(`/api/v1/admin/trainings/${trainingId}/modules`)).data.data,
    enabled: !!trainingId,
  });

  const { data: assets } = useQuery({
    queryKey: ['content-library'],
    queryFn: async () => (await api.get('/api/v1/admin/content-library')).data.data,
  });

  const addModule = async () => {
    setError(null);
    try {
      await api.post(`/api/v1/admin/trainings/${trainingId}/modules`, {
        title: title.trim(),
        moduleType,
        contentAssetId: contentAssetId || undefined,
        externalUrl: externalUrl || undefined,
        richTextContent: richText || undefined,
      });
      setTitle('');
      setContentAssetId('');
      setExternalUrl('');
      setRichText('');
      queryClient.invalidateQueries({ queryKey: ['training-modules', trainingId] });
    } catch (e) {
      setError(getApiError(e));
    }
  };

  const removeModule = async (moduleId: string) => {
    await api.delete(`/api/v1/admin/trainings/${trainingId}/modules/${moduleId}`);
    queryClient.invalidateQueries({ queryKey: ['training-modules', trainingId] });
  };

  return (
    <div className="card p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-slate-900">Course Modules</h3>
        <p className="text-sm text-slate-500">Build modular courses with video, quiz, SCORM, PDF policy, or external content.</p>
      </div>

      <div className="space-y-2">
        {(modules ?? []).map((m: { id: string; title: string; moduleType: string; order: number; isRequired: boolean }) => (
          <div key={m.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <GripVertical className="w-4 h-4 text-slate-400" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{m.order + 1}. {m.title}</p>
              <p className="text-xs text-slate-500">{m.moduleType}{m.isRequired ? ' · Required' : ''}</p>
            </div>
            <button type="button" onClick={() => removeModule(m.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {(!modules || modules.length === 0) && (
          <p className="text-sm text-slate-400">No modules yet. Add modules below or use the legacy single-video/quiz flow.</p>
        )}
      </div>

      <div className="border-t border-slate-100 pt-4 grid gap-3">
        <input className="input" placeholder="Module title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <select className="input" value={moduleType} onChange={(e) => setModuleType(e.target.value)}>
          {MODULE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        {['VIDEO', 'QUIZ', 'SCORM', 'PDF'].includes(moduleType) && (
          <select className="input" value={contentAssetId} onChange={(e) => setContentAssetId(e.target.value)}>
            <option value="">Select from content library (optional)</option>
            {(assets ?? []).map((a: { id: string; title: string; type: string }) => (
              <option key={a.id} value={a.id}>{a.title} ({a.type})</option>
            ))}
          </select>
        )}
        {moduleType === 'EXTERNAL' && (
          <input className="input" placeholder="External URL (LinkedIn, Udemy, etc.)" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} />
        )}
        {moduleType === 'RICH_TEXT' && (
          <textarea className="input min-h-[80px]" placeholder="Rich text content" value={richText} onChange={(e) => setRichText(e.target.value)} />
        )}
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button type="button" onClick={addModule} disabled={!title.trim()} className="btn-secondary self-start">
          <Plus className="w-4 h-4" /> Add Module
        </button>
      </div>
    </div>
  );
}
