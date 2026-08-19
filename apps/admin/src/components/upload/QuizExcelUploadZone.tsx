import { useState } from 'react';
import { FileDropzone } from '../FileDropzone';
import { ValidationErrorList } from '../ValidationErrorList';
import { uploadQuizExcel, downloadQuizTemplate } from '../../lib/api';
import type { QuizImportResult } from '@lms/shared';

interface QuizExcelUploadZoneProps {
  moduleId: string;
}

export function QuizExcelUploadZone({ moduleId }: QuizExcelUploadZoneProps) {
  const [result, setResult] = useState<QuizImportResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file: File) => {
    if (!moduleId) return;
    setLoading(true);
    setResult(null);
    try {
      const response = await uploadQuizExcel(moduleId, file);
      setResult(response.data as QuizImportResult);
    } catch {
      setResult({ imported: 0, errors: ['Upload request failed'] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={downloadQuizTemplate}
        className="mb-4 text-sm text-blue-600 hover:underline"
      >
        Download Quiz Template (.xlsx)
      </button>
      <FileDropzone
        accept={{
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
        }}
        onFile={handleFile}
        label="Upload Excel Quiz (.xlsx)"
      />
      {loading && <p className="mt-4 text-sm text-slate-500">Processing...</p>}
      {result && result.imported > 0 && (
        <p className="mt-4 text-sm text-green-600">
          Successfully imported {result.imported} questions
        </p>
      )}
      {result && <ValidationErrorList errors={result.errors} />}
    </div>
  );
}
