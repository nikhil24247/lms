import { useEffect, useState } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

export interface TourStep {
  id: string;
  title: string;
  body: string;
  /** Optional CSS selector; highlight skipped if missing */
  selector?: string;
}

const STORAGE_KEY = 'lms_users_tour_done';

export function UserAccessTour({
  steps,
  open,
  onClose,
}: {
  steps: TourStep[];
  open: boolean;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (open) setIdx(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const step = steps[idx];
    if (!step?.selector) return;
    const el = document.querySelector(step.selector);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.classList.add('ring-2', 'ring-brand-500', 'ring-offset-2');
    return () => {
      el?.classList.remove('ring-2', 'ring-brand-500', 'ring-offset-2');
    };
  }, [open, idx, steps]);

  if (!open || steps.length === 0) return null;

  const step = steps[idx];
  const last = idx === steps.length - 1;

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none">
      <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={finish} />
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[min(420px,92vw)] pointer-events-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-5">
          <div className="flex justify-between items-start gap-3 mb-2">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-brand-600 font-semibold">
                Take a tour · {idx + 1}/{steps.length}
              </p>
              <h3 className="font-bold text-slate-900">{step.title}</h3>
            </div>
            <button type="button" onClick={finish} className="p-1.5 rounded-lg hover:bg-slate-100" aria-label="Close tour">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-slate-600 mb-4">{step.body}</p>
          <div className="flex justify-between gap-2">
            <button
              type="button"
              className="btn-secondary text-sm"
              disabled={idx === 0}
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            {last ? (
              <button type="button" className="btn-primary text-sm" onClick={finish}>
                Done
              </button>
            ) : (
              <button type="button" className="btn-primary text-sm" onClick={() => setIdx((i) => i + 1)}>
                Next <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function shouldAutoStartUserTour() {
  return localStorage.getItem(STORAGE_KEY) !== '1';
}
