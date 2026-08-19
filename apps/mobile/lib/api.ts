import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ApiResponse, SyncQueueItem } from '@lms/shared';

const TOKEN_KEY = 'lms_learner_token';

function getApiBase(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
  return 'http://localhost:3000';
}

export const API_BASE = getApiBase();

/** Phone cannot open localhost — rewrite media URLs to the Mac LAN host from EXPO_PUBLIC_API_URL. */
export function toDeviceMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const api = new URL(API_BASE);
    return url
      .replace(/https?:\/\/localhost(?=:\d+|\/|$)/gi, `${api.protocol}//${api.hostname}`)
      .replace(/https?:\/\/127\.0\.0\.1(?=:\d+|\/|$)/gi, `${api.protocol}//${api.hostname}`);
  } catch {
    return url;
  }
}

let authToken: string | null = null;
type AuthListener = (authenticated: boolean) => void;
const authListeners = new Set<AuthListener>();

export function onAuthChange(listener: AuthListener) {
  authListeners.add(listener);
  return () => {
    authListeners.delete(listener);
  };
}

function notifyAuth() {
  for (const listener of authListeners) listener(!!authToken);
}

export async function loadStoredToken(): Promise<string | null> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  authToken = token;
  notifyAuth();
  return token;
}

export function setAuthToken(token: string) {
  authToken = token;
  AsyncStorage.setItem(TOKEN_KEY, token).catch(() => {});
  notifyAuth();
}

export async function clearAuthToken() {
  authToken = null;
  await AsyncStorage.removeItem(TOKEN_KEY);
  notifyAuth();
}

export function isAuthenticated() {
  return !!authToken;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') {
      throw new Error(`API timed out at ${API_BASE}. Is the Mac API running on the same Wi‑Fi?`);
    }
    throw new Error(`Cannot reach API at ${API_BASE}. Is the Mac API running on the same Wi‑Fi?`);
  } finally {
    clearTimeout(timeout);
  }

  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success) {
    throw new Error(json.message || `Request failed (${res.status})`);
  }
  return json.data as T;
}

export async function login(email: string) {
  const data = await request<{
    accessToken: string;
    user: { id: string; fullName: string; role: string };
  }>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
  setAuthToken(data.accessToken);
  return data;
}

export async function logout() {
  await clearAuthToken();
}

export type EnrollmentRow = {
  id: string;
  status: string;
  progressPercentage: number;
  dueDate: string | null;
  completedAt: string | null;
  expiresAt?: string | null;
  videoCompleted?: boolean;
  quizPassed?: boolean;
  isMandatory: boolean;
  completionScore?: number | null;
  scormScore?: number | null;
  completionPoints?: number | null;
  training: {
    id: string;
    title: string;
    description?: string;
    type: string;
    estimatedMinutes: number;
  };
};

/** Assigned trainings for the logged-in learner */
export async function getAssignedEnrollments() {
  return request<EnrollmentRow[]>('/api/v1/enrollments/assigned');
}

export async function getEnrollments() {
  return getAssignedEnrollments();
}

export async function getCurrentUser() {
  return request<{
    id: string;
    email: string;
    fullName: string;
    role: string;
    learningPoints?: number;
    department?: { id: string; name: string } | null;
    company?: { id: string; name: string } | null;
  }>('/api/v1/auth/me');
}

export async function getMyCertificates() {
  return request<
    {
      id: string;
      certificateNumber: string;
      type: string;
      score: number | null;
      issuedAt: string;
      pdfUrl: string | null;
      training: { title: string };
    }[]
  >('/api/v1/certificates/my');
}

export async function getLeaderboard(view: 'organization' | 'department' = 'organization') {
  return request<{
    view: string;
    lowestRank: number;
    me: {
      rank: number;
      userId: string;
      email: string;
      fullName: string;
      department: string;
      learningPoints: number;
    } | null;
    nearbyEntries: {
      rank: number;
      userId: string;
      email: string;
      fullName: string;
      department: string;
      learningPoints: number;
      isCurrentUser?: boolean;
    }[];
    entries: {
      rank: number;
      userId: string;
      email: string;
      fullName: string;
      department: string;
      learningPoints: number;
      isCurrentUser?: boolean;
    }[];
  }>('/api/v1/leaderboard?' + new URLSearchParams({ view, sortBy: 'learningPoints' }));
}

export async function getRecognitionProfile() {
  return request<{
    fullName: string;
    learningPoints: number;
    trainingsCompleted: number;
    currentStreak: number;
    badges: { code: string; name: string; description: string; icon: string; earnedAt: string }[];
  }>('/api/v1/recognition/my');
}

export async function getLearnerNotifications() {
  return request<
    { id: string; title: string; body: string; isRead: boolean; createdAt: string }[]
  >('/api/v1/notifications/my');
}

export async function markNotificationRead(id: string) {
  return request(`/api/v1/notifications/${id}/read`, { method: 'POST' });
}

export async function saveScormProgress(body: {
  enrollmentId: string;
  score?: number;
  status?: string;
  cmiData?: Record<string, unknown>;
  timeSpentSec?: number;
  moduleId?: string;
}) {
  return request('/api/v1/trainings/progress/scorm', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** Course library = assigned trainings (learner view) */
export async function getCourses(_tag?: string) {
  const rows = await getAssignedEnrollments();
  return rows.map((e) => ({
    id: e.training.id,
    title: e.training.title,
    description: e.training.description ?? '',
    isMandatory: e.isMandatory,
    estimatedMinutes: e.training.estimatedMinutes,
    tags: e.training.type ? [e.training.type] : [],
    enrollmentId: e.id,
    status: e.status,
  }));
}

export async function getCourseTags() {
  const courses = await getCourses();
  return Array.from(new Set(courses.flatMap((c) => c.tags)));
}

export type LearnerModule = {
  id: string;
  title: string;
  moduleType: string;
  contentType: string;
  contentUrl: string | null;
  scormEntryPointHtml: string | null;
  richTextContent: string | null;
  videoUrl: string | null;
  fileUrl: string | null;
  scormContentUrl: string | null;
  scormEntryPoint: string | null;
  externalUrl?: string | null;
  passingScorePercentage: number | null;
};

export type LearnerCourse = {
  id: string;
  title: string;
  description: string;
  type: string;
  estimatedMinutes: number;
  isMandatory: boolean;
  enrollmentId: string;
  progressPercentage: number;
  status: string;
  videoCompleted: boolean;
  quizPassed: boolean;
  expiresAt: string | null;
  completedModuleIds: string[];
  passingScorePercentage: number;
  questions: {
    id: string;
    questionText: string;
    questionType: string;
    points: number;
    options: { id: string; optionText: string }[];
  }[];
  modules: LearnerModule[];
};

export async function getCourse(trainingId: string): Promise<LearnerCourse> {
  const data = await request<{
    enrollment: {
      id: string;
      status: string;
      progressPercentage: number;
      videoCompleted?: boolean;
      quizPassed?: boolean;
      expiresAt?: string | null;
      moduleProgress?: { moduleId: string; isCompleted: boolean }[];
    };
    training: {
      id: string;
      title: string;
      description: string;
      type: string;
      videoUrl: string | null;
      scormContentUrl: string | null;
      scormEntryPoint: string | null;
      estimatedMinutes?: number;
      passingScorePercentage: number;
      modules: {
        id: string;
        title: string;
        moduleType: string;
        richTextContent: string | null;
        externalUrl: string | null;
        videoUrl: string | null;
        fileUrl: string | null;
        scormContentUrl: string | null;
        scormEntryPoint: string | null;
      }[];
      questions: {
        id: string;
        questionText: string;
        questionType: string;
        points: number;
        options: { id: string; optionText: string }[];
      }[];
    };
  }>(`/api/v1/trainings/${trainingId}/learn`);

  const t = data.training;
  const pass = t.passingScorePercentage ?? 70;
  const completedModuleIds = (data.enrollment.moduleProgress ?? [])
    .filter((p) => p.isCompleted)
    .map((p) => p.moduleId);

  let modules: LearnerModule[] = (t.modules ?? []).map((m) => ({
    id: m.id,
    title: m.title,
    moduleType: m.moduleType,
    contentType: mapModuleType(m.moduleType),
    contentUrl: toDeviceMediaUrl(m.videoUrl || m.scormContentUrl || m.fileUrl || m.externalUrl),
    scormEntryPointHtml: m.scormEntryPoint,
    richTextContent: m.richTextContent,
    videoUrl: toDeviceMediaUrl(m.videoUrl),
    fileUrl: toDeviceMediaUrl(m.fileUrl),
    scormContentUrl: toDeviceMediaUrl(m.scormContentUrl),
    scormEntryPoint: m.scormEntryPoint,
    externalUrl: m.externalUrl,
    passingScorePercentage: pass,
  }));

  // VIDEO_QUIZ / SCORM trainings may have no TrainingModule rows — synthesize playable steps
  if (modules.length === 0) {
    if (t.videoUrl) {
      modules.push({
        id: `video-${t.id}`,
        title: 'Watch video',
        moduleType: 'VIDEO',
        contentType: 'VIDEO_MP4',
        contentUrl: toDeviceMediaUrl(t.videoUrl),
        scormEntryPointHtml: null,
        richTextContent: null,
        videoUrl: toDeviceMediaUrl(t.videoUrl),
        fileUrl: null,
        scormContentUrl: null,
        scormEntryPoint: null,
        externalUrl: null,
        passingScorePercentage: pass,
      });
    }
    if (t.questions?.length) {
      modules.push({
        id: `quiz-${t.id}`,
        title: 'Knowledge check',
        moduleType: 'QUIZ',
        contentType: 'QUIZ_EXCEL',
        contentUrl: null,
        scormEntryPointHtml: null,
        richTextContent: null,
        videoUrl: null,
        fileUrl: null,
        scormContentUrl: null,
        scormEntryPoint: null,
        externalUrl: null,
        passingScorePercentage: pass,
      });
    }
    if (t.scormContentUrl) {
      modules.push({
        id: `scorm-${t.id}`,
        title: 'SCORM module',
        moduleType: 'SCORM',
        contentType: 'SCORM_ZIP',
        contentUrl: toDeviceMediaUrl(t.scormContentUrl),
        scormEntryPointHtml: t.scormEntryPoint,
        richTextContent: null,
        videoUrl: null,
        fileUrl: null,
        scormContentUrl: toDeviceMediaUrl(t.scormContentUrl),
        scormEntryPoint: t.scormEntryPoint,
        externalUrl: null,
        passingScorePercentage: pass,
      });
    }
  }

  return {
    id: t.id,
    title: t.title,
    description: t.description,
    type: t.type,
    estimatedMinutes: t.estimatedMinutes ?? 15,
    isMandatory: false,
    enrollmentId: data.enrollment.id,
    progressPercentage: data.enrollment.progressPercentage,
    status: data.enrollment.status,
    videoCompleted: !!data.enrollment.videoCompleted,
    quizPassed: !!data.enrollment.quizPassed,
    expiresAt: data.enrollment.expiresAt ?? null,
    completedModuleIds,
    passingScorePercentage: pass,
    questions: t.questions ?? [],
    modules,
  };
}

function mapModuleType(moduleType: string): string {
  switch (moduleType) {
    case 'VIDEO':
      return 'VIDEO_MP4';
    case 'QUIZ':
      return 'QUIZ_EXCEL';
    case 'SCORM':
      return 'SCORM_ZIP';
    case 'PDF':
      return 'PDF_POLICY';
    case 'RICH_TEXT':
      return 'RICH_TEXT';
    case 'EXTERNAL':
      return 'EXTERNAL';
    default:
      return moduleType;
  }
}

export async function getModuleQuestions(trainingId: string, _moduleId?: string) {
  const course = await getCourse(trainingId);
  return course.questions.map((q) => ({
    id: q.id,
    questionText: q.questionText,
    questionType: q.questionType,
    points: q.points,
    options: q.options,
  }));
}

export async function submitAssessment(
  enrollmentId: string,
  moduleId: string | undefined,
  answers: Record<string, string>,
) {
  return request<{ score: number; isPassed: boolean }>('/api/v1/trainings/progress/quiz-submit', {
    method: 'POST',
    body: JSON.stringify({
      enrollmentId,
      moduleId: moduleId?.startsWith('quiz-') ? undefined : moduleId,
      answers,
    }),
  });
}

export async function startTraining(enrollmentId: string) {
  return request('/api/v1/trainings/progress/training-start', {
    method: 'POST',
    body: JSON.stringify({ enrollmentId }),
  });
}

export async function markVideoComplete(enrollmentId: string) {
  return request('/api/v1/trainings/progress/video-complete', {
    method: 'POST',
    body: JSON.stringify({ enrollmentId }),
  });
}

export async function completeModule(
  enrollmentId: string,
  moduleId: string,
  signatureText?: string,
) {
  return request('/api/v1/trainings/progress/module-complete', {
    method: 'POST',
    body: JSON.stringify({ enrollmentId, moduleId, signatureText }),
  });
}

export async function syncQueue(items: SyncQueueItem[]) {
  // ponytail: no dedicated sync API yet — no-op success so offline queue UI still works
  void items;
  return { synced: 0 };
}
