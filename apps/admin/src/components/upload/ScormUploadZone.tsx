import { useState } from 'react';
import { FileDropzone } from '../FileDropzone';
import { uploadScorm } from '../../lib/api';
import type { ScormUnpackResult } from '@lms/shared';

interface ScormUploadZoneProps {
  moduleId: string;
}

export function ScormUploadZone({ moduleId }: ScormUploadZoneProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScormUnpackResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!moduleId) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const response = await uploadScorm(moduleId, file);
      setResult(response.data as ScormUnpackResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SCORM upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <FileDropzone
        accept={{ 'application/zip': ['.zip'] }}
        onFile={handleFile}
        label="Upload SCORM Package (.zip)"
      />
      {loading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
          Processing SCORM package...
        </div>
      )}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {result && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-sm">
          <p className="font-medium text-green-800">SCORM package processed</p>
          <p className="text-green-700 mt-1">Version: {result.scormVersion}</p>
          <p className="text-green-700">Entry point: {result.scormEntryPointHtml}</p>
        </div>
      )}
    </div>
  );
}
