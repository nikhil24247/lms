import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, Play, FileQuestion, FileText, BookOpen, CheckCircle, ArrowLeft } from 'lucide-react';
import { getCourse, getEnrollmentProgress } from '../lib/api';

const icons: Record<string, typeof Play> = {
  VIDEO_MP4: Play,
  QUIZ_EXCEL: FileQuestion,
  DOCUMENT_PDF: FileText,
  PDF_POLICY: FileText,
  RICH_TEXT: BookOpen,
  SCORM_ZIP: BookOpen,
};

export function CoursePage() {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();

  const { data: progress } = useQuery({
    queryKey: ['progress', enrollmentId],
    queryFn: () => getEnrollmentProgress(enrollmentId!),
    enabled: !!enrollmentId,
  });

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', progress?.courseId],
    queryFn: () => getCourse(progress!.courseId),
    enabled: !!progress?.courseId,
  });

  if (isLoading || !course || !progress) {
    return <div className="p-6 text-slate-500">Loading course...</div>;
  }

  const completedSet = new Set(progress.completedModuleIds);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </Link>

      <div className="bg-indigo-600 rounded-2xl p-6 text-white mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider">
              {progress.status.replace('_', ' ')}
            </p>
            <h1 className="text-2xl font-bold mt-1">{course.title}</h1>
            <p className="text-indigo-100 mt-2 text-sm">{course.description}</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full border-4 border-white/30 flex items-center justify-center">
              <span className="text-lg font-bold">{progress.progressPercentage}%</span>
            </div>
          </div>
        </div>
        <div className="mt-4 h-2 bg-white/20 rounded-full">
          <div
            className="h-full bg-white rounded-full transition-all"
            style={{ width: `${progress.progressPercentage}%` }}
          />
        </div>
        <p className="text-indigo-200 text-xs mt-2">
          {progress.completedModuleIds.length} of {progress.modules.length} modules completed
        </p>
      </div>

      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
        Modules
      </h2>

      <div className="space-y-3">
        {course.modules.map((module, idx) => {
          const Icon = icons[module.contentType] ?? BookOpen;
          const isDone = completedSet.has(module.id);
          const hasContent =
            !!module.contentUrl ||
            module.contentType === 'QUIZ_EXCEL' ||
            module.contentType === 'RICH_TEXT';

          return (
            <Link
              key={module.id}
              to={`/training/${enrollmentId}/module/${module.id}`}
              className={`card p-4 flex items-center gap-4 hover:shadow-md transition-shadow ${
                isDone ? 'border-emerald-200 bg-emerald-50/30' : ''
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-50 text-indigo-600'
              }`}>
                {isDone ? <CheckCircle className="w-5 h-5" /> : idx + 1}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">{module.title}</p>
                <p className="text-xs text-slate-400">{module.contentType.replace(/_/g, ' ')}</p>
                {!hasContent && (
                  <p className="text-xs text-amber-600 mt-0.5">Content not uploaded yet</p>
                )}
              </div>
              <Icon className="w-5 h-5 text-indigo-500" />
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </Link>
          );
        })}
      </div>

      {progress.status === 'COMPLETED' && (
        <div className="mt-6 card p-6 text-center bg-emerald-50 border-emerald-200">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
          <h3 className="text-lg font-bold text-emerald-900">Course Completed!</h3>
          <p className="text-emerald-700 text-sm mt-1">Great job — this training is marked complete.</p>
        </div>
      )}
    </div>
  );
}
