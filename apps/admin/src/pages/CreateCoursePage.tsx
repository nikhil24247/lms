import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Upload, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { PageHeader } from '../components/ui';
import { StepWizard } from '../components/flow/StepWizard';
import { TrainingAssignForm, TrainingAssignValues } from '../components/TrainingAssignForm';
import { api, getApiError } from '../lib/api';

type CourseType = 'VIDEO_QUIZ' | 'SCORM';

const STEPS = [
  { id: 1, label: 'Details' },
  { id: 2, label: 'Content' },
  { id: 3, label: 'Assign' },
];

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

function toDateInput(value?: string | null) {
  if (!value) return '';
  return value.slice(0, 10);
}

export function CreateCoursePage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const initialStep = searchParams.get('step') === 'assign' ? 3 : 1;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(initialStep);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<CourseType>('VIDEO_QUIZ');
  const [estimatedMinutes, setEstimatedMinutes] = useState(15);
  const [difficulty, setDifficulty] = useState('');
  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState('en');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [tagsRaw, setTagsRaw] = useState('');
  const [version, setVersion] = useState('1.0');
  const [expiresAt, setExpiresAt] = useState('');
  const [passingScore, setPassingScore] = useState(70);
  const [certificateEnabled, setCertificateEnabled] = useState(true);
  const [certificateType, setCertificateType] = useState<'COMPLETION_PASS' | 'PARTICIPATION'>('COMPLETION_PASS');
  const [certificationValidDays, setCertificationValidDays] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [trainingId, setTrainingId] = useState(id ?? '');
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formLoaded, setFormLoaded] = useState(!id);
  const [selectedVideoId, setSelectedVideoId] = useState('');
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [selectedScormId, setSelectedScormId] = useState('');
  const [applying, setApplying] = useState(false);

  const videoRef = useRef<HTMLInputElement>(null);
  const scormRef = useRef<HTMLInputElement>(null);
  const quizRef = useRef<HTMLInputElement>(null);

  const activeId = trainingId || id;

  const { data: course } = useQuery({
    queryKey: ['course', activeId],
    queryFn: async () => (await api.get(`/api/v1/admin/trainings/${activeId}`)).data.data,
    enabled: !!activeId,
  });

  const { data: libraryAssets } = useQuery({
    queryKey: ['content-library'],
    queryFn: async () =>
      (await api.get('/api/v1/admin/content-library')).data.data as Array<{
        id: string;
        title: string;
        type: string;
        hasContent: boolean;
        thumbnailUrl?: string | null;
        estimatedMinutes?: number;
      }>,
    enabled: step === 2,
  });

  const libraryVideos = (libraryAssets ?? []).filter((a) => a.type === 'VIDEO' && a.hasContent);
  const libraryQuizzes = (libraryAssets ?? []).filter((a) => a.type === 'QUIZ' && a.hasContent);
  const libraryScorm = (libraryAssets ?? []).filter((a) => a.type === 'SCORM' && a.hasContent);

  useEffect(() => {
    if (searchParams.get('step') === 'assign' && trainingId) setStep(3);
  }, [searchParams, trainingId]);

  useEffect(() => {
    if (!course || formLoaded) return;
    setTitle(course.title);
    setDescription(course.description ?? '');
    setType(course.type);
    setEstimatedMinutes(course.estimatedMinutes ?? 15);
    setDifficulty(course.difficulty ?? '');
    setCategory(course.category ?? '');
    setLanguage(course.language ?? 'en');
    setThumbnailUrl(course.thumbnailUrl ?? '');
    setTagsRaw((course.tags ?? []).join(', '));
    setVersion(course.version ?? '1.0');
    setExpiresAt(toDateInput(course.expiresAt));
    setPassingScore(course.passingScorePercentage);
    setCertificateEnabled(course.certificateEnabled ?? true);
    setCertificateType(course.certificateType ?? 'COMPLETION_PASS');
    setCertificationValidDays(
      course.certificationValidDays != null ? String(course.certificationValidDays) : '',
    );
    setTrainingId(course.id);
    setFormLoaded(true);
  }, [course, formLoaded]);

  const payload = () => ({
    title: title.trim(),
    description,
    type,
    estimatedMinutes,
    difficulty: difficulty || null,
    category: category.trim() || null,
    language: language.trim() || 'en',
    thumbnailUrl: thumbnailUrl.trim() || null,
    tags: parseTags(tagsRaw),
    version: version.trim() || '1.0',
    expiresAt: expiresAt || null,
    passingScorePercentage: passingScore,
    certificateEnabled,
    certificateType,
    certificationValidDays: certificationValidDays ? Number(certificationValidDays) : null,
    maxRetries: 3,
  });

  const saveTraining = async (): Promise<string> => {
    if (!title.trim()) throw new Error('Training name is required');

    if (!trainingId) {
      const { data } = await api.post('/api/v1/admin/trainings', payload());
      const created = data.data;
      setTrainingId(created.id);
      queryClient.invalidateQueries({ queryKey: ['trainings'] });
      navigate(`/trainings/${created.id}`, { replace: true });
      return created.id;
    }

    await api.patch(`/api/v1/admin/trainings/${trainingId}`, payload());
    queryClient.invalidateQueries({ queryKey: ['course', trainingId] });
    return trainingId;
  };

  const goToStep2 = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await saveTraining();
      setStep(2);
      setStatus(null);
    } catch (e) {
      setStatus(getApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const uploadVideo = async (file: File) => {
    if (!trainingId) return;
    const form = new FormData();
    form.append('file', file);
    setStatus('Uploading video...');
    try {
      await api.post(`/api/v1/admin/trainings/${trainingId}/upload/video`, form);
      setStatus('Video uploaded');
      queryClient.invalidateQueries({ queryKey: ['course', trainingId] });
    } catch (e) {
      setStatus(getApiError(e));
    }
  };

  const uploadScorm = async (file: File) => {
    if (!trainingId) return;
    const form = new FormData();
    form.append('file', file);
    setStatus('Uploading SCORM...');
    try {
      await api.post(`/api/v1/admin/trainings/${trainingId}/upload/scorm`, form);
      setStatus('SCORM package uploaded');
      queryClient.invalidateQueries({ queryKey: ['course', trainingId] });
    } catch (e) {
      setStatus(getApiError(e));
    }
  };

  const importQuiz = async (file: File) => {
    if (!trainingId) return;
    const form = new FormData();
    form.append('file', file);
    try {
      const { data: validation } = await api.post(`/api/v1/admin/trainings/${trainingId}/quiz/validate`, form);
      if (!validation.data.valid) {
        setStatus(validation.data.errors?.join(', ') ?? 'Invalid quiz file');
        return;
      }
      const { data: imported } = await api.post(`/api/v1/admin/trainings/${trainingId}/quiz/import`, form);
      setStatus(`Imported ${imported.data.imported} questions`);
      queryClient.invalidateQueries({ queryKey: ['course', trainingId] });
    } catch (e) {
      setStatus(getApiError(e));
    }
  };

  const applyFromLibrary = async (assetId: string, label: string) => {
    if (!trainingId || !assetId) return;
    setApplying(true);
    setStatus(null);
    try {
      const { data } = await api.post(`/api/v1/admin/content-library/${assetId}/apply/${trainingId}`);
      const asset = (libraryAssets ?? []).find((a) => a.id === assetId);
      if (asset?.thumbnailUrl && !thumbnailUrl.trim()) {
        setThumbnailUrl(asset.thumbnailUrl);
        await api.patch(`/api/v1/admin/trainings/${trainingId}`, {
          thumbnailUrl: asset.thumbnailUrl,
        });
      }
      setStatus(`${label} attached from content library${data.data?.assetTitle ? `: ${data.data.assetTitle}` : ''}`);
      queryClient.invalidateQueries({ queryKey: ['course', trainingId] });
    } catch (e) {
      setStatus(getApiError(e));
    } finally {
      setApplying(false);
    }
  };

  const downloadQuizTemplate = async () => {
    if (!trainingId) return;
    const { data } = await api.get(`/api/v1/admin/trainings/${trainingId}/quiz-template`, { responseType: 'blob' });
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'quiz-template.xlsx';
    link.click();
    URL.revokeObjectURL(url);
  };

  const publishAndAssign = async (values: TrainingAssignValues) => {
    if (!trainingId) return;
    await api.post(`/api/v1/admin/trainings/${trainingId}/publish`);
    await api.post('/api/v1/admin/assignments', {
      trainingId,
      targetType: values.targetType,
      targetId: values.targetType === 'USER' || values.targetType === 'DEPARTMENT' ? values.targetId : undefined,
      targetGroupId: values.targetType === 'GROUP' ? values.targetGroupId : undefined,
      dueDate: values.dueDate || undefined,
      isMandatory: values.isMandatory,
      autoRemindDaysBefore: values.autoRemindDaysBefore,
    });
    queryClient.invalidateQueries({ queryKey: ['trainings'] });
    navigate('/trainings?assigned=1');
  };

  const publishOnly = async () => {
    if (!trainingId) return;
    setSaving(true);
    try {
      await api.post(`/api/v1/admin/trainings/${trainingId}/publish`);
      queryClient.invalidateQueries({ queryKey: ['trainings'] });
      navigate('/trainings');
    } catch (e) {
      setStatus(getApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const contentReady =
    type === 'VIDEO_QUIZ'
      ? !!(course?.videoUrl && (course?.questions?.length ?? 0) > 0)
      : !!course?.scormContentUrl;

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader
        title={trainingId ? 'Edit training' : 'Create training'}
        subtitle="Follow the steps — most admins finish in under 5 minutes"
      />

      <StepWizard
        steps={STEPS}
        currentStep={step}
        canNavigate={!!trainingId}
        onStepClick={(id) => setStep(id)}
      />

      {step === 1 && (
        <div className="card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Security Awareness 2026" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea className="input min-h-[72px]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What will learners learn?" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
            <div className="grid grid-cols-2 gap-3">
              {(['VIDEO_QUIZ', 'SCORM'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={!!trainingId}
                  onClick={() => setType(t)}
                  className={`p-4 rounded-xl border-2 text-left disabled:opacity-60 ${
                    type === t ? 'border-brand-600 bg-brand-50' : 'border-slate-200'
                  }`}
                >
                  <p className="font-semibold">{t === 'VIDEO_QUIZ' ? 'Video + Quiz' : 'SCORM'}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {t === 'VIDEO_QUIZ' ? 'MP4 + quiz questions' : 'SCORM package (.zip)'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Duration (minutes)</label>
              <input type="number" className="input" min={1} value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(+e.target.value || 15)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
              <select className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                {DIFFICULTIES.map((d) => (
                  <option key={d.value || 'none'} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Security" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Language</label>
              <input className="input" value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="en" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Thumbnail URL</label>
              <input className="input" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tags</label>
              <input className="input" value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} placeholder="phishing, awareness (comma-separated)" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Version</label>
              <input className="input" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0" />
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-800">Training settings</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expiry date</label>
                <input type="date" className="input" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Passing score %</label>
                <input type="number" className="input" value={passingScore} onChange={(e) => setPassingScore(+e.target.value)} min={1} max={100} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={certificateEnabled} onChange={(e) => setCertificateEnabled(e.target.checked)} />
              Certificate option (issue certificate on completion)
            </label>
            {certificateEnabled && (
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Certificate type</label>
                  <select className="input" value={certificateType} onChange={(e) => setCertificateType(e.target.value as 'COMPLETION_PASS' | 'PARTICIPATION')}>
                    <option value="COMPLETION_PASS">Completion / Pass</option>
                    <option value="PARTICIPATION">Participation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cert valid (days)</label>
                  <input
                    type="number"
                    className="input"
                    min={1}
                    value={certificationValidDays}
                    onChange={(e) => setCertificationValidDays(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-sm text-brand-600 font-medium touch-target py-1"
          >
            {showAdvanced ? 'Hide notes' : 'Field guide'}
          </button>
          {showAdvanced && (
            <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
              Catalog fields (difficulty, category, language, thumbnail, tags, version) describe the course content.
              Expiry, passing score, and certificate apply to this training delivery.
            </p>
          )}

          <button onClick={goToStep2} disabled={saving || !title.trim()} className="btn-primary w-full py-3 touch-target">
            {saving ? 'Saving...' : 'Continue to Content'} <ChevronRight className="w-4 h-4 inline" />
          </button>
        </div>
      )}

      {step === 2 && trainingId && (
        <div className="card p-6 space-y-4">
          {type === 'VIDEO_QUIZ' && (
            <>
              <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4 space-y-3">
                <div>
                  <h3 className="font-semibold mb-1">Select video from Content Library</h3>
                  <p className="text-xs text-slate-500">Preferred — reuse an uploaded training video instead of uploading again.</p>
                </div>
                <select
                  className="input"
                  value={selectedVideoId}
                  onChange={(e) => setSelectedVideoId(e.target.value)}
                >
                  <option value="">Choose a library video…</option>
                  {libraryVideos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}{a.estimatedMinutes ? ` (${a.estimatedMinutes}m)` : ''}
                    </option>
                  ))}
                </select>
                {libraryVideos.length === 0 && (
                  <p className="text-xs text-amber-700">
                    No ready videos in the library yet.{' '}
                    <a href="/content-library" className="underline font-medium">Add one in Content</a>, or upload below.
                  </p>
                )}
                <button
                  type="button"
                  disabled={!selectedVideoId || applying}
                  onClick={() => applyFromLibrary(selectedVideoId, 'Video')}
                  className="btn-primary w-full"
                >
                  {applying ? 'Attaching…' : 'Use selected video'}
                </button>
                {course?.videoUrl && (
                  <p className="text-sm text-emerald-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Video ready</p>
                )}
              </div>

              <details className="border border-slate-100 rounded-xl p-4">
                <summary className="text-sm font-medium text-slate-700 cursor-pointer">Or upload a new video (MP4)</summary>
                <div className="mt-3">
                  <input ref={videoRef} type="file" accept=".mp4" className="hidden" onChange={(e) => e.target.files?.[0] && uploadVideo(e.target.files[0])} />
                  <button type="button" onClick={() => videoRef.current?.click()} className="btn-secondary w-full">
                    <Upload className="w-4 h-4" /> Choose video file
                  </button>
                </div>
              </details>

              <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4 space-y-3">
                <div>
                  <h3 className="font-semibold mb-1">Select quiz from Content Library</h3>
                  <p className="text-xs text-slate-500">Attach a reusable question bank.</p>
                </div>
                <select
                  className="input"
                  value={selectedQuizId}
                  onChange={(e) => setSelectedQuizId(e.target.value)}
                >
                  <option value="">Choose a library quiz…</option>
                  {libraryQuizzes.map((a) => (
                    <option key={a.id} value={a.id}>{a.title}</option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedQuizId || applying}
                  onClick={() => applyFromLibrary(selectedQuizId, 'Quiz')}
                  className="btn-primary w-full"
                >
                  {applying ? 'Attaching…' : 'Use selected quiz'}
                </button>
                {(course?.questions?.length ?? 0) > 0 && (
                  <p className="text-sm text-emerald-600">{course.questions.length} question(s) loaded</p>
                )}
              </div>

              <details className="border border-slate-100 rounded-xl p-4">
                <summary className="text-sm font-medium text-slate-700 cursor-pointer">Or upload quiz Excel</summary>
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-slate-500">Download the template, fill in questions, then upload.</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={downloadQuizTemplate} className="btn-secondary flex-1">
                      <Download className="w-4 h-4" /> Template
                    </button>
                    <input ref={quizRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && importQuiz(e.target.files[0])} />
                    <button type="button" onClick={() => quizRef.current?.click()} className="btn-secondary flex-1">
                      <Upload className="w-4 h-4" /> Upload quiz
                    </button>
                  </div>
                </div>
              </details>
            </>
          )}

          {type === 'SCORM' && (
            <>
              <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4 space-y-3">
                <div>
                  <h3 className="font-semibold mb-1">Select SCORM from Content Library</h3>
                  <p className="text-xs text-slate-500">Reuse a package already uploaded to the library.</p>
                </div>
                <select
                  className="input"
                  value={selectedScormId}
                  onChange={(e) => setSelectedScormId(e.target.value)}
                >
                  <option value="">Choose a SCORM package…</option>
                  {libraryScorm.map((a) => (
                    <option key={a.id} value={a.id}>{a.title}</option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedScormId || applying}
                  onClick={() => applyFromLibrary(selectedScormId, 'SCORM')}
                  className="btn-primary w-full"
                >
                  {applying ? 'Attaching…' : 'Use selected SCORM'}
                </button>
                {course?.scormContentUrl && (
                  <p className="text-sm text-emerald-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> SCORM ready</p>
                )}
              </div>

              <details className="border border-slate-100 rounded-xl p-4">
                <summary className="text-sm font-medium text-slate-700 cursor-pointer">Or upload a new SCORM zip</summary>
                <div className="mt-3">
                  <input ref={scormRef} type="file" accept=".zip" className="hidden" onChange={(e) => e.target.files?.[0] && uploadScorm(e.target.files[0])} />
                  <button type="button" onClick={() => scormRef.current?.click()} className="btn-secondary w-full">
                    <Upload className="w-4 h-4" /> Choose SCORM zip
                  </button>
                </div>
              </details>
            </>
          )}

          {!contentReady && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg p-3">
              Attach required content from the library (or upload) before publishing.
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button type="button" onClick={() => setStep(3)} className="btn-primary flex-1">
              Continue to Assign <ChevronRight className="w-4 h-4 inline" />
            </button>
          </div>
        </div>
      )}

      {step === 3 && trainingId && (
        <div className="card p-6 space-y-4">
          <p className="text-sm text-slate-600">
            Publish <strong>{title}</strong> and assign it to learners. They will receive notifications based on your org settings.
          </p>
          <TrainingAssignForm
            submitLabel="Publish & Assign"
            onSubmit={publishAndAssign}
          />
          <button type="button" onClick={publishOnly} disabled={saving} className="btn-secondary w-full text-sm">
            Publish only (assign later)
          </button>
          <button type="button" onClick={() => setStep(2)} className="text-sm text-slate-500 hover:text-slate-700">
            ← Back to upload
          </button>
        </div>
      )}

      {status && (
        <p className={`mt-3 text-sm ${status.includes('upload') || status.includes('Imported') || status.includes('ready') ? 'text-emerald-600' : 'text-slate-600'}`}>
          {status}
        </p>
      )}
    </div>
  );
}
