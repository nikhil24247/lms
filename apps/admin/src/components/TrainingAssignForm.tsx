import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, getApiError } from '../lib/api';

export interface TrainingAssignValues {
  targetType: string;
  targetId: string;
  targetGroupId: string;
  dueDate: string;
  isMandatory: boolean;
  autoRemindDaysBefore: number;
}

interface Props {
  onSubmit: (values: TrainingAssignValues) => Promise<void>;
  submitLabel?: string;
  disabled?: boolean;
}

export function TrainingAssignForm({ onSubmit, submitLabel = 'Assign Training', disabled }: Props) {
  const [targetType, setTargetType] = useState('ALL');
  const [targetId, setTargetId] = useState('');
  const [targetGroupId, setTargetGroupId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isMandatory, setIsMandatory] = useState(true);
  const [autoRemind, setAutoRemind] = useState('3');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/api/v1/admin/users')).data.data,
    enabled: targetType === 'USER',
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => (await api.get('/api/v1/admin/departments')).data.data,
    enabled: targetType === 'DEPARTMENT',
  });

  const { data: groups } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => (await api.get('/api/v1/admin/groups')).data.data,
    enabled: targetType === 'GROUP',
  });

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        targetType,
        targetId,
        targetGroupId,
        dueDate,
        isMandatory,
        autoRemindDaysBefore: autoRemind ? +autoRemind : 3,
      });
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Assign to</label>
        <select className="input" value={targetType} onChange={(e) => setTargetType(e.target.value)}>
          <option value="ALL">Entire organization</option>
          <option value="USER">Individual learner</option>
          <option value="DEPARTMENT">Department</option>
          <option value="GROUP">Team / group</option>
        </select>
      </div>

      {targetType === 'USER' && (
        <select className="input" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
          <option value="">Select learner...</option>
          {users
            ?.filter((u: { role: string }) => u.role === 'LEARNER')
            .map((u: { id: string; fullName: string }) => (
              <option key={u.id} value={u.id}>{u.fullName}</option>
            ))}
        </select>
      )}

      {targetType === 'DEPARTMENT' && (
        <select className="input" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
          <option value="">Select department...</option>
          {departments?.map((d: { id: string; name: string }) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      )}

      {targetType === 'GROUP' && (
        <select className="input" value={targetGroupId} onChange={(e) => setTargetGroupId(e.target.value)}>
          <option value="">Select group...</option>
          {groups?.map((g: { id: string; name: string }) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Due date (optional)</label>
        <input type="date" className="input touch-target" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="text-sm text-slate-500 font-medium touch-target py-1"
      >
        {showAdvanced ? 'Hide reminders & options' : 'Reminders & options'}
      </button>

      {showAdvanced && (
        <>
          <label className="flex items-center gap-2 text-sm touch-target py-1">
            <input type="checkbox" checked={isMandatory} onChange={(e) => setIsMandatory(e.target.checked)} />
            Mandatory training
          </label>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reminder (days before due)</label>
            <input type="number" className="input" value={autoRemind} onChange={(e) => setAutoRemind(e.target.value)} min={0} />
          </div>
        </>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || submitting}
        className="btn-primary w-full py-3 touch-target"
      >
        {submitting ? 'Working...' : submitLabel}
      </button>
    </div>
  );
}
