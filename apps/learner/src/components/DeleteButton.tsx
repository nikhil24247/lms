import { useState } from 'react';
import { Trash2 } from 'lucide-react';

export function DeleteButton({
  onDelete,
  label = 'Delete',
  confirmMessage = 'Are you sure you want to delete this? This cannot be undone.',
  className = '',
  size = 'sm',
}: {
  onDelete: () => void | Promise<void>;
  label?: string;
  confirmMessage?: string;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(confirmMessage)) return;
    setLoading(true);
    try {
      await onDelete();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      title={label}
      className={`inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50 ${
        size === 'sm' ? 'p-1.5 text-xs' : 'px-3 py-1.5 text-sm'
      } ${className}`}
    >
      <Trash2 className="w-4 h-4" />
      {size === 'md' && (loading ? 'Deleting...' : label)}
    </button>
  );
}
