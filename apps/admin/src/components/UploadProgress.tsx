interface UploadProgressProps {
  progress: number;
  label?: string;
}

export function UploadProgress({ progress, label }: UploadProgressProps) {
  return (
    <div className="mt-4">
      {label && <p className="text-sm text-slate-600 mb-1">{label}</p>}
      <div className="w-full bg-slate-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 mt-1">{Math.round(progress)}%</p>
    </div>
  );
}
