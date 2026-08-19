import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { LogOut, Trophy, Award, Star, Users, Home, User } from 'lucide-react';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { TrainingPlayerPage } from './pages/TrainingPlayerPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { CertificatesPage } from './pages/CertificatesPage';
import { RecognitionPage } from './pages/RecognitionPage';
import { CommunityPage } from './pages/CommunityPage';
import { ProfilePage } from './pages/ProfilePage';
import { BrandMark } from './components/graphics';
import { LearnerMobileNav } from './components/LearnerMobileNav';
import { LightModeOnly } from './context/LightModeOnly';
import { api, logout } from './lib/api';

const desktopNav = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/recognition', label: 'Rewards', icon: Star },
  { to: '/community', label: 'Community', icon: Users },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/certificates', label: 'Certificates', icon: Award },
  { to: '/profile', label: 'Profile', icon: User },
];

function LearnerLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const isPlayer = location.pathname.startsWith('/training/');

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-slate-50 bg-mesh-learner">
      {!isPlayer && (
        <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <NavLink to="/" className="flex items-center gap-2.5 min-w-0">
              <BrandMark className="w-9 h-9 shrink-0" />
              <div className="min-w-0">
                <span className="font-bold font-display text-slate-900 block truncate">My training</span>
                <p className="text-[10px] text-slate-400 -mt-0.5">ProPhish LMS</p>
              </div>
            </NavLink>
            <nav className="hidden md:flex items-center gap-1">
              {desktopNav.slice(1).map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span>{label}</span>
                </NavLink>
              ))}
              <button
                onClick={() => { logout(); window.location.reload(); }}
                className="ml-2 p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </nav>
            <div className="flex items-center gap-1 shrink-0 md:hidden">
              <button
                onClick={() => { logout(); window.location.reload(); }}
                className="md:hidden p-2 text-slate-400 hover:text-rose-500 rounded-lg shrink-0 touch-target"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>
      )}

      {children}
      {!isPlayer && <LearnerMobileNav />}
    </div>
  );
}

function LoginGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('lms_learner_token');
    if (!token) {
      setChecking(false);
      setReady(false);
      return;
    }
    api
      .get('/api/v1/auth/me')
      .then(() => setReady(true))
      .catch(() => {
        logout();
        setReady(false);
      })
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">
        Checking session…
      </div>
    );
  }
  if (!ready) return <LoginPage onSuccess={() => setReady(true)} />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LightModeOnly>
        <LoginGate>
          <BrowserRouter basename="/app">
            <LearnerLayout>
              <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/training/:enrollmentId" element={<TrainingPlayerPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/recognition" element={<RecognitionPage />} />
              <Route path="/community" element={<CommunityPage />} />
              <Route path="/certificates" element={<CertificatesPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Routes>
          </LearnerLayout>
        </BrowserRouter>
      </LoginGate>
      </LightModeOnly>
    </QueryClientProvider>
  );
}
