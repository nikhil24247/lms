import { NavLink, useLocation } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import { adminPrimaryNav, adminMoreNav } from '../../config/navigation';

function pathMatchesNav(path: string, items: typeof adminPrimaryNav) {
  return items.some((item) =>
    item.end ? path === item.to || (item.to === '/' && path === '') : path === item.to || path.startsWith(`${item.to}/`),
  );
}

export function AdminMobileNav({ onMore }: { onMore: () => void }) {
  const location = useLocation();
  const isMoreActive = pathMatchesNav(location.pathname, adminMoreNav);

  return (
    <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 safe-bottom"
      aria-label="Main navigation"
    >
      <div className="flex items-stretch justify-around max-w-lg mx-auto">
        {adminPrimaryNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 flex-1 py-2 min-h-[56px] text-[10px] font-medium transition-colors ${
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
          onClick={onMore}
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 min-h-[56px] text-[10px] font-medium ${
            isMoreActive ? 'text-brand-600' : 'text-slate-500'
          }`}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}
