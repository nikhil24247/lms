import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Eye } from 'lucide-react';
import { api, getApiError } from '../lib/api';

export function ReminderTemplateEditor() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [daysBeforeDue, setDaysBeforeDue] = useState('3');
  const [isOverdue, setIsOverdue] = useState(false);
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: templates } = useQuery({
    queryKey: ['reminder-templates'],
    queryFn: async () => (await api.get('/api/v1/admin/notifications/templates')).data.data,
  });

  const { data: parameters } = useQuery({
    queryKey: ['template-parameters'],
    queryFn: async () => (await api.get('/api/v1/admin/notifications/templates/parameters')).data.data,
  });

  const resetForm = () => {
    setEditing(null);
    setName('');
    setSubject('');
    setBodyHtml('');
    setDaysBeforeDue('3');
    setIsOverdue(false);
    setError(null);
  };

  const save = async () => {
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        subject: subject.trim(),
        bodyHtml: bodyHtml.trim(),
        daysBeforeDue: isOverdue ? undefined : parseInt(daysBeforeDue, 10),
        isOverdue,
        isDefault: true,
      };
      if (editing) {
        await api.patch(`/api/v1/admin/notifications/templates/${editing}`, payload);
      } else {
        await api.post('/api/v1/admin/notifications/templates', payload);
      }
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['reminder-templates'] });
    } catch (e) {
      setError(getApiError(e));
    }
  };

  const startEdit = (t: {
    id: string;
    name: string;
    subject: string;
    bodyHtml: string;
    daysBeforeDue: number | null;
    isOverdue: boolean;
  }) => {
    setEditing(t.id);
    setName(t.name);
    setSubject(t.subject);
    setBodyHtml(t.bodyHtml);
    setDaysBeforeDue(t.daysBeforeDue != null ? String(t.daysBeforeDue) : '0');
    setIsOverdue(t.isOverdue);
  };

  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-4">Reminder Templates</h2>
      <p className="text-sm text-slate-500 mb-4">Editable templates with parameters used when scheduling training reminders.</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {(parameters ?? []).map((p: { key: string; label: string }) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setBodyHtml((b) => `${b}${p.key}`)}
            className="text-xs px-2 py-1 bg-slate-100 rounded-lg hover:bg-brand-50"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 mb-4">
        <input className="input" placeholder="Template name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" placeholder="Subject (use {{training}}, {{learner}}, etc.)" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <textarea className="input min-h-[100px]" placeholder="Body HTML/text" value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} />
        <div className="flex flex-wrap gap-3 items-center">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isOverdue} onChange={(e) => setIsOverdue(e.target.checked)} />
            Overdue reminder
          </label>
          {!isOverdue && (
            <input type="number" className="input w-32" value={daysBeforeDue} onChange={(e) => setDaysBeforeDue(e.target.value)} placeholder="Days before due" />
          )}
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex gap-2">
          <button onClick={save} disabled={!name || !subject} className="btn-primary">{editing ? 'Update' : 'Create'} Template</button>
          {editing && <button onClick={resetForm} className="btn-secondary">Cancel</button>}
        </div>
      </div>

      <div className="space-y-2">
        {(templates ?? []).map((t: {
          id: string;
          name: string;
          subject: string;
          daysBeforeDue: number | null;
          isOverdue: boolean;
        }) => (
          <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-sm">
            <div>
              <p className="font-medium">{t.name}</p>
              <p className="text-xs text-slate-500">{t.subject}</p>
              <p className="text-xs text-slate-400">{t.isOverdue ? 'Overdue' : `${t.daysBeforeDue ?? 0} days before due`}</p>
            </div>
            <div className="flex gap-1">
              <button onClick={async () => setPreview((await api.get(`/api/v1/admin/notifications/templates/${t.id}/preview`)).data.data)} className="p-2 text-slate-500 hover:bg-white rounded-lg">
                <Eye className="w-4 h-4" />
              </button>
              <button onClick={() => startEdit(t as never)} className="p-2 text-slate-500 hover:bg-white rounded-lg">
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={async () => {
                  await api.delete(`/api/v1/admin/notifications/templates/${t.id}`);
                  queryClient.invalidateQueries({ queryKey: ['reminder-templates'] });
                }}
                className="p-2 text-rose-500 hover:bg-white rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {preview && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50" onClick={() => setPreview(null)}>
          <div className="card p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold mb-2">Template Preview</h3>
            <p className="text-sm font-medium mb-2">Subject: {preview.subject}</p>
            <pre className="text-sm whitespace-pre-wrap bg-slate-50 p-4 rounded-xl">{preview.body}</pre>
            <button onClick={() => setPreview(null)} className="btn-secondary mt-4 w-full">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
