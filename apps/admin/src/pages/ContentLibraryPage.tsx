import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Video,
  Package,
  HelpCircle,
  Gamepad2,
  FileText,
  ExternalLink,
  Upload,
  Download,
  CheckCircle,
  Play,
} from 'lucide-react';
import { PageHeader } from '../components/ui';
import { QueryState } from '../components/QueryState';
import { DeleteButton } from '../components/DeleteButton';
import { ChunkedVideoUploader } from '../components/upload/ChunkedVideoUploader';
import { ContentPreviewModal, canPreview } from '../components/ContentPreviewModal';
import { api, getApiError } from '../lib/api';

type ContentType = 'VIDEO' | 'SCORM' | 'QUIZ' | 'GAME' | 'DOCUMENT' | 'EXTERNAL';

interface ContentSection {
  id: ContentType;
  label: string;
  description: string;
  icon: typeof Video;
}

const SECTIONS: ContentSection[] = [
  { id: 'VIDEO', label: 'Videos', description: 'MP4 training videos', icon: Video },
  { id: 'SCORM', label: 'SCORM Modules', description: 'Interactive SCORM packages', icon: Package },
  { id: 'QUIZ', label: 'Quizzes', description: 'Reusable question banks (Excel)', icon: HelpCircle },
  { id: 'GAME', label: 'Games & Activities', description: 'Gamification and interactive activities', icon: Gamepad2 },
  { id: 'DOCUMENT', label: 'Documents', description: 'PDFs and policy documents', icon: FileText },
  { id: 'EXTERNAL', label: 'External Links', description: 'LinkedIn, Udemy, and other providers', icon: ExternalLink },
];

const EXTERNAL_PROVIDERS = ['LINKEDIN_LEARNING', 'UDEMY', 'COURSERA', 'CUSTOM'] as const;

function pickFile(accept: string, onFile: (file: File) => void) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.onchange = () => {
    const file = input.files?.[0];
    if (file) onFile(file);
    input.remove();
  };
  input.click();
}

interface Asset {
  id: string;
  title: string;
  type: string;
  provider: string;
  category: string | null;
  difficulty: string | null;
  language: string;
  version: string;
  estimatedMinutes: number;
  tags: string[];
  usageCount: number;
  hasContent: boolean;
  externalUrl: string | null;
  questionCount: number;
}

const DIFFICULTIES = [
  { value: '', label: 'Not set' },
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
] as const;

function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

export function ContentLibraryPage() {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<ContentType>('VIDEO');
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [formType, setFormType] = useState<ContentType>('VIDEO');
  const [provider, setProvider] = useState('LINKEDIN_LEARNING');
  const [externalUrl, setExternalUrl] = useState('');
  const [category, setCategory] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(15);
  const [difficulty, setDifficulty] = useState('');
  const [language, setLanguage] = useState('en');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [tagsRaw, setTagsRaw] = useState('');
  const [version, setVersion] = useState('1.0');
  const [error, setError] = useState<string | null>(null);
  const [uploadAssetId, setUploadAssetId] = useState<string | null>(null);
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const { data: assets, isLoading, error: loadError } = useQuery({
    queryKey: ['content-library'],
    queryFn: async () => (await api.get('/api/v1/admin/content-library')).data.data as Asset[],
  });

  const sectionAssets = (assets ?? []).filter((a) => a.type === activeSection);
  const activeMeta = SECTIONS.find((s) => s.id === activeSection)!;

  const openCreateForm = () => {
    setFormType(activeSection);
    setTitle('');
    setDescription('');
    setExternalUrl('');
    setCategory('');
    setEstimatedMinutes(15);
    setDifficulty('');
    setLanguage('en');
    setThumbnailUrl('');
    setTagsRaw('');
    setVersion('1.0');
    setError(null);
    setShowForm(true);
  };

  const createAsset = async () => {
    setError(null);
    try {
      const type = formType;
      await api.post('/api/v1/admin/content-library', {
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        provider: type === 'EXTERNAL' ? provider : 'INTERNAL',
        externalUrl: type === 'EXTERNAL' || type === 'GAME' ? externalUrl : undefined,
        category: category || undefined,
        estimatedMinutes,
        difficulty: difficulty || null,
        language: language.trim() || 'en',
        thumbnailUrl: thumbnailUrl.trim() || null,
        tags: parseTags(tagsRaw),
        version: version.trim() || '1.0',
      });
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['content-library'] });
      setActiveSection(type);
      setStatus(`"${title}" created — upload content below if needed.`);
    } catch (e) {
      setError(getApiError(e));
    }
  };

  const uploadScorm = async (assetId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    setStatus('Uploading SCORM package...');
    try {
      await api.post(`/api/v1/admin/content-library/${assetId}/scorm`, form);
      setStatus('SCORM package uploaded');
      queryClient.invalidateQueries({ queryKey: ['content-library'] });
    } catch (e) {
      setStatus(getApiError(e));
    }
  };

  const uploadQuiz = async (assetId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    setStatus('Importing quiz...');
    try {
      const { data } = await api.post(`/api/v1/admin/content-library/${assetId}/quiz`, form);
      setStatus(`Imported ${data.data.imported} questions`);
      queryClient.invalidateQueries({ queryKey: ['content-library'] });
    } catch (e) {
      setStatus(getApiError(e));
    }
  };

  const uploadDocument = async (assetId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    setStatus('Uploading document...');
    try {
      await api.post(`/api/v1/admin/content-library/${assetId}/document`, form);
      setStatus('Document uploaded');
      queryClient.invalidateQueries({ queryKey: ['content-library'] });
    } catch (e) {
      setStatus(getApiError(e));
    }
  };

  const downloadQuizTemplate = async () => {
    const { data } = await api.get('/api/v1/admin/content-library/quiz-template', { responseType: 'blob' });
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'quiz-template.xlsx';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="Content library"
        subtitle="Upload once, preview with Play, then attach when creating training"
        action={
          <button type="button" onClick={openCreateForm} className="btn-primary">
            <Plus className="w-4 h-4" /> Add {activeMeta.label.replace(/s$/, '')}
          </button>
        }
      />

      <div className="card p-4 mb-6 bg-brand-50/50 border-brand-100">
        <p className="text-sm text-slate-700">
          <strong className="text-slate-900">Guided flow:</strong> pick a section → create item → upload → use{' '}
          <strong>Play</strong> to verify → assign from Trainings.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const count = (assets ?? []).filter((a) => a.type === section.id).length;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => { setActiveSection(section.id); setShowForm(false); }}
              className={`card p-3 text-left transition-all ${
                activeSection === section.id ? 'ring-2 ring-brand-500 bg-brand-50' : 'hover:shadow-md'
              }`}
            >
              <Icon className={`w-5 h-5 mb-2 ${activeSection === section.id ? 'text-brand-600' : 'text-slate-500'}`} />
              <p className="text-sm font-semibold text-slate-900">{section.label}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{count} item{count !== 1 ? 's' : ''}</p>
            </button>
          );
        })}
      </div>

      <div className="card p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">{activeMeta.label}</h2>
          <p className="text-sm text-slate-500">{activeMeta.description}</p>
        </div>
        <select
          className="input sm:max-w-xs"
          value={activeSection}
          onChange={(e) => setActiveSection(e.target.value as ContentType)}
        >
          {SECTIONS.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>

      {showForm && (
        <div className="card p-5 mb-6 space-y-4">
          <h3 className="font-semibold">New content</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Content type</label>
              <select className="input" value={formType} onChange={(e) => setFormType(e.target.value as ContentType)}>
                {SECTIONS.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
            <input className="input sm:col-span-2" placeholder="Title *" value={title} onChange={(e) => setTitle(e.target.value)} />
            <textarea className="input sm:col-span-2 min-h-[60px]" placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
            {(formType === 'EXTERNAL' || formType === 'GAME') && (
              <>
                {formType === 'EXTERNAL' && (
                  <select className="input" value={provider} onChange={(e) => setProvider(e.target.value)}>
                    {EXTERNAL_PROVIDERS.map((p) => (
                      <option key={p} value={p}>{p.replace('_', ' ')}</option>
                    ))}
                  </select>
                )}
                <input
                  className={`input ${formType === 'GAME' ? 'sm:col-span-2' : ''}`}
                  placeholder={formType === 'GAME' ? 'Game / activity URL *' : 'External course URL *'}
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                />
              </>
            )}
            <input type="number" className="input" min={1} placeholder="Duration (minutes)" value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(+e.target.value || 15)} />
            <select className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              {DIFFICULTIES.map((d) => (
                <option key={d.value || 'none'} value={d.value}>{d.label === 'Not set' ? 'Difficulty' : d.label}</option>
              ))}
            </select>
            <input className="input" placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
            <input className="input" placeholder="Language (e.g. en)" value={language} onChange={(e) => setLanguage(e.target.value)} />
            <input className="input sm:col-span-2" placeholder="Thumbnail URL" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} />
            <input className="input" placeholder="Tags (comma-separated)" value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} />
            <input className="input" placeholder="Version" value={version} onChange={(e) => setVersion(e.target.value)} />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={createAsset} disabled={!title.trim()} className="btn-primary">Create</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {status && (
        <p className={`text-sm mb-4 ${status.includes('upload') || status.includes('Imported') || status.includes('created') ? 'text-emerald-600' : 'text-slate-600'}`}>
          {status}
        </p>
      )}

      <QueryState isLoading={isLoading} error={loadError}>
        <div className="grid gap-4">
          {sectionAssets.map((a) => (
            <div key={a.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3 min-w-0">
                  <div className="p-3 rounded-xl bg-brand-50 shrink-0">
                    <activeMeta.icon className="w-5 h-5 text-brand-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold">{a.title}</h3>
                    <p className="text-sm text-slate-500">
                      {a.category || 'Uncategorized'}
                      {a.difficulty ? ` · ${a.difficulty.toLowerCase()}` : ''}
                      {` · ${a.estimatedMinutes} min`}
                      {a.language ? ` · ${a.language}` : ''}
                      {a.version ? ` · v${a.version}` : ''}
                      {a.type === 'QUIZ' && ` · ${a.questionCount} questions`}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      {a.hasContent ? (
                        <><CheckCircle className="w-3 h-3 text-emerald-500" /> Ready</>
                      ) : (
                        'Needs upload'
                      )}
                      {' · '}Used in {a.usageCount} training(s)
                    </p>
                    {a.externalUrl && <p className="text-xs text-indigo-600 truncate mt-1">{a.externalUrl}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  <button
                    type="button"
                    onClick={() => setPreviewAsset(a)}
                    disabled={!canPreview(a)}
                    className="btn-secondary text-sm disabled:opacity-40"
                    title={canPreview(a) ? 'Preview content' : 'Upload content first'}
                  >
                    <Play className="w-4 h-4" /> Play
                  </button>
                  {a.type === 'VIDEO' && (
                    <button type="button" onClick={() => setUploadAssetId(uploadAssetId === a.id ? null : a.id)} className="btn-secondary text-sm">
                      <Upload className="w-4 h-4" /> Video
                    </button>
                  )}
                  {a.type === 'SCORM' && (
                    <button
                      type="button"
                      onClick={() => pickFile('.zip', (file) => uploadScorm(a.id, file))}
                      className="btn-secondary text-sm"
                    >
                      <Upload className="w-4 h-4" /> SCORM
                    </button>
                  )}
                  {a.type === 'QUIZ' && (
                    <>
                      <button type="button" onClick={downloadQuizTemplate} className="btn-secondary text-sm">
                        <Download className="w-4 h-4" /> Template
                      </button>
                      <button
                        type="button"
                        onClick={() => pickFile('.xlsx,.xls', (file) => uploadQuiz(a.id, file))}
                        className="btn-secondary text-sm"
                      >
                        <Upload className="w-4 h-4" /> Quiz
                      </button>
                    </>
                  )}
                  {a.type === 'DOCUMENT' && (
                    <button
                      type="button"
                      onClick={() => pickFile('.pdf,.doc,.docx', (file) => uploadDocument(a.id, file))}
                      className="btn-secondary text-sm"
                    >
                      <Upload className="w-4 h-4" /> File
                    </button>
                  )}
                  <DeleteButton
                    confirmMessage={`Archive "${a.title}"?`}
                    onDelete={async () => {
                      await api.delete(`/api/v1/admin/content-library/${a.id}`);
                      queryClient.invalidateQueries({ queryKey: ['content-library'] });
                    }}
                  />
                </div>
              </div>
              {uploadAssetId === a.id && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <ChunkedVideoUploader
                    contentAssetId={a.id}
                    onComplete={() => {
                      queryClient.invalidateQueries({ queryKey: ['content-library'] });
                      setStatus('Video uploaded successfully');
                    }}
                  />
                </div>
              )}
            </div>
          ))}
          {sectionAssets.length === 0 && (
            <div className="card p-12 text-center text-slate-400">
              <activeMeta.icon className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No {activeMeta.label.toLowerCase()} yet.</p>
              <button type="button" onClick={openCreateForm} className="text-brand-600 underline mt-2 text-sm">
                Add your first {activeMeta.label.replace(/s$/, '').toLowerCase()}
              </button>
            </div>
          )}
        </div>
      </QueryState>

      <ContentPreviewModal
        assetId={previewAsset?.id ?? null}
        assetSummary={previewAsset ?? undefined}
        onClose={() => setPreviewAsset(null)}
      />
    </div>
  );
}
