export enum UserRole {
  LEARNER = 'LEARNER',
  LMS_ADMIN = 'LMS_ADMIN',
  LINE_MANAGER = 'LINE_MANAGER',
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
}

export enum ModuleContentType {
  VIDEO_MP4 = 'VIDEO_MP4',
  QUIZ_EXCEL = 'QUIZ_EXCEL',
  SCORM_ZIP = 'SCORM_ZIP',
  DOCUMENT_PDF = 'DOCUMENT_PDF',
  RICH_TEXT = 'RICH_TEXT',
  PDF_POLICY = 'PDF_POLICY',
}

export enum QuestionType {
  SINGLE_CHOICE = 'SINGLE_CHOICE',
  MULTI_CHOICE = 'MULTI_CHOICE',
  SCENARIO = 'SCENARIO',
  ROLE_PLAY = 'ROLE_PLAY',
  HANDS_ON = 'HANDS_ON',
}

export enum SubmissionStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  GRADED = 'GRADED',
  AUTO_PASSED = 'AUTO_PASSED',
  REJECTED = 'REJECTED',
}

export enum EnrollmentStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
}

export enum AssignmentTargetType {
  USER = 'USER',
  DEPARTMENT = 'DEPARTMENT',
  GROUP = 'GROUP',
  ALL = 'ALL',
}

export enum UploadJobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum UploadJobType {
  VIDEO = 'VIDEO',
  QUIZ_EXCEL = 'QUIZ_EXCEL',
  SCORM = 'SCORM',
  PDF = 'PDF',
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface MultipartInitResult {
  uploadSessionId: string;
  uploadKey: string;
  partSize: number;
  totalParts: number;
}

export interface MultipartPartUrl {
  partNumber: number;
  presignedUrl: string;
}

export interface QuizImportResult {
  imported: number;
  errors: string[];
}

export interface ScormUnpackResult {
  moduleId: string;
  scormEntryPointHtml: string;
  contentUrl: string;
  scormVersion: string;
}

export interface SyncQueueItem {
  type: 'ASSESSMENT_SUBMIT' | 'POLICY_ACK' | 'PROGRESS_UPDATE';
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface CourseSummary {
  id: string;
  title: string;
  description: string;
  category: string | null;
  isMandatory: boolean;
  estimatedMinutes: number;
  tags: string[];
}

export interface ModuleSummary {
  id: string;
  courseId: string;
  order: number;
  title: string;
  contentType: ModuleContentType;
  contentUrl: string | null;
  scormEntryPointHtml: string | null;
  richTextContent: string | null;
  passingScorePercentage: number | null;
  maxRetries: number | null;
}

export interface TrainingAssignmentDto {
  id: string;
  courseId: string;
  targetType: AssignmentTargetType;
  targetId: string | null;
  dueDate: string | null;
  relativeDueDays: number | null;
  isMandatory: boolean;
  passingScorePercentage: number;
  maxRetries: number | null;
  autoRemindDaysBefore: number | null;
}

export interface AnalyticsOverview {
  totalEnrollments: number;
  completedCount: number;
  overdueCount: number;
  complianceRate: number;
  departmentBreakdown: { department: string; completed: number; total: number }[];
}

export const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi'] as const;
export const MAX_VIDEO_SIZE_BYTES = 1024 * 1024 * 1024; // 1GB
export const MULTIPART_CHUNK_SIZE = 10 * 1024 * 1024; // 10MB
