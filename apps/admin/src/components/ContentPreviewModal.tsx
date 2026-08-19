import { useQuery } from '@tanstack/react-query';
import { X, ExternalLink, CheckCircle } from 'lucide-react';
import { api, getApiError } from '../lib/api';

interface ContentQuestion {
  id: string;
  questionText: string;
  questionType: string;
  points: number;
  options: { id: string; optionText: string; isCorrect: boolean }[];
}

interface ContentAssetDetail {
  id: string;
  title: string;
  description: string;
  type: string;
  provider: string;
  videoUrl: string | null;
  scormContentUrl: string | null;
  scormEntryPoint: string | null;
  fileUrl: string | null;
  mimeType: string | null;
  externalUrl: string | null;
  questions: ContentQuestion[];
}

function scormLaunchUrl(base: string | null, entry: string | null) {
  if (!base) return '';
  const normalized = base.endsWith('/') ? base : `${base}/`;
  const entryPath = entry?.replace(/^\//, '') || 'index.html';
  return `${normalized}${entryPath}`;
}

function QuizPreview({ questions }: { questions: ContentQuestion[] }) {
  if (questions.length === 0) {
    return <p className="text-sm text-amber-600">No questions imported yet.</p>;
  }

  return (
    <div className="space-y-4">
      {questions.map((q, i) => (
        <div key={q.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
          <p className="text-xs text-slate-400 mb-1">
            Question {i + 1} · {q.points} pt{q.points !== 1 ? 's' : ''}
          </p>
          <p className="font-medium text-slate-900 mb-3">{q.questionText}</p>
          <div className="space-y-2">
            {q.options.map((opt) => (
              <div
                key={opt.id}
                className={`p-3 rounded-lg border text-sm ${
                  opt.isCorrect
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  {opt.isCorrect && <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />}
                  {opt.optionText}
                  {opt.isCorrect && <span className="text-xs text-emerald-600 ml-auto">Correct</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PreviewBody({ asset }: { asset: ContentAssetDetail }) {
  switch (asset.type) {
    case 'VIDEO':
      return asset.videoUrl ? (
        <video src={asset.videoUrl} controls autoPlay className="w-full rounded-xl bg-black max-h-[60vh]" />
      ) : (
        <p className="text-sm text-amber-600">Video not uploaded yet.</p>
      );

    case 'SCORM': {
      const src = scormLaunchUrl(asset.scormContentUrl, asset.scormEntryPoint);
      return src ? (
        <iframe src={src} className="w-full h-[60vh] rounded-xl border border-slate-200" title={asset.title} />
      ) : (
        <p className="text-sm text-amber-600">SCORM package not uploaded yet.</p>
      );
    }

    case 'QUIZ':
      return <QuizPreview questions={asset.questions} />;

    case 'DOCUMENT':
      return asset.fileUrl ? (
        asset.mimeType?.includes('pdf') || asset.fileUrl.toLowerCase().endsWith('.pdf') ? (
          <iframe src={asset.fileUrl} className="w-full h-[60vh] rounded-xl border border-slate-200" title={asset.title} />
        ) : (
          <div className="text-center py-8 space-y-3">
            <p className="text-sm text-slate-600">Preview not available for this file type.</p>
            <a href={asset.fileUrl} target="_blank" rel="noreferrer" className="btn-primary inline-flex">
              <ExternalLink className="w-4 h-4" /> Open document
            </a>
          </div>
        )
      ) : (
        <p className="text-sm text-amber-600">Document not uploaded yet.</p>
      );

    case 'GAME':
    case 'EXTERNAL':
      return asset.externalUrl ? (
        <div className="space-y-4">
          <iframe
            src={asset.externalUrl}
            className="w-full h-[60vh] rounded-xl border border-slate-200"
            title={asset.title}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
          <a href={asset.externalUrl} target="_blank" rel="noreferrer" className="btn-secondary inline-flex text-sm">
            <ExternalLink className="w-4 h-4" /> Open in new tab
          </a>
        </div>
      ) : (
        <p className="text-sm text-amber-600">URL not set yet.</p>
      );

    default:
      return <p className="text-sm text-slate-500">Preview not available for this content type.</p>;
  }
}

function canPreview(asset: { type: string; hasContent?: boolean; questionCount?: number }) {
  if (asset.type === 'QUIZ') return (asset.questionCount ?? 0) > 0;
  return !!asset.hasContent;
}

export function ContentPreviewModal({
  assetId,
  assetSummary,
  onClose,
}: {
  assetId: string | null;
  assetSummary?: { title: string; type: string; hasContent: boolean; questionCount: number };
  onClose: () => void;
}) {
  const { data: asset, isLoading, error } = useQuery({
    queryKey: ['content-library', assetId],
    queryFn: async () =>
      (await api.get(`/api/v1/admin/content-library/${assetId}`)).data.data as ContentAssetDetail,
    enabled: !!assetId,
  });

  if (!assetId) return null;

  const title = asset?.title ?? assetSummary?.title ?? 'Content preview';

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-100">
          <div className="min-w-0">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Preview</p>
            <h3 className="font-semibold text-slate-900 truncate">{title}</h3>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {isLoading && <p className="text-sm text-slate-500">Loading preview...</p>}
          {error && <p className="text-sm text-rose-600">{getApiError(error)}</p>}
          {asset && <PreviewBody asset={asset} />}
        </div>
      </div>
    </div>
  );
}

export { canPreview };
