import { useState } from 'react';
import { FileDropzone } from '../FileDropzone';
import { UploadProgress } from '../UploadProgress';
import { uploadVideoDirect, getApiError } from '../../lib/api';

interface VideoUploadZoneProps {
  moduleId: string;
}

export function VideoUploadZone({ moduleId }: VideoUploadZoneProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!moduleId) {
      setStatus('Please select a module first');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.mp4')) {
      setStatus('Only .mp4 files are supported');
      return;
    }

    setUploading(true);
    setProgress(0);
    setStatus(null);

    try {
      // Simulate progress while uploading through API (avoids MinIO CORS issues)
      setProgress(30);
      const result = await uploadVideoDirect(moduleId, file);
      setProgress(100);
      setStatus(
        result.success
          ? `Video uploaded successfully`
          : result.message ?? 'Upload completed with warnings',
      );
    } catch (err) {
      setStatus(getApiError(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <FileDropzone
        accept={{ 'video/mp4': ['.mp4'] }}
        onFile={handleFile}
        label="Upload MP4 Video"
      />
      {uploading && <UploadProgress progress={progress} label="Uploading video..." />}
      {status && (
        <p
          className={`mt-4 text-sm ${
            status.includes('success') ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {status}
        </p>
      )}
    </div>
  );
}
