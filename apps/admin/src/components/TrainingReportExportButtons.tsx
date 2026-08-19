import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { downloadTrainingReport, getApiError, type TrainingReportFormat } from '../lib/api';

export function TrainingReportExportButtons({
  trainingId,
  trainingTitle,
  compact = false,
}: {
  trainingId: string;
  trainingTitle: string;
  compact?: boolean;
}) {
  const [exporting, setExporting] = useState<TrainingReportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (format: TrainingReportFormat) => {
    setExporting(format);
    setError(null);
    try {
      await downloadTrainingReport(trainingId, format);
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setExporting(null);
    }
  };

  return (
    <div>
      <div className={`flex ${compact ? 'flex-wrap gap-1' : 'gap-2'}`}>
        {(['csv', 'excel', 'pdf'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => handleExport(f)}
            disabled={!!exporting}
            className={compact ? 'btn-secondary text-xs px-2 py-1.5' : 'btn-secondary text-sm'}
            title={`Download ${trainingTitle} report as ${f.toUpperCase()}`}
          >
            <FileDown className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
            {exporting === f ? '...' : f.toUpperCase()}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
    </div>
  );
}
