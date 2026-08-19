import axios, { AxiosError } from 'axios';
import type { ApiResponse } from '@lms/shared';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export interface EnrollmentItem {
  id: string;
  status: string;
  progressPercentage?: number;
  dueDate?: string;
  completedAt?: string | null;
  isMandatory?: boolean;
  course: { id: string; title: string; estimatedMinutes: number; category?: string | null };
}

export interface CourseDetail {
  id: string;
  title: string;
  description: string;
  isMandatory: boolean;
  estimatedMinutes: number;
  modules: Array<{
    id: string;
    title: string;
    contentType: string;
    contentUrl?: string | null;
    scormEntryPointHtml?: string | null;
    richTextContent?: string | null;
    passingScorePercentage?: number | null;
  }>;
}

export interface QuestionItem {
  id: string;
  questionText: string;
  options: { id: string; optionText: string }[];
}

export const api = axios.create({ baseURL: API_BASE, timeout: 15_000 });

export function getApiError(err: unknown): string {
  if (err instanceof AxiosError) {
    if (!err.response) {
      return 'Cannot reach API server. Start it with: cd apps/api && npm run dev';
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
  const token = localStorage.getItem('lms_learner_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      const url = err.config?.url ?? '';
      if (!url.includes('/auth/login')) {
        const hadToken = !!localStorage.getItem('lms_learner_token');
        logout();
        if (hadToken && !url.includes('/auth/me')) {
          window.location.assign('/app/');
        }
      }
    }
    return Promise.reject(err);
  },
);

export async function login(email: string) {
  const { data } = await api.post<ApiResponse<{ accessToken: string; user: { role: string; fullName: string } }>>(
    '/api/v1/auth/login',
    { email },
  );
  if (data.data?.accessToken) {
    localStorage.setItem('lms_learner_token', data.data.accessToken);
  }
  return data.data;
}

export function logout() {
  localStorage.removeItem('lms_learner_token');
}

export async function getAssignedEnrollments() {
  const { data } = await api.get<ApiResponse<EnrollmentItem[]>>('/api/v1/enrollments/assigned');
  return data.data ?? [];
}

export async function getEnrollments() {
  const { data } = await api.get<ApiResponse<EnrollmentItem[]>>('/api/v1/enrollments');
  return data.data ?? [];
}

export async function getCourse(id: string) {
  const { data } = await api.get<ApiResponse<CourseDetail>>(`/api/v1/courses/${id}`);
  return data.data!;
}

export async function getModuleQuestions(moduleId: string) {
  const { data } = await api.get<ApiResponse<QuestionItem[]>>(`/api/v1/modules/${moduleId}/questions`);
  return data.data ?? [];
}

export async function submitAssessment(
  enrollmentId: string,
  moduleId: string,
  answers: Record<string, string>,
) {
  const { data } = await api.post<ApiResponse<{ score: number; isPassed: boolean; progress?: { progressPercentage: number; status: string } }>>(
    '/api/v1/assessments/submit',
    { enrollmentId, moduleId, answers },
  );
  return data.data!;
}

export async function getCurrentUser() {
  const { data } = await api.get<ApiResponse<{ id: string; fullName: string; email: string; role: string }>>('/api/v1/auth/me');
  return data.data;
}

export async function getLearnerStats() {
  const { data } = await api.get<ApiResponse<{
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
    notStarted: number;
    complianceRate: number;
  }>>('/api/v1/progress/stats');
  return data.data!;
}

export async function getEnrollmentProgress(enrollmentId: string) {
  const { data } = await api.get<ApiResponse<{
    enrollmentId: string;
    courseId: string;
    status: string;
    progressPercentage: number;
    completedModuleIds: string[];
    modules: Array<{ id: string; title: string; order: number; contentType: string; completed: boolean }>;
  }>>(`/api/v1/progress/enrollment/${enrollmentId}`);
  return data.data!;
}

export async function completeModule(enrollmentId: string, moduleId: string) {
  const res = await api.post<ApiResponse<{
    progressPercentage: number;
    status: string;
    isComplete: boolean;
  }>>('/api/v1/progress/complete-module', { enrollmentId, moduleId });
  return res.data.data!;
}
