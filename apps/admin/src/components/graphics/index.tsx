export function CircularProgress({
  value,
  size = 120,
  strokeWidth = 10,
  label,
  sublabel,
  className = '',
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-white/20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-white transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-bold font-display text-white">{Math.round(value)}%</span>
        {label && <span className="text-[10px] text-white/70 uppercase tracking-wide mt-0.5">{label}</span>}
        {sublabel && <span className="text-[9px] text-white/50">{sublabel}</span>}
      </div>
    </div>
  );
}

export function MiniBarChart({
  data,
  className = '',
}: {
  data: { label: string; value: number; color: string }[];
  className?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={`flex items-end gap-2 h-24 ${className}`}>
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex items-end justify-center h-16">
            <div
              className={`w-full max-w-[32px] rounded-t-lg transition-all duration-500 ${d.color}`}
              style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? '8px' : '0' }}
            />
          </div>
          <span className="text-[10px] text-slate-500 text-center leading-tight">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function PatternOverlay({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <svg className="absolute -right-8 -top-8 w-64 h-64 opacity-20" viewBox="0 0 200 200">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="white" />
          </pattern>
        </defs>
        <rect width="200" height="200" fill="url(#grid)" />
      </svg>
      <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute top-1/2 right-1/4 w-32 h-32 rounded-full bg-violet-400/20 blur-3xl" />
    </div>
  );
}

export function LearningIllustration({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 300" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="60" y="80" width="280" height="180" rx="16" fill="white" fillOpacity="0.1" stroke="white" strokeOpacity="0.2" />
      <rect x="80" y="100" width="120" height="8" rx="4" fill="white" fillOpacity="0.6" />
      <rect x="80" y="120" width="200" height="6" rx="3" fill="white" fillOpacity="0.3" />
      <rect x="80" y="136" width="180" height="6" rx="3" fill="white" fillOpacity="0.3" />
      <rect x="80" y="160" width="240" height="80" rx="8" fill="white" fillOpacity="0.15" />
      <circle cx="200" cy="200" r="24" fill="white" fillOpacity="0.9" />
      <path d="M192 200 L198 206 L212 192" stroke="#0d9488" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="320" cy="60" r="40" fill="white" fillOpacity="0.15" />
      <path d="M310 60 L318 68 L332 52" stroke="white" strokeOpacity="0.8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="30" y="200" width="50" height="50" rx="12" fill="white" fillOpacity="0.1" transform="rotate(-12 55 225)" />
      <circle cx="350" cy="220" r="30" fill="white" fillOpacity="0.08" />
    </svg>
  );
}

export function EmptyIllustration({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" className={className} fill="none">
      <rect x="40" y="30" width="120" height="90" rx="12" fill="#f0fdfa" stroke="#99f6e4" strokeWidth="2" />
      <rect x="55" y="50" width="60" height="6" rx="3" fill="#5eead4" />
      <rect x="55" y="64" width="90" height="4" rx="2" fill="#ccfbf1" />
      <rect x="55" y="74" width="80" height="4" rx="2" fill="#ccfbf1" />
      <rect x="55" y="90" width="90" height="20" rx="6" fill="#ccfbf1" />
      <circle cx="100" cy="100" r="8" fill="#14b8a6" fillOpacity="0.3" />
      <path d="M96 100 L99 103 L106 96" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" />
      <circle cx="160" cy="40" r="20" fill="#ede9fe" />
      <path d="M153 40 L158 45 L168 33" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 shadow-glow ${className}`}>
      <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
