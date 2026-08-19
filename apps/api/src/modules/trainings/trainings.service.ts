import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EnrollmentStatus, TrainingType, QuestionType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { CertificatesService } from '../certificates/certificates.service';
import { RecognitionService } from '../recognition/recognition.service';
import { TrainingModulesService } from './training-modules.service';

export interface CreateTrainingDto {
  title: string;
  description?: string;
  type: TrainingType;
  passingScorePercentage?: number;
  maxRetries?: number;
  estimatedMinutes?: number;
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | null;
  category?: string | null;
  language?: string;
  thumbnailUrl?: string | null;
  tags?: string[];
  version?: string;
  expiresAt?: string | null;
  certificateEnabled?: boolean;
  certificateType?: 'COMPLETION_PASS' | 'PARTICIPATION';
  participationCertEnabled?: boolean;
  certificateMinScore?: number;
  leaderboardEnabled?: boolean;
  leaderboardVisibleToLearners?: boolean;
  reminderSchedule?: string;
  notificationChannels?: string;
  notifyPending?: boolean;
  notifyOverdue?: boolean;
  certificationValidDays?: number | null;
}

export interface CreateQuestionDto {
  questionText: string;
  questionType?: QuestionType;
  points?: number;
  explanation?: string;
  scenarioContext?: string;
  mediaUrl?: string;
  interactionJson?: Record<string, unknown>;
  assignmentJson?: Record<string, unknown>;
  options?: { optionText: string; isCorrect: boolean; feedback?: string }[];
}

@Injectable()
export class TrainingsService {
  constructor(
    private prisma: PrismaService,
    private certificatesService: CertificatesService,
    private recognitionService: RecognitionService,
    private trainingModulesService: TrainingModulesService,
  ) {}

  async list(publishedOnly = false, companyId?: string) {
    const trainings = await this.prisma.training.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        ...(publishedOnly ? { publishedAt: { not: null } } : {}),
      },
      include: {
        _count: { select: { questions: true, enrollments: true } },
        createdBy: { select: { fullName: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return trainings.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      type: t.type,
      videoUrl: t.videoUrl,
      scormContentUrl: t.scormContentUrl,
      scormVersion: t.scormVersion,
      difficulty: t.difficulty,
      category: t.category,
      language: t.language,
      thumbnailUrl: t.thumbnailUrl,
      tags: t.tags,
      version: t.version,
      expiresAt: t.expiresAt,
      passingScorePercentage: t.passingScorePercentage,
      maxRetries: t.maxRetries,
      estimatedMinutes: t.estimatedMinutes,
      certificateEnabled: t.certificateEnabled,
      certificateType: t.certificateType,
      certificationValidDays: t.certificationValidDays,
      publishedAt: t.publishedAt,
      questionCount: t._count.questions,
      enrollmentCount: t._count.enrollments,
      hasVideo: !!t.videoUrl,
      hasScorm: !!t.scormContentUrl,
      createdBy: t.createdBy?.fullName,
      createdAt: t.createdAt,
    }));
  }

  async getById(id: string) {
    const training = await this.prisma.training.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: { options: { orderBy: { order: 'asc' } } },
        },
        _count: { select: { enrollments: true } },
      },
    });
    if (!training) throw new NotFoundException('Training not found');
    return training;
  }

  async listEnrollmentsForTraining(trainingId: string) {
    await this.getById(trainingId);
    const enrollments = await this.prisma.enrollment.findMany({
      where: { trainingId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            department: { select: { name: true } },
          },
        },
        assignment: { select: { id: true, isMandatory: true, passingScorePercentage: true } },
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    });

    return enrollments.map((e) => ({
      id: e.id,
      status: e.status,
      progressPercentage: e.progressPercentage,
      completionScore: e.completionScore,
      quizPassed: e.quizPassed,
      videoCompleted: e.videoCompleted,
      dueDate: e.dueDate,
      assignedAt: e.assignedAt,
      completedAt: e.completedAt,
      startedAt: e.startedAt,
      user: {
        id: e.user.id,
        fullName: e.user.fullName,
        email: e.user.email,
        department: e.user.department?.name ?? 'Unassigned',
      },
      assignment: e.assignment,
    }));
  }

  async create(dto: CreateTrainingDto, user: AuthUser, companyId: string) {
    if (!dto.title?.trim()) throw new BadRequestException('Training name is required');
    if (!['VIDEO_QUIZ', 'SCORM', 'MODULAR'].includes(dto.type)) {
      throw new BadRequestException('Type must be VIDEO_QUIZ, SCORM, or MODULAR');
    }

    return this.prisma.training.create({
      data: {
        title: dto.title.trim(),
        description: dto.description ?? '',
        type: dto.type,
        companyId,
        passingScorePercentage: dto.passingScorePercentage ?? 70,
        maxRetries: dto.maxRetries,
        estimatedMinutes: dto.estimatedMinutes ?? 15,
        difficulty: dto.difficulty ?? null,
        category: dto.category?.trim() || null,
        language: dto.language?.trim() || 'en',
        thumbnailUrl: dto.thumbnailUrl?.trim() || null,
        tags: dto.tags ?? [],
        version: dto.version?.trim() || '1.0',
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        certificateEnabled: dto.certificateEnabled ?? true,
        certificateType: dto.certificateType,
        participationCertEnabled: dto.participationCertEnabled,
        certificateMinScore: dto.certificateMinScore,
        certificationValidDays: dto.certificationValidDays,
        createdById: user.id,
      },
    });
  }

  async update(id: string, dto: Partial<CreateTrainingDto>) {
    await this.getById(id);
    return this.prisma.training.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        description: dto.description,
        passingScorePercentage: dto.passingScorePercentage,
        maxRetries: dto.maxRetries,
        estimatedMinutes: dto.estimatedMinutes,
        difficulty: dto.difficulty === undefined ? undefined : dto.difficulty,
        category: dto.category === undefined ? undefined : dto.category?.trim() || null,
        language: dto.language?.trim(),
        thumbnailUrl: dto.thumbnailUrl === undefined ? undefined : dto.thumbnailUrl?.trim() || null,
        tags: dto.tags,
        version: dto.version?.trim(),
        expiresAt:
          dto.expiresAt === undefined
            ? undefined
            : dto.expiresAt
              ? new Date(dto.expiresAt)
              : null,
        certificateEnabled: dto.certificateEnabled,
        certificateType: dto.certificateType,
        participationCertEnabled: dto.participationCertEnabled,
        certificateMinScore: dto.certificateMinScore,
        leaderboardEnabled: dto.leaderboardEnabled,
        leaderboardVisibleToLearners: dto.leaderboardVisibleToLearners,
        reminderSchedule: dto.reminderSchedule,
        notificationChannels: dto.notificationChannels,
        notifyPending: dto.notifyPending,
        notifyOverdue: dto.notifyOverdue,
        certificationValidDays:
          dto.certificationValidDays === undefined ? undefined : dto.certificationValidDays,
      },
    });
  }

  async publish(id: string) {
    const training = await this.prisma.training.findUnique({
      where: { id },
      include: { questions: true, modules: true },
    });
    if (!training) throw new NotFoundException('Training not found');

    if (training.type === TrainingType.MODULAR) {
      if (training.modules.length === 0) {
        throw new BadRequestException('Add at least one module before publishing');
      }
    } else if (training.type === TrainingType.VIDEO_QUIZ) {
      if (!training.videoUrl) throw new BadRequestException('Upload a video before publishing');
      if (training.questions.length === 0) {
        throw new BadRequestException('Add at least one quiz question before publishing');
      }
    } else if (training.type === TrainingType.SCORM && !training.scormContentUrl) {
      throw new BadRequestException('Upload a SCORM package before publishing');
    }

    return this.prisma.training.update({
      where: { id },
      data: { publishedAt: new Date() },
    });
  }

  async delete(id: string) {
    await this.getById(id);
    await this.prisma.training.delete({ where: { id } });
    return { deleted: true };
  }

  async setVideoUrl(id: string, videoUrl: string) {
    const training = await this.getById(id);
    if (training.type !== TrainingType.VIDEO_QUIZ) {
      throw new BadRequestException('Video upload only for Video + Quiz trainings');
    }
    return this.prisma.training.update({ where: { id }, data: { videoUrl } });
  }

  async setScormContent(
    id: string,
    data: { scormContentUrl: string; scormEntryPoint: string; scormVersion: string },
  ) {
    const training = await this.getById(id);
    if (training.type !== TrainingType.SCORM) {
      throw new BadRequestException('SCORM upload only for SCORM trainings');
    }
    return this.prisma.training.update({
      where: { id },
      data: {
        scormContentUrl: data.scormContentUrl,
        scormEntryPoint: data.scormEntryPoint,
        scormVersion: data.scormVersion,
      },
    });
  }

  async listQuestions(trainingId: string) {
    return this.prisma.question.findMany({
      where: { trainingId },
      orderBy: { order: 'asc' },
      include: { options: { orderBy: { order: 'asc' } } },
    });
  }

  async addQuestion(trainingId: string, dto: CreateQuestionDto) {
    const training = await this.getById(trainingId);
    if (training.type !== TrainingType.VIDEO_QUIZ) {
      throw new BadRequestException('Questions only for Video + Quiz trainings');
    }

    const questionType = dto.questionType ?? QuestionType.SINGLE_CHOICE;

    if (questionType === QuestionType.HANDS_ON) {
      if (!dto.assignmentJson) {
        throw new BadRequestException('Hands-on assignments require assignment configuration');
      }
    } else if (!dto.options?.length) {
      throw new BadRequestException('At least one option required');
    } else if (!dto.options.some((o) => o.isCorrect)) {
      throw new BadRequestException('At least one correct option required');
    }

    if (questionType === QuestionType.SCENARIO && !dto.scenarioContext?.trim()) {
      throw new BadRequestException('Scenario questions require a scenario context');
    }

    const count = await this.prisma.question.count({ where: { trainingId } });
    const resolvedType =
      questionType !== QuestionType.SINGLE_CHOICE && questionType !== QuestionType.MULTI_CHOICE
        ? questionType
        : dto.options!.filter((o) => o.isCorrect).length > 1
          ? QuestionType.MULTI_CHOICE
          : QuestionType.SINGLE_CHOICE;

    return this.prisma.question.create({
      data: {
        trainingId,
        questionText: dto.questionText,
        questionType: resolvedType,
        points: dto.points ?? 1,
        explanation: dto.explanation,
        scenarioContext: dto.scenarioContext,
        mediaUrl: dto.mediaUrl,
        interactionJson: dto.interactionJson as Prisma.InputJsonValue,
        assignmentJson: dto.assignmentJson as Prisma.InputJsonValue,
        order: count,
        options: dto.options?.length
          ? {
              create: dto.options.map((o, i) => ({
                optionText: o.optionText,
                isCorrect: o.isCorrect,
                feedback: o.feedback,
                order: i,
              })),
            }
          : undefined,
      },
      include: { options: true },
    });
  }

  async deleteQuestion(trainingId: string, questionId: string) {
    const q = await this.prisma.question.findFirst({ where: { id: questionId, trainingId } });
    if (!q) throw new NotFoundException('Question not found');
    await this.prisma.question.delete({ where: { id: questionId } });
    return { deleted: true };
  }

  async replaceQuestions(trainingId: string, questions: CreateQuestionDto[]) {
    const training = await this.getById(trainingId);
    if (training.type !== TrainingType.VIDEO_QUIZ) {
      throw new BadRequestException('Questions only for Video + Quiz trainings');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.question.deleteMany({ where: { trainingId } });
      for (let i = 0; i < questions.length; i++) {
        const dto = questions[i];
        const questionType = dto.questionType ?? QuestionType.SINGLE_CHOICE;
        const resolvedType =
          questionType !== QuestionType.SINGLE_CHOICE && questionType !== QuestionType.MULTI_CHOICE
            ? questionType
            : dto.options!.filter((o) => o.isCorrect).length > 1
              ? QuestionType.MULTI_CHOICE
              : QuestionType.SINGLE_CHOICE;
        await tx.question.create({
          data: {
            trainingId,
            questionText: dto.questionText,
            questionType: resolvedType,
            points: dto.points ?? 1,
            explanation: dto.explanation,
            scenarioContext: dto.scenarioContext,
            mediaUrl: dto.mediaUrl,
            interactionJson: dto.interactionJson as Prisma.InputJsonValue,
            assignmentJson: dto.assignmentJson as Prisma.InputJsonValue,
            order: i,
            options: dto.options?.length
              ? {
                  create: dto.options.map((o, idx) => ({
                    optionText: o.optionText,
                    isCorrect: o.isCorrect,
                    feedback: o.feedback,
                    order: idx,
                  })),
                }
              : undefined,
          },
        });
      }
    });

    return { imported: questions.length };
  }

  // --- Learner progress ---

  async getLearnerTraining(trainingId: string, user: AuthUser) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_trainingId: { userId: user.id, trainingId } },
      include: {
        training: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
              include: {
                options: {
                  orderBy: { order: 'asc' },
                  select: { id: true, optionText: true, feedback: true },
                },
              },
            },
            modules: {
              orderBy: { order: 'asc' },
              include: { contentAsset: true },
            },
          },
        },
        moduleProgress: true,
        policyAcknowledgments: true,
      },
    });

    if (!enrollment) throw new NotFoundException('Training not assigned to you');

    return {
      enrollment: {
        id: enrollment.id,
        status: enrollment.status,
        progressPercentage: enrollment.progressPercentage,
        videoCompleted: enrollment.videoCompleted,
        quizPassed: enrollment.quizPassed,
        scormScore: enrollment.scormScore,
        scormStatus: enrollment.scormStatus,
        timeSpentSec: enrollment.timeSpentSec,
        startedAt: enrollment.startedAt,
        dueDate: enrollment.dueDate,
        completedAt: enrollment.completedAt,
        completionScore: enrollment.completionScore,
        completionPoints: enrollment.completionPoints,
        expiresAt: enrollment.expiresAt,
        moduleProgress: enrollment.moduleProgress,
        policyAcknowledgments: enrollment.policyAcknowledgments,
      },
      training: {
        id: enrollment.training.id,
        title: enrollment.training.title,
        description: enrollment.training.description,
        type: enrollment.training.type,
        videoUrl: enrollment.training.videoUrl,
        scormContentUrl: enrollment.training.scormContentUrl,
        scormEntryPoint: enrollment.training.scormEntryPoint,
        scormVersion: enrollment.training.scormVersion,
        estimatedMinutes: enrollment.training.estimatedMinutes,
        passingScorePercentage: enrollment.training.passingScorePercentage,
        maxRetries: enrollment.training.maxRetries,
        certificationValidDays: enrollment.training.certificationValidDays,
        modules: enrollment.training.modules.map((m) => ({
          id: m.id,
          title: m.title,
          moduleType: m.moduleType,
          order: m.order,
          isRequired: m.isRequired,
          completionRule: m.completionRule,
          richTextContent: m.richTextContent,
          externalUrl: m.externalUrl ?? m.contentAsset?.externalUrl,
          videoUrl: m.contentAsset?.videoUrl,
          fileUrl: m.contentAsset?.fileUrl,
          scormContentUrl: m.contentAsset?.scormContentUrl,
          scormEntryPoint: m.contentAsset?.scormEntryPoint,
          provider: m.contentAsset?.provider,
        })),
        questions: enrollment.training.questions.map((q) => ({
          id: q.id,
          questionText: q.questionText,
          questionType: q.questionType,
          points: q.points,
          scenarioContext: q.scenarioContext,
          mediaUrl: q.mediaUrl,
          interactionJson: q.interactionJson,
          assignmentJson: q.assignmentJson,
          options: q.options,
        })),
      },
    };
  }

  async markTrainingStarted(enrollmentId: string, user: AuthUser) {
    const enrollment = await this.getEnrollmentForUser(enrollmentId, user.id);
    if (enrollment.startedAt) {
      return { startedAt: enrollment.startedAt, alreadyStarted: true };
    }

    const updated = await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        startedAt: new Date(),
        status:
          enrollment.status === EnrollmentStatus.NOT_STARTED
            ? EnrollmentStatus.IN_PROGRESS
            : enrollment.status,
      },
    });

    return { startedAt: updated.startedAt, alreadyStarted: false };
  }

  private async ensureStarted(enrollmentId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({ where: { id: enrollmentId } });
    if (!enrollment || enrollment.startedAt) return;
    await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        startedAt: new Date(),
        status:
          enrollment.status === EnrollmentStatus.NOT_STARTED
            ? EnrollmentStatus.IN_PROGRESS
            : enrollment.status,
      },
    });
  }

  async markVideoComplete(enrollmentId: string, user: AuthUser) {
    const enrollment = await this.getEnrollmentForUser(enrollmentId, user.id);
    if (enrollment.training.type !== TrainingType.VIDEO_QUIZ) {
      throw new BadRequestException('Not a video training');
    }

    await this.ensureStarted(enrollmentId);

    await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { videoCompleted: true, status: EnrollmentStatus.IN_PROGRESS },
    });

    return this.recalculateProgress(enrollmentId, user.id);
  }

  async submitQuiz(
    enrollmentId: string,
    user: AuthUser,
    answers: Record<string, string | string[]>,
    moduleId?: string,
  ) {
    const enrollment = await this.getEnrollmentForUser(enrollmentId, user.id);
    const training = await this.prisma.training.findUnique({
      where: { id: enrollment.trainingId },
      include: {
        questions: { orderBy: { order: 'asc' }, include: { options: { orderBy: { order: 'asc' } } } },
      },
    });
    if (!training) throw new NotFoundException('Training not found');

    if (training.type !== TrainingType.VIDEO_QUIZ && training.type !== TrainingType.MODULAR) {
      throw new BadRequestException('Not a quiz training');
    }
    if (training.type === TrainingType.VIDEO_QUIZ && !enrollment.videoCompleted) {
      throw new BadRequestException('Complete the video before taking the quiz');
    }

    const maxRetries = training.maxRetries ?? enrollment.assignment?.maxRetries;
    if (maxRetries != null) {
      const attempts = await this.prisma.assessmentAttempt.count({
        where: { enrollmentId, trainingId: training.id },
      });
      if (attempts >= maxRetries) {
        throw new BadRequestException(`Maximum attempts (${maxRetries}) reached`);
      }
    }

    let earned = 0;
    let total = 0;

    for (const q of training.questions) {
      if (q.questionType === QuestionType.HANDS_ON) continue;

      total += q.points;
      const answer = answers[q.id];
      const correctIds = q.options.filter((o) => o.isCorrect).map((o) => o.id);
      if (Array.isArray(answer)) {
        const sorted = [...answer].sort();
        if (JSON.stringify(sorted) === JSON.stringify([...correctIds].sort())) earned += q.points;
      } else if (answer && correctIds.length === 1 && correctIds[0] === answer) {
        earned += q.points;
      } else if (answer && correctIds.length > 1 && correctIds.includes(answer)) {
        earned += Math.round(q.points / correctIds.length);
      }
    }

    const passing =
      enrollment.assignment?.passingScorePercentage ?? training.passingScorePercentage;

    const handsOnQuestions = training.questions.filter((q) => q.questionType === QuestionType.HANDS_ON);
    if (handsOnQuestions.length > 0) {
      const submissions = await this.prisma.assessmentSubmission.findMany({
        where: {
          enrollmentId,
          questionId: { in: handsOnQuestions.map((q) => q.id) },
          status: { in: ['GRADED', 'AUTO_PASSED'] },
        },
      });
      for (const q of handsOnQuestions) {
        total += q.points;
        const sub = submissions.find((s) => s.questionId === q.id);
        if (sub?.status === 'AUTO_PASSED' || (sub?.score != null && sub.score >= passing)) {
          earned += q.points;
        } else if (sub?.score != null) {
          earned += Math.round((sub.score / 100) * q.points);
        }
      }
    }

    const score = total > 0 ? (earned / total) * 100 : 0;
    const isPassed = score >= passing;

    await this.prisma.assessmentAttempt.create({
      data: {
        enrollmentId,
        userId: user.id,
        trainingId: training.id,
        score,
        isPassed,
        answersJson: answers,
      },
    });

    if (isPassed) {
      await this.prisma.enrollment.update({
        where: { id: enrollmentId },
        data: { quizPassed: true },
      });
    }

    if (training.type === TrainingType.MODULAR) {
      if (isPassed && moduleId) {
        await this.trainingModulesService.completeModule(enrollmentId, moduleId, user.id);
      }
      return { score, isPassed, passingScore: passing };
    }

    const progress = await this.recalculateProgress(enrollmentId, user.id);

    return { score, isPassed, passingScore: passing, progress };
  }

  async saveScormProgress(
    enrollmentId: string,
    user: AuthUser,
    data: {
      score?: number;
      status?: string;
      cmiData?: Record<string, unknown>;
      timeSpentSec?: number;
    },
  ) {
    const enrollment = await this.getEnrollmentForUser(enrollmentId, user.id);
    if (
      enrollment.training.type !== TrainingType.SCORM &&
      enrollment.training.type !== TrainingType.MODULAR
    ) {
      throw new BadRequestException('Not a SCORM training');
    }

    const status = data.status ?? 'incomplete';
    const isPassed = ['passed', 'completed'].includes(status.toLowerCase());
    const isFailed = status.toLowerCase() === 'failed';

    const sessions = await this.prisma.scormSession.count({ where: { enrollmentId } });

    await this.prisma.scormSession.create({
      data: {
        enrollmentId,
        score: data.score,
        status,
        cmiData: (data.cmiData ?? {}) as Prisma.InputJsonValue,
        timeSpentSec: data.timeSpentSec ?? 0,
        attempt: sessions + 1,
      },
    });

    if (enrollment.training.type === TrainingType.MODULAR) {
      return { saved: true, isPassed };
    }

    await this.ensureStarted(enrollmentId);

    await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        scormScore: data.score,
        scormStatus: status,
        timeSpentSec: { increment: data.timeSpentSec ?? 0 },
        status: isPassed
          ? EnrollmentStatus.COMPLETED
          : isFailed
            ? EnrollmentStatus.FAILED
            : EnrollmentStatus.IN_PROGRESS,
        progressPercentage: isPassed ? 100 : isFailed ? enrollment.progressPercentage : 50,
        completedAt: isPassed ? enrollment.completedAt ?? new Date() : null,
      },
    });

    return this.recalculateProgress(enrollmentId, user.id);
  }

  private async recalculateProgress(enrollmentId: string, userId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { training: true, assignment: true },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    let progress = 0;
    let status = enrollment.status;
    let completedAt = enrollment.completedAt;

    if (enrollment.training.type === TrainingType.VIDEO_QUIZ) {
      progress = enrollment.videoCompleted ? 50 : 0;
      if (enrollment.quizPassed) progress = 100;
      if (progress === 100) {
        status = EnrollmentStatus.COMPLETED;
        completedAt = completedAt ?? new Date();
      } else if (progress > 0) {
        status = EnrollmentStatus.IN_PROGRESS;
      }
    } else if (enrollment.training.type === TrainingType.SCORM) {
      progress = enrollment.progressPercentage;
      if (enrollment.status === EnrollmentStatus.COMPLETED) progress = 100;
    } else if (enrollment.training.type === TrainingType.MODULAR) {
      return { progressPercentage: enrollment.progressPercentage, status: enrollment.status, isComplete: enrollment.status === EnrollmentStatus.COMPLETED };
    }

    let expiresAt = enrollment.expiresAt;
    if (progress === 100 && !completedAt) {
      completedAt = new Date();
      if (enrollment.training.certificationValidDays) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + enrollment.training.certificationValidDays);
      }
    }

    const updated = await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { progressPercentage: progress, status, completedAt, expiresAt },
    });

    if (updated.status === EnrollmentStatus.COMPLETED && enrollment.completionPoints == null) {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'TRAINING_COMPLETED',
          resource: `training:${enrollment.trainingId}`,
          metadataJson: { enrollmentId, type: enrollment.training.type },
        },
      });
      await this.recognitionService.onTrainingCompleted(enrollmentId);
      await this.certificatesService.issueForEnrollment(enrollmentId);
    }

    return {
      progressPercentage: updated.progressPercentage,
      status: updated.status,
      videoCompleted: updated.videoCompleted,
      quizPassed: updated.quizPassed,
      isComplete: updated.status === EnrollmentStatus.COMPLETED,
    };
  }

  async listAssigned(user: AuthUser) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId: user.id },
      include: {
        training: true,
        assignment: true,
      },
      orderBy: [{ dueDate: 'asc' }, { assignedAt: 'desc' }],
    });

    const now = new Date();
    return enrollments
      .map((e) => ({
        id: e.id,
        status: e.status,
        progressPercentage: e.progressPercentage,
        videoCompleted: e.videoCompleted,
        quizPassed: e.quizPassed,
        scormScore: e.scormScore,
        scormStatus: e.scormStatus,
        dueDate: e.dueDate,
        startedAt: e.startedAt,
        completedAt: e.completedAt,
        timeSpentSec: e.timeSpentSec,
        completionScore: e.completionScore,
        completionPoints: e.completionPoints,
        isMandatory: e.assignment?.isMandatory ?? false,
        training: {
          id: e.training.id,
          title: e.training.title,
          description: e.training.description,
          type: e.training.type,
          estimatedMinutes: e.training.estimatedMinutes,
        },
      }))
      .sort((a, b) => {
        const aOverdue = a.dueDate && new Date(a.dueDate) < now && a.status !== 'COMPLETED';
        const bOverdue = b.dueDate && new Date(b.dueDate) < now && b.status !== 'COMPLETED';
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        return 0;
      });
  }

  private async getEnrollmentForUser(enrollmentId: string, userId: string, withQuestions = false) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        assignment: true,
        training: {
          include: withQuestions
            ? { questions: { include: { options: true }, orderBy: { order: 'asc' } } }
            : undefined,
        },
      },
    });
    if (!enrollment || enrollment.userId !== userId) {
      throw new ForbiddenException('Enrollment not found');
    }
    return enrollment;
  }

  async getLearnerNotifications(userId: string) {
    return this.prisma.learnerNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markNotificationRead(id: string, userId: string) {
    await this.prisma.learnerNotification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    return { read: true };
  }
}
