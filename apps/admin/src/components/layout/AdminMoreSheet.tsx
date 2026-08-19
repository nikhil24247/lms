import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import { adminMoreNav } from '../../config/navigation';

export function AdminMoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 bg-black/40 z-50 lg:hidden"
        onClick={onClose}
        aria-label="Close menu"
      />
      <div className="fixed inset-x-0 bottom-0 z-50 lg:hidden bg-white rounded-t-2xl border-t border-slate-200 safe-bottom max-h-[70vh] flex flex-col animate-in slide-in-from-bottom">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">More</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 touch-target">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <nav className="p-3 grid grid-cols-2 gap-2 overflow-y-auto">
          {adminMoreNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 p-3 rounded-xl text-sm font-medium touch-target min-h-[48px] ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-50'
                }`
              }
            >
              <item.icon className="w-5 h-5 shrink-0 text-slate-500" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  );
}
