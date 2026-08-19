import axios, { AxiosError } from 'axios';
import type { ApiResponse, AnalyticsOverview } from '@lms/shared';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export const api = axios.create({ baseURL: API_BASE, timeout: 15_000 });

export function getApiError(err: unknown): string {
  if (err instanceof AxiosError) {
    if (!err.response) {
      return 'Cannot reach API server. Start it with: cd apps/api && npm run dev';
    }
    if (err.response.status === 401) {
      return 'Session expired or invalid. Sign out and sign in again with admin@example.com';
    }
    const message = err.response?.data?.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(', ');
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Request failed';
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lms_token');
  const companyContext = localStorage.getItem('lms_company_context');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (companyContext) {
    config.headers['X-Company-Context'] = companyContext;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      const url = err.config?.url ?? '';
      if (!url.includes('/auth/login')) {
        const hadToken = !!localStorage.getItem('lms_token');
        logout();
        // Session probe uses /auth/me — LoginGate handles UI; other 401s force re-login
        if (hadToken && !url.includes('/auth/me')) {
          window.location.assign('/admin/');
        }
      }
    }
    return Promise.reject(err);
  },
);

export async function login(email: string) {
  const { data } = await api.post<ApiResponse<{ accessToken: string; user: { role: string } }>>(
    '/api/v1/auth/login',
    { email },
  );
  if (data.data?.accessToken) {
    localStorage.setItem('lms_token', data.data.accessToken);
  }
  return data.data;
}

export async function getAnalytics(): Promise<AnalyticsOverview> {
  const { data } = await api.get<ApiResponse<AnalyticsOverview>>('/api/v1/admin/analytics/overview');
  return data.data as AnalyticsOverview;
}

export function logout() {
  localStorage.removeItem('lms_token');
  localStorage.removeItem('lms_company_context');
  localStorage.removeItem('lms_company_context_name');
  localStorage.removeItem('lms_company_context_slug');
}

export async function getCurrentUser() {
  const { data } = await api.get<ApiResponse<{
    id: string;
    fullName: string;
    email: string;
    role: string;
    companyId?: string | null;
    company?: { id: string; name: string; slug: string } | null;
  }>>('/api/v1/auth/me');
  return data.data;
}

export async function getDashboard() {
  const { data } = await api.get<ApiResponse>('/api/v1/admin/dashboard');
  return data.data;
}

export async function getAdminCourses() {
  const { data } = await api.get<ApiResponse>('/api/v1/admin/courses');
  return data.data;
}

export async function getAdminUsers() {
  const { data } = await api.get<ApiResponse>('/api/v1/admin/users');
  return data.data;
}

export async function getAdminEnrollments() {
  const { data } = await api.get<ApiResponse>('/api/v1/admin/enrollments');
  return data.data;
}

export async function getCoursesWithModules() {
  const courses = await getAdminCourses();
  return courses as {
    id: string;
    title: string;
    modules: { id: string; title: string; contentType: string }[];
  }[];
}

export async function uploadVideoDirect(moduleId: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  form.append('moduleId', moduleId);
  const { data } = await api.post<ApiResponse>('/api/v1/admin/upload/video', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function uploadQuizExcel(moduleId: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  form.append('moduleId', moduleId);
  const { data } = await api.post<ApiResponse>('/api/v1/admin/upload/quiz-excel', form);
  return data;
}

export async function uploadScorm(moduleId: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  form.append('moduleId', moduleId);
  const { data } = await api.post<ApiResponse>('/api/v1/admin/upload/scorm', form);
  return data;
}

export function downloadAuditExport() {
  return downloadCsv('/api/v1/admin/reports/audit-export', 'audit-export.csv');
}

export function downloadEnrollmentExport() {
  return downloadCsv('/api/v1/admin/reports/enrollment-export', 'enrollment-report.csv');
}

export type TrainingReportFormat = 'csv' | 'excel' | 'pdf';

export async function downloadTrainingReport(
  trainingId: string,
  format: TrainingReportFormat,
  filename?: string,
  extraParams?: Record<string, string>,
) {
  const { data, headers } = await api.get(
    `/api/v1/admin/reports/training/${trainingId}/export/${format}`,
    { params: extraParams, responseType: 'blob' },
  );
  const disposition = headers['content-disposition'] as string | undefined;
  const match = disposition?.match(/filename="?([^";\n]+)"?/);
  const resolvedName = filename ?? match?.[1] ?? `training-report.${format === 'excel' ? 'xlsx' : format}`;
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = resolvedName;
  link.click();
  URL.revokeObjectURL(url);
}

async function downloadCsv(path: string, filename: string) {
  const { data } = await api.get(path, { responseType: 'blob' });
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadQuizTemplate() {
  window.open('/api/v1/admin/upload/quiz-excel/template', '_blank');
}
