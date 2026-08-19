import { Check } from 'lucide-react';

export interface WizardStep {
  id: number;
  label: string;
}

export function StepWizard({
  steps,
  currentStep,
  onStepClick,
  canNavigate,
}: {
  steps: WizardStep[];
  currentStep: number;
  onStepClick?: (stepId: number) => void;
  canNavigate?: boolean;
}) {
  const active = steps.find((s) => s.id === currentStep);

  return (
    <div className="mb-6">
      <div className="flex items-center gap-1 sm:gap-2">
        {steps.map((step, index) => {
          const done = currentStep > step.id;
          const isActive = currentStep === step.id;
          const clickable = canNavigate && onStepClick && (done || isActive);

          return (
            <div key={step.id} className="flex items-center flex-1 min-w-0">
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onStepClick?.(step.id)}
                className={`flex items-center gap-2 min-w-0 flex-1 touch-target justify-center sm:justify-start px-2 py-2 rounded-xl text-left transition-colors ${
                  isActive ? 'bg-brand-600 text-white' : done ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-500'
                } ${clickable ? 'hover:opacity-90' : ''}`}
              >
                <span
                  className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                    isActive ? 'bg-white/20' : done ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200'
                  }`}
                >
                  {done ? <Check className="w-3.5 h-3.5" /> : step.id}
                </span>
                <span className="text-xs sm:text-sm font-medium truncate hidden sm:inline">{step.label}</span>
              </button>
              {index < steps.length - 1 && (
                <div className={`h-0.5 w-2 sm:w-4 shrink-0 ${done ? 'bg-brand-400' : 'bg-slate-200'}`} />
              )}
            </div>
          );
        })}
      </div>
      <p className="text-sm text-slate-600 mt-3 font-medium">
        Step {currentStep} of {steps.length}: {active?.label}
      </p>
    </div>
  );
}
