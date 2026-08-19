import { useState } from 'react';
import { getApiError, login, logout } from '../lib/api';
import { BrandMark, LearningIllustration, PatternOverlay } from '../components/graphics';

export function LoginPage({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('learner@example.com');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await login(email);
      if (result?.user?.role !== 'LEARNER') {
        logout();
        setError('This portal is for learners only. Admins should use /admin/');
        return;
      }
      onSuccess();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-mesh-login">
      <div className="hidden lg:flex flex-1 relative items-center justify-center p-12">
        <PatternOverlay />
        <div className="relative z-10 max-w-md text-white">
          <BrandMark className="w-14 h-14 mb-6" />
          <h1 className="text-4xl font-bold font-display leading-tight">
            Learn. Practice. Stay secure.
          </h1>
          <p className="text-white/70 mt-4 text-lg leading-relaxed">
            Complete your assigned security training, earn badges, and climb the leaderboard.
          </p>
          <div className="mt-8 flex gap-6">
            {[
              { emoji: '🎯', label: 'Interactive courses' },
              { emoji: '🏆', label: 'Earn rewards' },
              { emoji: '📜', label: 'Get certified' },
            ].map((f) => (
              <div key={f.label} className="text-center">
                <span className="text-2xl">{f.emoji}</span>
                <p className="text-xs text-white/60 mt-1">{f.label}</p>
              </div>
            ))}
          </div>
        </div>
        <LearningIllustration className="absolute bottom-0 right-0 w-80 opacity-40" />
      </div>
      <div className="flex-1 flex items-center justify-center p-6 lg:max-w-lg">
        <div className="card p-8 w-full max-w-md bg-white/95 backdrop-blur-xl border-white/60 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <BrandMark className="w-10 h-10" />
            <div>
              <h1 className="text-xl font-bold font-display text-slate-900">Learner Portal</h1>
              <p className="text-sm text-slate-500">Complete your assigned training</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="learner@example.com"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-brand-50/50 rounded-xl text-sm text-slate-600 border border-brand-100 space-y-3">
            <p className="font-medium text-slate-700">Demo accounts (email only, no password)</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setEmail('learner@example.com')}
                className="text-xs px-3 py-1.5 rounded-lg bg-brand-100 text-brand-800 font-medium hover:bg-brand-200 transition-colors"
              >
                Acme Learner
              </button>
              <button
                type="button"
                onClick={() => setEmail('globexlearner@example.com')}
                className="text-xs px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-800 font-medium hover:bg-indigo-200 transition-colors"
              >
                Globex Learner
              </button>
            </div>
            <div className="text-xs text-slate-500 space-y-1">
              <p><strong>Acme Learner:</strong> learner@example.com</p>
              <p><strong>Globex Learner:</strong> globexlearner@example.com</p>
            </div>
            <p className="text-xs text-slate-400 pt-2 border-t border-brand-100">
              <strong>Admin?</strong>{' '}
              <a href="http://localhost:5173/admin/" className="text-brand-600 underline font-medium">Go to Admin Portal</a>
              {' · '}Use admin@example.com or superadmin@example.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
