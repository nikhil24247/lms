import { useState, useRef } from 'react';
import { UploadProgress } from '../UploadProgress';
import { api } from '../../lib/api';
import { getApiError } from '../../lib/api';
import { MULTIPART_CHUNK_SIZE, ALLOWED_VIDEO_EXTENSIONS } from '@lms/shared';
import { FileDropzone } from '../FileDropzone';

interface Props {
  moduleId?: string;
  contentAssetId?: string;
  trainingId?: string;
  onComplete?: () => void;
}

export function ChunkedVideoUploader({ moduleId, contentAssetId, trainingId, onComplete }: Props) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const abortRef = useRef(false);

  const uploadFile = async (file: File) => {
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!ALLOWED_VIDEO_EXTENSIONS.includes(ext as (typeof ALLOWED_VIDEO_EXTENSIONS)[number])) {
      setStatus(`Allowed formats: ${ALLOWED_VIDEO_EXTENSIONS.join(', ')}`);
      return;
    }

    setUploading(true);
    setProgress(0);
    setStatus(null);
    abortRef.current = false;

    try {
      const { data: initRes } = await api.post('/api/v1/admin/upload/presigned-url', {
        moduleId,
        trainingId,
        contentAssetId,
        fileName: file.name,
        fileSize: file.size,
      });
      const { uploadSessionId, totalParts } = initRes.data;

      const parts: { partNumber: number; etag: string }[] = [];
      const partSize = MULTIPART_CHUNK_SIZE;

      for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
        if (abortRef.current) break;

        const start = (partNumber - 1) * partSize;
        const end = Math.min(start + partSize, file.size);
        const chunk = file.slice(start, end);

        const { data: partRes } = await api.post('/api/v1/admin/upload/presigned-url/part', {
          uploadSessionId,
          partNumber,
        });

        const etag = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', partRes.data.presignedUrl);
          xhr.onload = () => {
            if (xhr.status < 300) {
              const raw = xhr.getResponseHeader('ETag') ?? '';
              resolve(raw.replace(/"/g, ''));
            } else reject(new Error(`Part ${partNumber} failed`));
          };
          xhr.onerror = () => reject(new Error(`Part ${partNumber} network error`));
          xhr.send(chunk);
        });

        parts.push({ partNumber, etag });
        setProgress(Math.round((partNumber / totalParts) * 100));
      }

      await api.post('/api/v1/admin/upload/presigned-url/complete', {
        uploadSessionId,
        parts,
      });

      setStatus('Video uploaded successfully');
      setProgress(100);
      onComplete?.();
    } catch (err) {
      setStatus(getApiError(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <FileDropzone
        accept={{
          'video/mp4': ['.mp4'],
          'video/quicktime': ['.mov'],
          'video/x-msvideo': ['.avi'],
        }}
        onFile={uploadFile}
        label="Upload Video (.mp4, .mov, .avi — up to 1GB)"
      />
      {uploading && <UploadProgress progress={progress} label="Uploading chunks to storage..." />}
      {status && (
        <p className={`mt-3 text-sm ${status.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
          {status}
        </p>
      )}
    </div>
  );
}
