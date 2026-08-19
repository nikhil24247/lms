import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  Building2,
  Download,
  Network,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Upload,
  UserPlus,
  Users,
  UsersRound,
  Compass,
} from 'lucide-react';
import { PageHeader, StatusBadge } from '../components/ui';
import { QueryState } from '../components/QueryState';
import { DeleteButton } from '../components/DeleteButton';
import { UserAccessTour, shouldAutoStartUserTour, type TourStep } from '../components/UserAccessTour';
import { api, getApiError } from '../lib/api';

type Tab = 'users' | 'org' | 'groups' | 'import' | 'directory';

interface Person {
  id: string;
  fullName: string;
  email: string;
  role: string;
  department: string;
  departmentId: string | null;
  branch: string | null;
  branchId: string | null;
  designation: string | null;
  hrisEmployeeId: string | null;
  location: string | null;
  manager: { id: string; fullName: string; email: string } | null;
  groups: { id: string; name: string }[];
  isActive: boolean;
  archivedAt: string | null;
  enrollmentCount: number;
}

interface Dept {
  id: string;
  name: string;
  code: string;
  _count?: { users: number };
}

interface Branch {
  id: string;
  name: string;
  code: string;
  city: string | null;
  _count?: { users: number };
}

interface GroupRow {
  id: string;
  name: string;
  description: string | null;
  isDynamic: boolean;
  memberCount: number;
  rulesJson?: {
    departmentIds?: string[];
    branchIds?: string[];
    designations?: string[];
    roles?: string[];
  } | null;
}

interface DirectoryRow {
  provider: string;
  enabled: boolean;
  configJson: Record<string, unknown>;
  lastSyncAt: string | null;
  lastSyncNote: string | null;
  setup?: {
    title: string;
    guideKey: 'SAML' | 'AZURE_AD' | null;
    guideLabel: string | null;
    customerSteps: string[];
    lmsValues: { label: string; value: string; hint: string }[];
    fieldLabels: Record<string, string>;
  };
}

interface SyncRun {
  id: string;
  status: string;
  trigger: string;
  startedAt: string;
  finishedAt: string | null;
  importedCount: number;
  updatedCount: number;
  deactivatedCount: number;
  skippedCount: number;
  errorCount: number;
  note: string | null;
  errorsJson: { email?: string; message: string }[] | null;
}

const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'org', label: 'Org structure', icon: Building2 },
  { id: 'groups', label: 'Groups', icon: UsersRound },
  { id: 'import', label: 'Bulk import', icon: Upload },
  { id: 'directory', label: 'Directory & SSO', icon: Network },
];

const TOUR_STEPS: TourStep[] = [
  {
    id: 'users',
    title: 'Users',
    body: 'Add, search, and manage learners and admins. Archive instead of deleting when someone leaves.',
    selector: '[data-tour="tab-users"]',
  },
  {
    id: 'org',
    title: 'Org structure',
    body: 'Define departments and branches so assignments and leaderboards can filter by org unit.',
    selector: '[data-tour="tab-org"]',
  },
  {
    id: 'groups',
    title: 'Groups',
    body: 'Build static or rule-based groups for bulk training assignment.',
    selector: '[data-tour="tab-groups"]',
  },
  {
    id: 'import',
    title: 'Bulk import',
    body: 'Upload a CSV to create or update many users at once.',
    selector: '[data-tour="tab-import"]',
  },
  {
    id: 'directory',
    title: 'Directory & SSO',
    body: 'Connect Azure AD, LDAP, SAML, or SCIM. Download setup guides and run sync from here.',
    selector: '[data-tour="tab-directory"]',
  },
];

const PROVIDER_LABELS: Record<string, string> = {
  LDAP: 'LDAP',
  ACTIVE_DIRECTORY: 'Active Directory',
  AZURE_AD: 'Azure AD',
  SAML: 'SAML SSO',
  SCIM: 'SCIM provisioning',
};

const emptyForm = {
  fullName: '',
  email: '',
  role: 'LEARNER',
  departmentId: '',
  branchId: '',
  designation: '',
  hrisEmployeeId: '',
  location: '',
  managerId: '',
};

export function UsersPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('users');
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [tourOpen, setTourOpen] = useState(false);

  useEffect(() => {
    if (shouldAutoStartUserTour()) setTourOpen(true);
  }, []);

  const peopleKey = ['people', showArchived, search] as const;

  const { data: people, isLoading, error } = useQuery({
    queryKey: peopleKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (showArchived) params.set('archived', '1');
      if (search.trim()) params.set('search', search.trim());
      return (await api.get(`/api/v1/admin/people?${params}`)).data.data as Person[];
    },
    enabled: tab === 'users' || tab === 'groups' || showForm,
  });

  const { data: departments } = useQuery({
    queryKey: ['org-departments'],
    queryFn: async () => (await api.get('/api/v1/admin/org/departments')).data.data as Dept[],
  });

  const { data: branches } = useQuery({
    queryKey: ['org-branches'],
    queryFn: async () => (await api.get('/api/v1/admin/org/branches')).data.data as Branch[],
  });

  const { data: groups } = useQuery({
    queryKey: ['user-groups'],
    queryFn: async () => (await api.get('/api/v1/admin/user-groups')).data.data as GroupRow[],
    enabled: tab === 'groups' || tab === 'users',
  });

  const { data: directory } = useQuery({
    queryKey: ['directory-settings'],
    queryFn: async () => (await api.get('/api/v1/admin/directory-settings')).data.data as DirectoryRow[],
    enabled: tab === 'directory',
  });

  const managers = useMemo(
    () => (people ?? []).filter((p) => !p.archivedAt && (p.role === 'LINE_MANAGER' || p.role === 'LMS_ADMIN' || p.role === 'LEARNER')),
    [people],
  );

  const createUser = useMutation({
    mutationFn: () =>
      api.post('/api/v1/admin/people', {
        fullName: form.fullName,
        email: form.email,
        role: form.role,
        departmentId: form.departmentId || undefined,
        branchId: form.branchId || undefined,
        designation: form.designation || undefined,
        hrisEmployeeId: form.hrisEmployeeId || undefined,
        location: form.location || undefined,
        managerId: form.managerId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      setShowForm(false);
      setForm(emptyForm);
      setFormError(null);
      setStatus('User created');
    },
    onError: (e) => setFormError(getApiError(e)),
  });

  return (
    <div>
      <PageHeader
        title="User management"
        subtitle="People, org structure, groups, bulk import, and directory / SSO"
        action={
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setTourOpen(true)} className="btn-secondary">
              <Compass className="w-4 h-4" /> Take a Tour
            </button>
            {tab === 'users' && !showArchived ? (
              <button type="button" onClick={() => setShowForm(true)} className="btn-primary">
                <Plus className="w-4 h-4" /> Add user
              </button>
            ) : null}
          </div>
        }
      />

      <UserAccessTour open={tourOpen} onClose={() => setTourOpen(false)} steps={TOUR_STEPS} />

      <div className="flex gap-1 overflow-x-auto mb-6 pb-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              data-tour={`tab-${t.id}`}
              onClick={() => { setTab(t.id); setStatus(null); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                active ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {status && <p className="text-sm text-emerald-600 mb-4">{status}</p>}

      {tab === 'users' && (
        <UsersTab
          people={people}
          isLoading={isLoading}
          error={error}
          showArchived={showArchived}
          setShowArchived={setShowArchived}
          search={search}
          setSearch={setSearch}
          showForm={showForm}
          setShowForm={setShowForm}
          form={form}
          setForm={setForm}
          formError={formError}
          departments={departments}
          branches={branches}
          managers={managers}
          onCreate={() => createUser.mutate()}
          creating={createUser.isPending}
          onArchivedChange={() => queryClient.invalidateQueries({ queryKey: ['people'] })}
          setStatus={setStatus}
        />
      )}

      {tab === 'org' && (
        <OrgTab
          departments={departments}
          branches={branches}
          onChange={() => {
            queryClient.invalidateQueries({ queryKey: ['org-departments'] });
            queryClient.invalidateQueries({ queryKey: ['org-branches'] });
          }}
          setStatus={setStatus}
        />
      )}

      {tab === 'groups' && (
        <GroupsTab
          groups={groups}
          departments={departments}
          branches={branches}
          people={people}
          onChange={() => queryClient.invalidateQueries({ queryKey: ['user-groups'] })}
          setStatus={setStatus}
        />
      )}

      {tab === 'import' && (
        <ImportTab
          onDone={() => {
            queryClient.invalidateQueries({ queryKey: ['people'] });
          }}
          setStatus={setStatus}
        />
      )}

      {tab === 'directory' && (
        <DirectoryTab
          rows={directory}
          onChange={() => queryClient.invalidateQueries({ queryKey: ['directory-settings'] })}
          setStatus={setStatus}
        />
      )}
    </div>
  );
}

function UsersTab({
  people,
  isLoading,
  error,
  showArchived,
  setShowArchived,
  search,
  setSearch,
  showForm,
  setShowForm,
  form,
  setForm,
  formError,
  departments,
  branches,
  managers,
  onCreate,
  creating,
  onArchivedChange,
  setStatus,
}: {
  people?: Person[];
  isLoading: boolean;
  error: unknown;
  showArchived: boolean;
  setShowArchived: (v: boolean) => void;
  search: string;
  setSearch: (v: string) => void;
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  form: typeof emptyForm;
  setForm: (v: typeof emptyForm) => void;
  formError: string | null;
  departments?: Dept[];
  branches?: Branch[];
  managers: Person[];
  onCreate: () => void;
  creating: boolean;
  onArchivedChange: () => void;
  setStatus: (s: string | null) => void;
}) {
  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search name, email, employee ID, designation…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={() => setShowArchived(!showArchived)}
          className={`btn-secondary ${showArchived ? 'ring-2 ring-brand-500' : ''}`}
        >
          <Archive className="w-4 h-4" /> {showArchived ? 'Viewing archived' : 'Archived users'}
        </button>
      </div>

      {showForm && (
        <div className="card p-5 mb-6 space-y-4">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-brand-600" />
            <h2 className="font-semibold">Manual user creation</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className="input" placeholder="Full name *" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            <input className="input" type="email" placeholder="Email *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="LEARNER">Learner</option>
              <option value="LINE_MANAGER">Line manager</option>
              <option value="LMS_ADMIN">Company admin</option>
            </select>
            <input className="input" placeholder="Employee ID" value={form.hrisEmployeeId} onChange={(e) => setForm({ ...form, hrisEmployeeId: e.target.value })} />
            <select className="input" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
              <option value="">Department</option>
              {departments?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select className="input" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
              <option value="">Branch</option>
              {branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <input className="input" placeholder="Designation" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
            <select className="input" value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })}>
              <option value="">Manager</option>
              {managers.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
            </select>
            <input className="input sm:col-span-2" placeholder="Location (optional)" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          {formError && <p className="text-sm text-rose-600">{formError}</p>}
          <div className="flex gap-2">
            <button type="button" className="btn-primary" disabled={!form.fullName.trim() || !form.email.trim() || creating} onClick={onCreate}>
              {creating ? 'Saving…' : 'Create user'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <QueryState isLoading={isLoading} error={error}>
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="p-3 font-semibold text-slate-600">Name</th>
                  <th className="p-3 font-semibold text-slate-600">Employee ID</th>
                  <th className="p-3 font-semibold text-slate-600">Dept / Branch</th>
                  <th className="p-3 font-semibold text-slate-600">Designation</th>
                  <th className="p-3 font-semibold text-slate-600">Manager</th>
                  <th className="p-3 font-semibold text-slate-600">Role</th>
                  <th className="p-3 font-semibold text-slate-600">Status</th>
                  <th className="p-3 font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(people ?? []).map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80">
                    <td className="p-3">
                      <p className="font-medium text-slate-900">{u.fullName}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </td>
                    <td className="p-3 font-mono text-xs text-slate-600">{u.hrisEmployeeId ?? '—'}</td>
                    <td className="p-3 text-slate-600">
                      <p>{u.department}</p>
                      <p className="text-xs text-slate-400">{u.branch ?? '—'}</p>
                    </td>
                    <td className="p-3 text-slate-600">{u.designation ?? '—'}</td>
                    <td className="p-3 text-slate-600 text-xs">{u.manager?.fullName ?? '—'}</td>
                    <td className="p-3"><StatusBadge status={u.role} /></td>
                    <td className="p-3">
                      <span className={`badge ${u.archivedAt ? 'bg-slate-100 text-slate-600' : u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {u.archivedAt ? 'Archived' : u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-3">
                      {!u.archivedAt ? (
                        <DeleteButton
                          label="Archive"
                          confirmMessage={`Archive ${u.fullName}? They will be moved to archived users.`}
                          onDelete={async () => {
                            await api.post(`/api/v1/admin/people/${u.id}/archive`);
                            onArchivedChange();
                            setStatus('User archived');
                          }}
                        />
                      ) : (
                        <button
                          type="button"
                          className="text-sm text-brand-600 font-medium"
                          onClick={async () => {
                            await api.post(`/api/v1/admin/people/${u.id}/restore`);
                            onArchivedChange();
                            setStatus('User restored');
                          }}
                        >
                          Restore
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(people ?? []).length === 0 && (
            <p className="p-8 text-center text-slate-400">
              {showArchived ? 'No archived users.' : 'No users yet. Add manually or use Bulk import.'}
            </p>
          )}
        </div>
      </QueryState>
    </>
  );
}

function OrgTab({
  departments,
  branches,
  onChange,
  setStatus,
}: {
  departments?: Dept[];
  branches?: Branch[];
  onChange: () => void;
  setStatus: (s: string | null) => void;
}) {
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [branchCity, setBranchCity] = useState('');

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Building2 className="w-4 h-4" /> Departments</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <input className="input" placeholder="Name" value={deptName} onChange={(e) => setDeptName(e.target.value)} />
          <input className="input sm:max-w-[120px]" placeholder="Code" value={deptCode} onChange={(e) => setDeptCode(e.target.value)} />
          <button
            type="button"
            className="btn-primary"
            disabled={!deptName.trim() || !deptCode.trim()}
            onClick={async () => {
              await api.post('/api/v1/admin/org/departments', { name: deptName, code: deptCode });
              setDeptName('');
              setDeptCode('');
              onChange();
              setStatus('Department created');
            }}
          >
            Add
          </button>
        </div>
        <ul className="divide-y divide-slate-100">
          {(departments ?? []).map((d) => (
            <li key={d.id} className="py-2 flex justify-between text-sm">
              <span><strong>{d.name}</strong> <span className="text-slate-400">({d.code})</span></span>
              <span className="text-slate-500">{d._count?.users ?? 0} users</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card p-5 space-y-4">
        <h2 className="font-semibold">Branches</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input className="input" placeholder="Name" value={branchName} onChange={(e) => setBranchName(e.target.value)} />
          <input className="input" placeholder="Code" value={branchCode} onChange={(e) => setBranchCode(e.target.value)} />
          <input className="input" placeholder="City" value={branchCity} onChange={(e) => setBranchCity(e.target.value)} />
        </div>
        <button
          type="button"
          className="btn-primary"
          disabled={!branchName.trim() || !branchCode.trim()}
          onClick={async () => {
            await api.post('/api/v1/admin/org/branches', { name: branchName, code: branchCode, city: branchCity || undefined });
            setBranchName('');
            setBranchCode('');
            setBranchCity('');
            onChange();
            setStatus('Branch created');
          }}
        >
          Add branch
        </button>
        <ul className="divide-y divide-slate-100">
          {(branches ?? []).map((b) => (
            <li key={b.id} className="py-2 flex justify-between text-sm">
              <span><strong>{b.name}</strong> <span className="text-slate-400">({b.code})</span>{b.city ? ` · ${b.city}` : ''}</span>
              <span className="text-slate-500">{b._count?.users ?? 0} users</span>
            </li>
          ))}
          {(branches ?? []).length === 0 && <li className="text-sm text-slate-400 py-2">No branches yet.</li>}
        </ul>
      </div>
    </div>
  );
}

function GroupsTab({
  groups,
  departments,
  branches,
  people,
  onChange,
  setStatus,
}: {
  groups?: GroupRow[];
  departments?: Dept[];
  branches?: Branch[];
  people?: Person[];
  onChange: () => void;
  setStatus: (s: string | null) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDynamic, setIsDynamic] = useState(false);
  const [deptIds, setDeptIds] = useState<string[]>([]);
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [memberIds, setMemberIds] = useState<string[]>([]);

  const toggle = (list: string[], id: string, set: (v: string[]) => void) => {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  return (
    <div className="space-y-6">
      <div className="card p-5 space-y-4">
        <h2 className="font-semibold">Create group</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <input className="input" placeholder="Group name *" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isDynamic} onChange={(e) => setIsDynamic(e.target.checked)} />
          Dynamic group (auto-membership by rules)
        </label>

        {isDynamic ? (
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium mb-2">Departments</p>
              <div className="space-y-1 max-h-40 overflow-y-auto border rounded-xl p-2">
                {(departments ?? []).map((d) => (
                  <label key={d.id} className="flex items-center gap-2">
                    <input type="checkbox" checked={deptIds.includes(d.id)} onChange={() => toggle(deptIds, d.id, setDeptIds)} />
                    {d.name}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="font-medium mb-2">Branches</p>
              <div className="space-y-1 max-h-40 overflow-y-auto border rounded-xl p-2">
                {(branches ?? []).map((b) => (
                  <label key={b.id} className="flex items-center gap-2">
                    <input type="checkbox" checked={branchIds.includes(b.id)} onChange={() => toggle(branchIds, b.id, setBranchIds)} />
                    {b.name}
                  </label>
                ))}
                {(branches ?? []).length === 0 && <p className="text-slate-400">No branches</p>}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <p className="font-medium mb-2 text-sm">Members</p>
            <div className="space-y-1 max-h-48 overflow-y-auto border rounded-xl p-2 text-sm">
              {(people ?? []).filter((p) => !p.archivedAt).map((p) => (
                <label key={p.id} className="flex items-center gap-2">
                  <input type="checkbox" checked={memberIds.includes(p.id)} onChange={() => toggle(memberIds, p.id, setMemberIds)} />
                  {p.fullName} <span className="text-slate-400">({p.email})</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          className="btn-primary"
          disabled={!name.trim()}
          onClick={async () => {
            await api.post('/api/v1/admin/user-groups', {
              name,
              description: description || undefined,
              isDynamic,
              rulesJson: isDynamic ? { departmentIds: deptIds, branchIds } : undefined,
              memberIds: isDynamic ? undefined : memberIds,
            });
            setName('');
            setDescription('');
            setDeptIds([]);
            setBranchIds([]);
            setMemberIds([]);
            onChange();
            setStatus('Group created');
          }}
        >
          Create group
        </button>
      </div>

      <div className="grid gap-3">
        {(groups ?? []).map((g) => (
          <div key={g.id} className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{g.name}</p>
              <p className="text-sm text-slate-500">
                {g.isDynamic ? 'Dynamic' : 'Manual'} · {g.memberCount} members
                {g.description ? ` · ${g.description}` : ''}
              </p>
            </div>
            <div className="flex gap-2">
              {g.isDynamic && (
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  onClick={async () => {
                    const { data } = await api.post(`/api/v1/admin/user-groups/${g.id}/sync`);
                    onChange();
                    setStatus(`Synced ${data.data.synced} members`);
                  }}
                >
                  <RefreshCw className="w-4 h-4" /> Sync
                </button>
              )}
              <DeleteButton
                confirmMessage={`Delete group "${g.name}"?`}
                onDelete={async () => {
                  await api.delete(`/api/v1/admin/user-groups/${g.id}`);
                  onChange();
                  setStatus('Group deleted');
                }}
              />
            </div>
          </div>
        ))}
        {(groups ?? []).length === 0 && (
          <div className="card p-8 text-center text-slate-400">No groups yet. Create a manual or dynamic group above.</div>
        )}
      </div>
    </div>
  );
}

function ImportTab({ onDone, setStatus }: { onDone: () => void; setStatus: (s: string | null) => void }) {
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [busy, setBusy] = useState(false);

  const downloadTemplate = async () => {
    const { data } = await api.get('/api/v1/admin/people/import-template', { responseType: 'blob' });
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user-import-template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const upload = async (file: File) => {
    setBusy(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/api/v1/admin/people/import', form);
      setResult(data.data);
      setStatus(`Imported ${data.data.created} users (${data.data.skipped} skipped)`);
      onDone();
    } catch (e) {
      setStatus(getApiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-6 space-y-4 max-w-xl">
      <h2 className="font-semibold">Bulk user import (Excel)</h2>
      <p className="text-sm text-slate-500">
        Download the template, fill rows (name, email, employee ID, department code, branch code, designation, manager email), then upload.
      </p>
      <button type="button" className="btn-secondary" onClick={downloadTemplate}>
        <Download className="w-4 h-4" /> Download Excel template
      </button>
      <label className="btn-primary cursor-pointer inline-flex">
        <Upload className="w-4 h-4" /> {busy ? 'Importing…' : 'Upload Excel file'}
        <input
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          disabled={busy}
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
      </label>
      {result && (
        <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-2">
          <p><strong>{result.created}</strong> created · <strong>{result.skipped}</strong> skipped</p>
          {result.errors.length > 0 && (
            <ul className="text-rose-600 text-xs space-y-1 max-h-40 overflow-y-auto">
              {result.errors.map((err) => <li key={err}>{err}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function DirectoryTab({
  rows,
  onChange,
  setStatus,
}: {
  rows?: DirectoryRow[];
  onChange: () => void;
  setStatus: (s: string | null) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [enabled, setEnabled] = useState(false);
  const [syncRuns, setSyncRuns] = useState<SyncRun[]>([]);
  const [syncBusy, setSyncBusy] = useState(false);

  const openEdit = (row: DirectoryRow) => {
    setEditing(row.provider);
    setDraft({ ...(row.configJson ?? {}) });
    setEnabled(row.enabled);
    if (row.provider === 'AZURE_AD') {
      void loadSyncRuns();
    }
  };

  const loadSyncRuns = async () => {
    try {
      const { data } = await api.get('/api/v1/admin/directory-settings/AZURE_AD/sync-runs');
      setSyncRuns(data.data as SyncRun[]);
    } catch {
      setSyncRuns([]);
    }
  };

  const downloadGuide = async (provider: 'SAML' | 'AZURE_AD', filename: string) => {
    try {
      const { data } = await api.get(`/api/v1/admin/directory-guides/${provider}`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setStatus(`Downloaded ${filename}`);
    } catch (e) {
      setStatus(getApiError(e));
    }
  };

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setStatus(`Copied ${label}`);
    } catch {
      setStatus('Could not copy — select the value manually');
    }
  };

  const fieldLabel = (row: DirectoryRow, key: string) =>
    row.setup?.fieldLabels?.[key] ?? key;

  const editableKeys = (row: DirectoryRow) => {
    const keys = Object.keys(row.configJson ?? {});
    if (row.provider === 'AZURE_AD') {
      return ['tenantId', 'clientId', 'clientSecret', 'syncIntervalHours', 'deactivateMissing'];
    }
    return keys;
  };

  return (
    <div className="space-y-4">
      <div className="card p-4 bg-brand-50/50 border-brand-100 text-sm text-slate-700 space-y-3">
        <p>
          Enterprise identity for this LMS tenant. CSMs and customers can download the official setup guides,
          follow the Entra steps, then paste values here.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={() => downloadGuide('SAML', 'SSO_SAML_Integration_with_ProPhish.docx')}
          >
            <Download className="w-4 h-4" /> SAML SSO guide (.docx)
          </button>
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={() => downloadGuide('AZURE_AD', 'Azure_AD_user_sync_with_ProPhish.pdf')}
          >
            <Download className="w-4 h-4" /> Azure AD sync guide (.pdf)
          </button>
        </div>
      </div>

      {(rows ?? []).map((row) => (
        <div key={row.provider} className="card p-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-brand-600 shrink-0" />
                {PROVIDER_LABELS[row.provider] ?? row.provider}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {row.setup?.title ?? ''}
                {row.enabled ? ' · Enabled' : ' · Disabled'}
                {row.lastSyncAt ? ` · Last sync ${new Date(row.lastSyncAt).toLocaleString()}` : ''}
              </p>
              {row.lastSyncNote && (
                <p className="text-xs text-slate-600 mt-1 break-words">{row.lastSyncNote}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              {row.setup?.guideKey && (
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  onClick={() =>
                    downloadGuide(
                      row.setup!.guideKey!,
                      row.setup!.guideKey === 'SAML'
                        ? 'SSO_SAML_Integration_with_ProPhish.docx'
                        : 'Azure_AD_user_sync_with_ProPhish.pdf',
                    )
                  }
                >
                  <Download className="w-4 h-4" /> Guide
                </button>
              )}
              {row.provider === 'AZURE_AD' && row.enabled && (
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  disabled={syncBusy}
                  onClick={async () => {
                    setSyncBusy(true);
                    try {
                      const { data } = await api.post('/api/v1/admin/directory-settings/AZURE_AD/sync');
                      onChange();
                      await loadSyncRuns();
                      setStatus(data.data.note ?? 'Azure AD sync completed');
                    } catch (e) {
                      setStatus(getApiError(e));
                    } finally {
                      setSyncBusy(false);
                    }
                  }}
                >
                  <RefreshCw className={`w-4 h-4 ${syncBusy ? 'animate-spin' : ''}`} />
                  {syncBusy ? 'Syncing…' : 'Sync users'}
                </button>
              )}
              <button type="button" className="btn-secondary text-sm" onClick={() => openEdit(row)}>
                Configure
              </button>
            </div>
          </div>

          {editing === row.provider && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
              {(row.setup?.customerSteps?.length ?? 0) > 0 && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-slate-800 mb-2">Customer / CSM steps (from guide)</p>
                  <ol className="list-decimal pl-5 space-y-1.5 text-sm text-slate-600">
                    {row.setup!.customerSteps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              {(row.setup?.lmsValues?.length ?? 0) > 0 && (
                <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-4 space-y-3">
                  <p className="text-sm font-semibold text-slate-800">Share these LMS values with the Entra admin</p>
                  {row.setup!.lmsValues.map((item) => (
                    <div key={item.label} className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-500">{item.label}</p>
                        <code className="text-xs sm:text-sm break-all text-slate-800">{item.value}</code>
                        <p className="text-[11px] text-slate-400 mt-0.5">{item.hint}</p>
                      </div>
                      <button type="button" className="btn-secondary text-xs shrink-0" onClick={() => copyText(item.value, item.label)}>
                        Copy
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {row.provider === 'AZURE_AD' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-sm text-amber-900 space-y-1">
                  <p>
                    Uses <strong>OAuth 2.0 client credentials</strong> with Microsoft Graph (non-interactive).
                  </p>
                  <p>
                    Required permission: <strong>User.Read.All</strong> (Application) + Global Admin consent.
                  </p>
                  <p>
                    Syncs Name, Email, Employee ID, Department, Designation, Manager, Office Location, and Account Status.
                  </p>
                </div>
              )}

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
                Enable {PROVIDER_LABELS[row.provider]}
              </label>

              <div className="grid sm:grid-cols-2 gap-3">
                {editableKeys(row).map((key) => {
                  const isSecret =
                    key.toLowerCase().includes('password') ||
                    key.toLowerCase().includes('secret') ||
                    key.toLowerCase().includes('token') ||
                    key.toLowerCase().includes('certificate');
                  const isBool = typeof draft[key] === 'boolean' || key === 'deactivateMissing';
                  const isReadOnlyShare = row.provider === 'SAML' && (key === 'entityId' || key === 'acsUrl');
                  const isInterval = key === 'syncIntervalHours';

                  if (isBool) {
                    return (
                      <label key={key} className="flex items-center gap-2 text-sm sm:col-span-2">
                        <input
                          type="checkbox"
                          checked={!!draft[key]}
                          onChange={(e) => setDraft({ ...draft, [key]: e.target.checked })}
                        />
                        {fieldLabel(row, key)}
                      </label>
                    );
                  }

                  if (isInterval) {
                    return (
                      <div key={key}>
                        <label className="block text-xs font-medium text-slate-500 mb-1">{fieldLabel(row, key)}</label>
                        <select
                          className="input"
                          value={String(draft[key] ?? 0)}
                          onChange={(e) => setDraft({ ...draft, [key]: Number(e.target.value) })}
                        >
                          <option value={0}>Manual only</option>
                          <option value={6}>Every 6 hours</option>
                          <option value={12}>Every 12 hours</option>
                          <option value={24}>Every 24 hours</option>
                        </select>
                      </div>
                    );
                  }

                  return (
                    <div key={key} className={key === 'idpCertificate' ? 'sm:col-span-2' : ''}>
                      <label className="block text-xs font-medium text-slate-500 mb-1">{fieldLabel(row, key)}</label>
                      {key === 'idpCertificate' ? (
                        <textarea
                          className="input min-h-[80px] font-mono text-xs"
                          value={String(draft[key] ?? '')}
                          onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                          placeholder="Paste Base64 certificate from Entra"
                        />
                      ) : (
                        <input
                          className="input"
                          type={isSecret && !isReadOnlyShare ? 'password' : 'text'}
                          readOnly={isReadOnlyShare}
                          autoComplete="off"
                          value={String(draft[key] ?? '')}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setDraft({
                              ...draft,
                              [key]: typeof draft[key] === 'number' ? Number(raw) : raw,
                            });
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={async () => {
                    await api.patch(`/api/v1/admin/directory-settings/${row.provider}`, {
                      enabled,
                      configJson: draft,
                    });
                    setEditing(null);
                    onChange();
                    setStatus(`${PROVIDER_LABELS[row.provider]} settings saved`);
                  }}
                >
                  Save settings
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={async () => {
                    try {
                      const { data } = await api.post(`/api/v1/admin/directory-settings/${row.provider}/test`);
                      onChange();
                      setStatus(data.data.message);
                    } catch (e) {
                      setStatus(getApiError(e));
                    }
                  }}
                >
                  Test connection
                </button>
                {row.provider === 'AZURE_AD' && (
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={syncBusy}
                    onClick={async () => {
                      setSyncBusy(true);
                      try {
                        const { data } = await api.post('/api/v1/admin/directory-settings/AZURE_AD/sync');
                        onChange();
                        await loadSyncRuns();
                        setStatus(data.data.note ?? 'Azure AD sync completed');
                      } catch (e) {
                        setStatus(getApiError(e));
                      } finally {
                        setSyncBusy(false);
                      }
                    }}
                  >
                    <RefreshCw className={`w-4 h-4 ${syncBusy ? 'animate-spin' : ''}`} />
                    Sync users
                  </button>
                )}
                <button type="button" className="text-sm text-slate-500" onClick={() => setEditing(null)}>
                  Cancel
                </button>
              </div>

              {row.provider === 'AZURE_AD' && syncRuns.length > 0 && (
                <div className="pt-2">
                  <p className="text-sm font-semibold text-slate-800 mb-2">Synchronization history</p>
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-left text-xs text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Started</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Trigger</th>
                          <th className="px-3 py-2">Imported</th>
                          <th className="px-3 py-2">Updated</th>
                          <th className="px-3 py-2">Deactivated</th>
                          <th className="px-3 py-2">Errors</th>
                        </tr>
                      </thead>
                      <tbody>
                        {syncRuns.map((run) => (
                          <tr key={run.id} className="border-t border-slate-100">
                            <td className="px-3 py-2 whitespace-nowrap">{new Date(run.startedAt).toLocaleString()}</td>
                            <td className="px-3 py-2">{run.status}</td>
                            <td className="px-3 py-2">{run.trigger}</td>
                            <td className="px-3 py-2">{run.importedCount}</td>
                            <td className="px-3 py-2">{run.updatedCount}</td>
                            <td className="px-3 py-2">{run.deactivatedCount}</td>
                            <td className="px-3 py-2">
                              {run.errorCount}
                              {run.errorsJson?.[0]?.message ? (
                                <span className="block text-xs text-slate-500 max-w-[220px] truncate" title={run.errorsJson[0].message}>
                                  {run.errorsJson[0].message}
                                </span>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
