import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import {
  LogOut,
  Shield,
  Building2,
  Globe,
  Menu,
  X,
} from 'lucide-react';
import { DashboardPage } from './pages/DashboardPage';
import { PlatformDashboardPage } from './pages/PlatformDashboardPage';
import { CompaniesPage } from './pages/CompaniesPage';
import { CoursesPage } from './pages/CoursesPage';
import { CreateCoursePage } from './pages/CreateCoursePage';
import { TrainingReportsPage } from './pages/TrainingReportsPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { UsersPage } from './pages/UsersPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ReportsPage } from './pages/ReportsPage';
import { AssessmentsPage } from './pages/AssessmentsPage';
import { RecognitionAdminPage } from './pages/RecognitionAdminPage';
import { CertificatesAdminPage } from './pages/CertificatesAdminPage';
import { CommunityAdminPage } from './pages/CommunityAdminPage';
import { ContentLibraryPage } from './pages/ContentLibraryPage';
import { CompanySwitcher } from './components/CompanySwitcher';
import { AdminMobileNav } from './components/layout/AdminMobileNav';
import { AdminMoreSheet } from './components/layout/AdminMoreSheet';
import { adminPrimaryNav, adminMoreNav } from './config/navigation';
import { CompanyProvider, useCompanyContext } from './context/CompanyContext';
import { LightModeOnly } from './context/LightModeOnly';
import { BrandMark, LearningIllustration, PatternOverlay } from './components/graphics';
import { getApiError, getCurrentUser, login, logout } from './lib/api';

const platformNav = [
  { to: '/platform', icon: Globe, label: 'Platform Dashboard', end: true },
  { to: '/platform/companies', icon: Building2, label: 'Companies', end: false },
];

function TenantGuard({ children }: { children: React.ReactNode }) {
  const { data: user } = useQuery({ queryKey: ['admin-current-user'], queryFn: getCurrentUser });
  const { activeCompanyId } = useCompanyContext();
  const location = useLocation();

  if (user?.role === 'SYSTEM_ADMIN' && !activeCompanyId && !location.pathname.startsWith('/platform')) {
    return <Navigate to="/platform" replace />;
  }

  return <>{children}</>;
}

function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const { data: currentUser } = useQuery({
    queryKey: ['admin-current-user'],
    queryFn: getCurrentUser,
  });
  const { activeCompany, isGlobalView, setActiveCompany } = useCompanyContext();
  const isSuperAdmin = currentUser?.role === 'SYSTEM_ADMIN';

  useEffect(() => {
    setSidebarOpen(false);
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const navLinkClass = (isActive: boolean) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
      isActive ? 'nav-active' : 'nav-inactive'
    }`;

  const sidebarContent = (
    <>
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <BrandMark className="w-10 h-10 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-base font-bold font-display tracking-tight truncate">ProPhish LMS</h1>
            <p className="text-[11px] text-slate-400">
              {isSuperAdmin && isGlobalView ? 'Platform Console' : 'Admin Console'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <nav className="flex-1 p-3 overflow-y-auto space-y-4">
        {isSuperAdmin && isGlobalView && (
          <div>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Platform</p>
            <div className="space-y-0.5">
              {platformNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => navLinkClass(isActive)}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        )}
        {(!isSuperAdmin || !isGlobalView) && (
          <>
            <div>
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Main</p>
              <div className="space-y-0.5">
                {adminPrimaryNav.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => navLinkClass(isActive)}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
            <div>
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">More</p>
              <div className="space-y-0.5">
                {adminMoreNav.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => navLinkClass(isActive)}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          </>
        )}
      </nav>
      <div className="p-3 border-t border-white/5">
        <button
          onClick={() => { logout(); navigate('/'); window.location.reload(); }}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm w-full px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu overlay"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[min(100vw-3rem,18rem)] bg-slate-950 text-white flex flex-col border-r border-white/5 transform transition-transform duration-200 ease-out lg:translate-x-0 lg:static lg:z-auto lg:w-64 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      <main className="flex-1 min-w-0 overflow-auto bg-mesh-admin transition-colors">
        {isSuperAdmin && !isGlobalView && activeCompany && (
          <div className="bg-gradient-to-r from-brand-600 to-indigo-600 text-white px-4 py-3 sm:px-6 text-sm flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-medium flex items-center gap-2">
              <Building2 className="w-4 h-4 shrink-0" /> Viewing as <strong className="truncate">{activeCompany.name}</strong>
            </span>
            <button
              type="button"
              onClick={() => { setActiveCompany(null); navigate('/platform'); }}
              className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full font-medium transition-colors self-start sm:self-auto whitespace-nowrap"
            >
              Return to Global View
            </button>
          </div>
        )}
        {isSuperAdmin && isGlobalView && (
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-3 sm:px-6 text-sm flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-medium flex items-center gap-2">
              <Globe className="w-4 h-4 shrink-0" /> Super Admin — Global View
            </span>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full self-start">SYSTEM_ADMIN</span>
          </div>
        )}
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/80 px-4 py-3 sm:px-6 lg:px-8 sm:py-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-1 text-slate-600 hover:bg-slate-100 rounded-lg shrink-0"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-600 min-w-0 flex-1">
              <div className="p-1.5 rounded-lg bg-emerald-50 shrink-0 hidden xs:flex">
                <Shield className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="font-medium truncate text-xs sm:text-sm">
                {isSuperAdmin && isGlobalView ? 'Platform' : 'Compliance'}
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {isSuperAdmin && (
                <div className="hidden lg:block">
                  <CompanySwitcher />
                </div>
              )}
              {currentUser && (
                <div className="text-right hidden md:block max-w-[140px]">
                  <p className="text-sm font-medium text-slate-800 truncate">{currentUser.fullName}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {isSuperAdmin ? 'Super Admin' : currentUser.company?.name ?? 'Admin'}
                  </p>
                </div>
              )}
            </div>
          </div>
          {isSuperAdmin && (
            <div className="mt-3 lg:hidden">
              <CompanySwitcher />
            </div>
          )}
        </header>
        <div className="p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">{children}</div>
      </main>
      {(!isSuperAdmin || !isGlobalView) && (
        <>
          <AdminMobileNav onMore={() => setMoreOpen(true)} />
          <AdminMoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
        </>
      )}
    </div>
  );
}

function LoginPage({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('superadmin@example.com');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await login(email);
      if (result?.user?.role !== 'LMS_ADMIN' && result?.user?.role !== 'SYSTEM_ADMIN') {
        logout();
        setError('Admin access required. Learners: http://localhost:5174/app/');
        return;
      }
      localStorage.removeItem('lms_company_context');
      localStorage.removeItem('lms_company_context_name');
      localStorage.removeItem('lms_company_context_slug');
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
          <h1 className="text-4xl font-bold font-display leading-tight">Multi-tenant security training platform</h1>
          <p className="text-white/70 mt-4 text-lg leading-relaxed">
            Super Admins manage companies globally. Company Admins manage their organization only.
          </p>
        </div>
        <LearningIllustration className="absolute bottom-0 right-0 w-96 opacity-40" />
      </div>
      <div className="flex-1 flex items-center justify-center p-6 lg:max-w-lg">
        <div className="card-glass p-8 w-full max-w-md">
          <h2 className="text-2xl font-bold font-display">Admin Sign In</h2>
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-rose-600 bg-rose-50 p-3 rounded-xl">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          <div className="mt-6 p-4 bg-brand-50/50 rounded-xl text-sm text-slate-600 border border-brand-100 space-y-3">
            <p className="font-medium text-slate-700">Demo accounts</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setEmail('superadmin@example.com')} className="text-xs px-3 py-1.5 rounded-lg bg-violet-100 text-violet-800 font-medium">Super Admin</button>
              <button type="button" onClick={() => setEmail('admin@example.com')} className="text-xs px-3 py-1.5 rounded-lg bg-brand-100 text-brand-800 font-medium">Acme Admin</button>
              <button type="button" onClick={() => setEmail('globexadmin@example.com')} className="text-xs px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-800 font-medium">Globex Admin</button>
            </div>
            <div className="text-xs text-slate-500 space-y-1">
              <p><strong>Super Admin:</strong> superadmin@example.com → Platform dashboard + company switcher</p>
              <p><strong>Acme Admin:</strong> admin@example.com → Acme Corp only</p>
              <p><strong>Globex Admin:</strong> globexadmin@example.com → Globex Industries only</p>
            </div>
            <p className="text-xs text-slate-400 pt-2 border-t border-brand-100">
              <strong>Learner?</strong>{' '}
              <a href="http://localhost:5174/app/" className="text-brand-600 underline font-medium">Go to Learner Portal</a>
              {' · '}Use learner@example.com or globexlearner@example.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('lms_token');
    if (!token) {
      setChecking(false);
      setReady(false);
      return;
    }
    // Validate token — stale JWT after API restart causes Unauthorized on every page
    getCurrentUser()
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

function AppShell() {
  const { data: user } = useQuery({ queryKey: ['admin-current-user'], queryFn: getCurrentUser });

  return (
    <CompanyProvider
      userRole={user?.role}
      userCompany={user?.company ?? null}
    >
      <Layout>
        <TenantGuard>
          <Routes>
            <Route path="/platform" element={<PlatformDashboardPage />} />
            <Route path="/platform/companies" element={<CompaniesPage />} />
            <Route path="/" element={<DashboardPage />} />
            <Route path="/trainings" element={<CoursesPage />} />
            <Route path="/trainings/new" element={<CreateCoursePage />} />
            <Route path="/trainings/:id" element={<CreateCoursePage />} />
            <Route path="/content-library" element={<ContentLibraryPage />} />
            <Route path="/courses" element={<Navigate to="/trainings" replace />} />
            <Route path="/courses/new" element={<Navigate to="/trainings/new" replace />} />
            <Route path="/courses/:id" element={<CreateCoursePage />} />
            <Route path="/assessments" element={<AssessmentsPage />} />
            <Route path="/training-stats" element={<Navigate to="/training-reports" replace />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/training-reports" element={<TrainingReportsPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/recognition" element={<RecognitionAdminPage />} />
            <Route path="/certificates" element={<CertificatesAdminPage />} />
            <Route path="/community" element={<CommunityAdminPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Routes>
        </TenantGuard>
      </Layout>
    </CompanyProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LightModeOnly>
        <LoginGate>
          <BrowserRouter basename="/admin">
            <AppShell />
          </BrowserRouter>
        </LoginGate>
      </LightModeOnly>
    </QueryClientProvider>
  );
}
