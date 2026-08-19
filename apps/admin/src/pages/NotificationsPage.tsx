import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Send, RefreshCw, Mail, Eye, Settings, MessageSquare } from 'lucide-react';
import { PageHeader, StatCard } from '../components/ui';
import { QueryState } from '../components/QueryState';
import { DeleteButton } from '../components/DeleteButton';
import { ReminderTemplateEditor } from '../components/ReminderTemplateEditor';
import { api } from '../lib/api';

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: async () => (await api.get('/api/v1/admin/notifications/settings')).data.data,
  });

  const [localSettings, setLocalSettings] = useState({
    emailEnabled: true,
    pushEnabled: false,
    slackEnabled: false,
    teamsEnabled: false,
    slackWebhookUrl: '',
    teamsWebhookUrl: '',
    notifyPending: true,
    notifyOverdue: true,
  });

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        emailEnabled: settings.emailEnabled ?? true,
        pushEnabled: settings.pushEnabled ?? false,
        slackEnabled: settings.slackEnabled ?? false,
        teamsEnabled: settings.teamsEnabled ?? false,
        slackWebhookUrl: settings.slackWebhookUrl ?? '',
        teamsWebhookUrl: settings.teamsWebhookUrl ?? '',
        notifyPending: settings.notifyPending ?? true,
        notifyOverdue: settings.notifyOverdue ?? true,
      });
    }
  }, [settings]);

  const saveSettingsMutation = useMutation({
    mutationFn: () => api.post('/api/v1/admin/notifications/settings', localSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['notification-stats'],
    queryFn: async () => (await api.get('/api/v1/admin/notifications/stats')).data.data,
  });

  const { data: notifications, isLoading, error } = useQuery({
    queryKey: ['notifications', statusFilter],
    queryFn: async () =>
      (await api.get('/api/v1/admin/notifications', { params: statusFilter ? { status: statusFilter } : {} })).data.data,
  });

  const processMutation = useMutation({
    mutationFn: () => api.post('/api/v1/admin/notifications/process'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
    },
  });

  const resendMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/v1/admin/notifications/${id}/resend`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const statusColor: Record<string, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-700',
    SENT: 'bg-slate-100 text-slate-600',
    DELIVERED: 'bg-emerald-100 text-emerald-700',
    OPENED: 'bg-indigo-100 text-indigo-700',
    FAILED: 'bg-rose-100 text-rose-700',
    PENDING: 'bg-amber-100 text-amber-700',
  };

  return (
    <div>
      <PageHeader
        title="Reminders & Notifications"
        subtitle="Track all LMS communications and delivery status"
        action={
          <button onClick={() => processMutation.mutate()} disabled={processMutation.isPending} className="btn-primary">
            <Send className="w-4 h-4" />
            {processMutation.isPending ? 'Processing...' : 'Process Due Reminders'}
          </button>
        }
      />

      <div className="card p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-slate-500" />
          <h2 className="font-semibold text-slate-900">Automation Settings</h2>
          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full ml-auto">Options only — integrations not connected</span>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Configure which channels can send automated reminders for pending and overdue training. Email is simulated; push, Slack, and Teams are saved as preferences for future integration.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {([
            { key: 'emailEnabled' as const, label: 'Email', icon: Mail },
            { key: 'pushEnabled' as const, label: 'Push', icon: Bell },
            { key: 'slackEnabled' as const, label: 'Slack', icon: MessageSquare },
            { key: 'teamsEnabled' as const, label: 'Teams', icon: MessageSquare },
          ]).map(({ key, label, icon: Icon }) => (
            <label key={key} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer ${localSettings[key] ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200'}`}>
              <input
                type="checkbox"
                checked={localSettings[key]}
                onChange={(e) => setLocalSettings((s) => ({ ...s, [key]: e.target.checked }))}
              />
              <Icon className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium">{label}</span>
            </label>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <input
            className="input text-sm"
            placeholder="Slack webhook URL (optional, for future use)"
            value={localSettings.slackWebhookUrl}
            onChange={(e) => setLocalSettings((s) => ({ ...s, slackWebhookUrl: e.target.value }))}
            disabled={!localSettings.slackEnabled}
          />
          <input
            className="input text-sm"
            placeholder="Teams webhook URL (optional, for future use)"
            value={localSettings.teamsWebhookUrl}
            onChange={(e) => setLocalSettings((s) => ({ ...s, teamsWebhookUrl: e.target.value }))}
            disabled={!localSettings.teamsEnabled}
          />
        </div>
        <div className="flex flex-wrap gap-4 mb-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={localSettings.notifyPending} onChange={(e) => setLocalSettings((s) => ({ ...s, notifyPending: e.target.checked }))} />
            Notify for pending training
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={localSettings.notifyOverdue} onChange={(e) => setLocalSettings((s) => ({ ...s, notifyOverdue: e.target.checked }))} />
            Notify for overdue training
          </label>
        </div>
        <button
          onClick={() => saveSettingsMutation.mutate()}
          disabled={saveSettingsMutation.isPending}
          className="btn-primary"
        >
          {settingsSaved ? 'Saved!' : saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatCard label="Scheduled" value={stats?.scheduled ?? 0} icon={Bell} color="indigo" />
        <StatCard label="Delivered" value={(stats?.total ?? 0) - (stats?.failed ?? 0) - (stats?.scheduled ?? 0)} icon={Mail} color="emerald" />
        <StatCard label="Opened" value={stats?.opened ?? 0} icon={Eye} color="indigo" />
        <StatCard label="Failed" value={stats?.failed ?? 0} icon={Bell} color="rose" />
        <StatCard label="Open Rate" value={`${stats?.openRate ?? 0}%`} icon={Eye} color="emerald" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        <div className="xl:col-span-2 card overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold">Notification History</h2>
            <select className="input w-auto text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="DELIVERED">Delivered</option>
              <option value="OPENED">Opened</option>
              <option value="FAILED">Failed</option>
              <option value="SENT">Sent</option>
            </select>
          </div>
          <QueryState isLoading={isLoading} error={error}>
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {(notifications ?? []).map((n: {
                id: string;
                subject: string;
                body: string;
                channel: string;
                status: string;
                scheduledAt: string | null;
                sentAt: string | null;
                openedAt: string | null;
                failureReason: string | null;
                user: { fullName: string; email: string };
                training: { title: string } | null;
              }) => (
                <div key={n.id} className="p-4 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{n.subject}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        To: {n.user.fullName} ({n.user.email})
                        {n.training && ` · ${n.training.title}`}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {n.channel}
                        {n.scheduledAt && ` · Scheduled: ${new Date(n.scheduledAt).toLocaleString()}`}
                        {n.sentAt && ` · Sent: ${new Date(n.sentAt).toLocaleString()}`}
                        {n.openedAt && ` · Opened: ${new Date(n.openedAt).toLocaleString()}`}
                      </p>
                      {n.failureReason && <p className="text-xs text-rose-600 mt-1">{n.failureReason}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`badge text-xs ${statusColor[n.status] ?? 'bg-slate-100'}`}>{n.status}</span>
                      <span className="badge text-xs bg-slate-100 text-slate-600">{n.channel}</span>
                      <button onClick={() => setPreview({ subject: n.subject, body: n.body })} className="text-xs text-indigo-600">Preview</button>
                      {(n.status === 'FAILED' || n.status === 'SENT') && (
                        <button onClick={() => resendMutation.mutate(n.id)} className="text-xs text-slate-500 flex items-center gap-1">
                          <RefreshCw className="w-3 h-3" /> Resend
                        </button>
                      )}
                      <DeleteButton
                        confirmMessage="Delete this notification record?"
                        onDelete={async () => {
                          await api.delete(`/api/v1/admin/notifications/${n.id}`);
                          queryClient.invalidateQueries({ queryKey: ['notifications'] });
                          queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {(!notifications || notifications.length === 0) && (
                <p className="p-8 text-center text-slate-400">No notifications yet. Assign training to schedule reminders.</p>
              )}
            </div>
          </QueryState>
        </div>

        <ReminderTemplateEditor />
      </div>

      {preview && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50" onClick={() => setPreview(null)}>
          <div className="card p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold mb-2">Email Preview</h3>
            <p className="text-sm font-medium text-slate-700 mb-3">Subject: {preview.subject}</p>
            <pre className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 p-4 rounded-xl">{preview.body}</pre>
            <button onClick={() => setPreview(null)} className="btn-secondary mt-4 w-full">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
