import { z } from 'zod';

export const videoPresignSchema = z.object({
  moduleId: z.string().uuid(),
  fileName: z.string().min(1),
  contentType: z.literal('video/mp4').default('video/mp4'),
});

export const videoCompleteSchema = z.object({
  moduleId: z.string().uuid(),
  uploadKey: z.string().min(1),
  fileName: z.string().min(1),
  fileSizeBytes: z.number().int().positive().optional(),
  durationSeconds: z.number().positive().optional(),
});

export const quizExcelUploadSchema = z.object({
  moduleId: z.string().uuid(),
});

export const scormUploadSchema = z.object({
  moduleId: z.string().uuid(),
});

export const assessmentSubmitSchema = z.object({
  enrollmentId: z.string().uuid(),
  moduleId: z.string().uuid(),
  answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
});

export const syncPayloadSchema = z.object({
  items: z.array(
    z.object({
      type: z.enum(['ASSESSMENT_SUBMIT', 'POLICY_ACK', 'PROGRESS_UPDATE']),
      payload: z.record(z.unknown()),
      createdAt: z.string(),
    }),
  ),
});

export type VideoPresignInput = z.infer<typeof videoPresignSchema>;
export type VideoCompleteInput = z.infer<typeof videoCompleteSchema>;
export type AssessmentSubmitInput = z.infer<typeof assessmentSubmitSchema>;
export type SyncPayloadInput = z.infer<typeof syncPayloadSchema>;
