import { NavLink, useLocation } from 'react-router-dom';
import { Home, Star, Award, MoreHorizontal, Trophy, Users, X, User } from 'lucide-react';
import { useState } from 'react';

const primary = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/recognition', label: 'Rewards', icon: Star },
  { to: '/certificates', label: 'Certs', icon: Award },
];

const moreItems = [
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/community', label: 'Community', icon: Users },
  { to: '/profile', label: 'Profile', icon: User },
];

export function LearnerMobileNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const isMoreActive = moreItems.some(
    (item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
  );

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 safe-bottom"
        aria-label="Main"
      >
        <div className="flex items-stretch justify-around max-w-lg mx-auto">
          {primary.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 flex-1 py-2 min-h-[56px] text-[10px] font-medium ${
                  isActive ? 'text-brand-600' : 'text-slate-500'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 min-h-[56px] text-[10px] font-medium ${
              isMoreActive ? 'text-brand-600' : 'text-slate-500'
            }`}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span>More</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <>
          <button type="button" className="fixed inset-0 bg-black/40 z-50 md:hidden" onClick={() => setMoreOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 md:hidden bg-white rounded-t-2xl border-t safe-bottom p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="font-semibold">More</span>
              <button type="button" onClick={() => setMoreOpen(false)} className="p-2 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {moreItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 text-sm font-medium min-h-[48px]"
                >
                  <item.icon className="w-5 h-5 text-slate-500" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
