import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, ChevronDown, Globe, Search } from 'lucide-react';
import { useCompanyContext } from '../context/CompanyContext';
import { api } from '../lib/api';

export function CompanySwitcher() {
  const { activeCompany, setActiveCompany, isGlobalView } = useCompanyContext();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: companies } = useQuery({
    queryKey: ['platform-companies'],
    queryFn: async () => (await api.get('/api/v1/platform/companies')).data.data as Array<{
      id: string;
      name: string;
      slug: string;
      status: string;
      userCount: number;
    }>,
  });

  const filtered = (companies ?? []).filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="relative w-full lg:w-auto">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 w-full sm:w-auto min-w-0 sm:min-w-[180px] max-w-full"
      >
        {isGlobalView ? (
          <Globe className="w-4 h-4 text-violet-600" />
        ) : (
          <Building2 className="w-4 h-4 text-brand-600" />
        )}
        <span className="flex-1 text-left truncate">
          {isGlobalView ? 'Global Admin View' : activeCompany?.name ?? 'Select company'}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed left-4 right-4 top-24 z-50 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden max-h-[min(70vh,24rem)] flex flex-col">
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="input pl-9 text-sm"
                  placeholder="Search companies..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              <button
                type="button"
                onClick={() => { setActiveCompany(null); setOpen(false); window.location.href = '/admin/platform'; }}
                className={`w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 ${isGlobalView ? 'bg-violet-50' : ''}`}
              >
                <Globe className="w-4 h-4 text-violet-600" />
                <div>
                  <p className="font-medium text-sm">Global Admin View</p>
                  <p className="text-xs text-slate-500">Platform-wide settings & tenants</p>
                </div>
              </button>
              <div className="border-t border-slate-100 px-4 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Companies</p>
              </div>
              {filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setActiveCompany({ id: c.id, name: c.name, slug: c.slug });
                    setOpen(false);
                    window.location.href = '/admin/';
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 ${
                    activeCompany?.id === c.id ? 'bg-brand-50' : ''
                  }`}
                >
                  <Building2 className="w-4 h-4 text-brand-600" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.userCount} users · {c.status}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
