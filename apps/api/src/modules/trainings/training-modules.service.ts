import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ModuleCompletionRule,
  TrainingModuleType,
  TrainingType,
  EnrollmentStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CertificatesService } from '../certificates/certificates.service';
import { RecognitionService } from '../recognition/recognition.service';

export interface CreateModuleDto {
  title: string;
  moduleType: TrainingModuleType;
  isRequired?: boolean;
  completionRule?: ModuleCompletionRule;
  contentAssetId?: string;
  richTextContent?: string;
  externalUrl?: string;
  order?: number;
}

@Injectable()
export class TrainingModulesService {
  constructor(
    private prisma: PrismaService,
    private certificatesService: CertificatesService,
    private recognitionService: RecognitionService,
  ) {}

  async list(trainingId: string) {
    return this.prisma.trainingModule.findMany({
      where: { trainingId },
      include: { contentAsset: true },
      orderBy: { order: 'asc' },
    });
  }

  async create(trainingId: string, dto: CreateModuleDto) {
    const training = await this.prisma.training.findUnique({ where: { id: trainingId } });
    if (!training) throw new NotFoundException('Training not found');

    const count = await this.prisma.trainingModule.count({ where: { trainingId } });
    const completionRule = dto.completionRule ?? this.defaultRule(dto.moduleType);

    const module = await this.prisma.trainingModule.create({
      data: {
        trainingId,
        title: dto.title.trim(),
        moduleType: dto.moduleType,
        order: dto.order ?? count,
        isRequired: dto.isRequired ?? true,
        completionRule,
        contentAssetId: dto.contentAssetId,
        richTextContent: dto.richTextContent,
        externalUrl: dto.externalUrl,
      },
      include: { contentAsset: true },
    });

    if (training.type !== TrainingType.MODULAR) {
      await this.prisma.training.update({
        where: { id: trainingId },
        data: { type: TrainingType.MODULAR },
      });
    }

    return module;
  }

  async update(moduleId: string, dto: Partial<CreateModuleDto>) {
    const mod = await this.prisma.trainingModule.findUnique({ where: { id: moduleId } });
    if (!mod) throw new NotFoundException('Module not found');
    return this.prisma.trainingModule.update({
      where: { id: moduleId },
      data: {
        title: dto.title?.trim(),
        moduleType: dto.moduleType,
        isRequired: dto.isRequired,
        completionRule: dto.completionRule,
        contentAssetId: dto.contentAssetId,
        richTextContent: dto.richTextContent,
        externalUrl: dto.externalUrl,
        order: dto.order,
      },
      include: { contentAsset: true },
    });
  }

  async reorder(trainingId: string, moduleIds: string[]) {
    await this.prisma.$transaction(
      moduleIds.map((id, index) =>
        this.prisma.trainingModule.update({ where: { id, trainingId }, data: { order: index } }),
      ),
    );
    return this.list(trainingId);
  }

  async delete(moduleId: string) {
    await this.prisma.trainingModule.delete({ where: { id: moduleId } });
    return { deleted: true };
  }

  async getModuleProgress(enrollmentId: string) {
    return this.prisma.moduleProgress.findMany({
      where: { enrollmentId },
      include: { module: true },
    });
  }

  async completeModule(
    enrollmentId: string,
    moduleId: string,
    userId: string,
    meta?: { ipAddress?: string; userAgent?: string; signatureText?: string },
  ) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, userId },
      include: { training: { include: { modules: { orderBy: { order: 'asc' } } } } },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    if (!enrollment.startedAt) {
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

    const mod = enrollment.training.modules.find((m) => m.id === moduleId);
    if (!mod) throw new NotFoundException('Module not found');

    if (mod.completionRule === ModuleCompletionRule.ACKNOWLEDGE) {
      await this.prisma.policyAcknowledgment.upsert({
        where: { enrollmentId_moduleId: { enrollmentId, moduleId } },
        create: {
          enrollmentId,
          moduleId,
          userId,
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
          signatureText: meta?.signatureText,
          documentVersion: mod.contentAssetId ?? mod.id,
        },
        update: {
          acknowledgedAt: new Date(),
          signatureText: meta?.signatureText,
        },
      });
    }

    await this.prisma.moduleProgress.upsert({
      where: { enrollmentId_moduleId: { enrollmentId, moduleId } },
      create: { enrollmentId, moduleId, isCompleted: true, completedAt: new Date() },
      update: { isCompleted: true, completedAt: new Date() },
    });

    return this.recalculateEnrollmentProgress(enrollmentId, userId);
  }

  async recalculateEnrollmentProgress(enrollmentId: string, userId?: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { training: { include: { modules: true } } },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    const modules = enrollment.training.modules;
    if (modules.length === 0) return enrollment;

    const required = modules.filter((m) => m.isRequired);
    const progress = await this.prisma.moduleProgress.findMany({ where: { enrollmentId } });
    const completedRequired = required.filter((m) =>
      progress.some((p) => p.moduleId === m.id && p.isCompleted),
    ).length;

    const pct = required.length > 0 ? Math.round((completedRequired / required.length) * 100) : 100;
    const allDone = completedRequired === required.length;

    const updateData: {
      progressPercentage: number;
      status: EnrollmentStatus;
      completedAt?: Date;
      expiresAt?: Date | null;
    } = {
      progressPercentage: pct,
      status: allDone ? EnrollmentStatus.COMPLETED : EnrollmentStatus.IN_PROGRESS,
    };

    const wasCompleted = !!enrollment.completedAt;

    if (allDone && !wasCompleted) {
      updateData.completedAt = new Date();
      if (enrollment.training.certificationValidDays) {
        const expires = new Date();
        expires.setDate(expires.getDate() + enrollment.training.certificationValidDays);
        updateData.expiresAt = expires;
      }
    }

    const updated = await this.prisma.enrollment.update({ where: { id: enrollmentId }, data: updateData });

    if (allDone && !wasCompleted && userId) {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'TRAINING_COMPLETED',
          resource: `training:${enrollment.trainingId}`,
          metadataJson: { enrollmentId, type: TrainingType.MODULAR },
        },
      });
      await this.recognitionService.onTrainingCompleted(enrollmentId);
      await this.certificatesService.issueForEnrollment(enrollmentId);
    }

    return updated;
  }

  private defaultRule(type: TrainingModuleType): ModuleCompletionRule {
    switch (type) {
      case TrainingModuleType.QUIZ:
        return ModuleCompletionRule.PASS_QUIZ;
      case TrainingModuleType.PDF:
        return ModuleCompletionRule.ACKNOWLEDGE;
      case TrainingModuleType.SCORM:
        return ModuleCompletionRule.SCORM_COMPLETE;
      case TrainingModuleType.EXTERNAL:
        return ModuleCompletionRule.EXTERNAL_COMPLETE;
      default:
        return ModuleCompletionRule.VIEW;
    }
  }
}
