import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { SubmissionStatus, QuestionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { StorageService } from '../storage/storage.service';

export interface GradeSubmissionDto {
  score: number;
  feedback?: string;
  passed: boolean;
}

@Injectable()
export class AssessmentsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async submitAssignment(
    enrollmentId: string,
    questionId: string,
    user: AuthUser,
    data: { textAnswer?: string; file?: Express.Multer.File },
  ) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { training: true },
    });
    if (!enrollment || enrollment.userId !== user.id) {
      throw new ForbiddenException('Enrollment not found');
    }
    if (!enrollment.videoCompleted) {
      throw new BadRequestException('Complete the video before submitting assignments');
    }

    const question = await this.prisma.question.findFirst({
      where: { id: questionId, trainingId: enrollment.trainingId },
    });
    if (!question || question.questionType !== QuestionType.HANDS_ON) {
      throw new BadRequestException('Not a hands-on assignment question');
    }

    const config = (question.assignmentJson ?? {}) as {
      submissionType?: string;
      autoPassOnSubmit?: boolean;
      minWords?: number;
    };
    const submissionType = config.submissionType ?? 'text';

    if ((submissionType === 'text' || submissionType === 'both') && !data.textAnswer?.trim()) {
      throw new BadRequestException('Text response is required');
    }
    if ((submissionType === 'file' || submissionType === 'both') && !data.file) {
      throw new BadRequestException('File upload is required');
    }
    if (config.minWords && data.textAnswer) {
      const wordCount = data.textAnswer.trim().split(/\s+/).length;
      if (wordCount < config.minWords) {
        throw new BadRequestException(`Response must be at least ${config.minWords} words`);
      }
    }

    let fileUrl: string | undefined;
    if (data.file) {
      const key = `assignments/${enrollmentId}/${questionId}/${data.file.originalname}`;
      await this.storage.uploadBuffer(key, data.file.buffer, data.file.mimetype);
      fileUrl = this.storage.getPublicUrl(key);
    }

    const autoPass = config.autoPassOnSubmit === true;
    const submission = await this.prisma.assessmentSubmission.upsert({
      where: { enrollmentId_questionId: { enrollmentId, questionId } },
      create: {
        enrollmentId,
        questionId,
        userId: user.id,
        textAnswer: data.textAnswer?.trim(),
        fileUrl,
        status: autoPass ? SubmissionStatus.AUTO_PASSED : SubmissionStatus.PENDING_REVIEW,
        score: autoPass ? 100 : null,
        gradedAt: autoPass ? new Date() : null,
      },
      update: {
        textAnswer: data.textAnswer?.trim(),
        fileUrl: fileUrl ?? undefined,
        status: autoPass ? SubmissionStatus.AUTO_PASSED : SubmissionStatus.PENDING_REVIEW,
        score: autoPass ? 100 : null,
        submittedAt: new Date(),
        gradedAt: autoPass ? new Date() : null,
      },
    });

    return { submission, autoPassed: autoPass };
  }

  async listSubmissions(status?: SubmissionStatus) {
    return this.prisma.assessmentSubmission.findMany({
      where: status ? { status } : undefined,
      include: {
        user: { select: { fullName: true, email: true, department: { select: { name: true } } } },
        question: { select: { questionText: true, questionType: true, assignmentJson: true } },
        enrollment: {
          include: { training: { select: { title: true } } },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async gradeSubmission(id: string, dto: GradeSubmissionDto, grader: AuthUser) {
    const submission = await this.prisma.assessmentSubmission.findUnique({
      where: { id },
      include: { enrollment: true },
    });
    if (!submission) throw new NotFoundException('Submission not found');

    const updated = await this.prisma.assessmentSubmission.update({
      where: { id },
      data: {
        score: dto.score,
        feedback: dto.feedback,
        status: dto.passed ? SubmissionStatus.GRADED : SubmissionStatus.REJECTED,
        gradedAt: new Date(),
        gradedById: grader.id,
      },
    });

    return updated;
  }

  async getSubmissionStats() {
    const [pending, graded, autoPassed, rejected] = await Promise.all([
      this.prisma.assessmentSubmission.count({ where: { status: SubmissionStatus.PENDING_REVIEW } }),
      this.prisma.assessmentSubmission.count({ where: { status: SubmissionStatus.GRADED } }),
      this.prisma.assessmentSubmission.count({ where: { status: SubmissionStatus.AUTO_PASSED } }),
      this.prisma.assessmentSubmission.count({ where: { status: SubmissionStatus.REJECTED } }),
    ]);
    return { pending, graded, autoPassed, rejected, total: pending + graded + autoPassed + rejected };
  }
}
