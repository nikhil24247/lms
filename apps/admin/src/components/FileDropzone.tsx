import { useCallback } from 'react';
import { useDropzone, type DropzoneOptions } from 'react-dropzone';
import { Upload } from 'lucide-react';

interface FileDropzoneProps {
  accept: Record<string, string[]>;
  onFile: (file: File) => void;
  label: string;
}

export function FileDropzone({ accept, onFile, label }: FileDropzoneProps) {
  const onDrop = useCallback<NonNullable<DropzoneOptions['onDrop']>>(
    (files) => {
      if (files[0]) onFile(files[0]);
    },
    [onFile],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
        isDragActive
          ? 'border-indigo-500 bg-indigo-50'
          : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
      }`}
    >
      <input {...getInputProps()} />
      <div className="p-3 bg-slate-100 rounded-xl w-fit mx-auto mb-3">
        <Upload className="w-6 h-6 text-slate-400" />
      </div>
      <p className="font-medium text-slate-700">{label}</p>
      <p className="text-sm text-slate-400 mt-1">Drag & drop or click to browse</p>
    </div>
  );
}
