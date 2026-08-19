import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ContentAssetType,
  ContentProvider,
  ContentLinkRole,
  QuestionType,
  TrainingType,
  TrainingModuleType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { StorageService } from '../storage/storage.service';
import { TrainingModulesService } from '../trainings/training-modules.service';

export interface CreateContentAssetDto {
  title: string;
  description?: string;
  type: ContentAssetType;
  provider?: ContentProvider;
  category?: string;
  tags?: string[];
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | null;
  language?: string;
  thumbnailUrl?: string | null;
  version?: string;
  expiresAt?: string | null;
  externalUrl?: string;
  externalCourseId?: string;
  estimatedMinutes?: number;
  metadataJson?: Record<string, unknown>;
}

export interface ContentAssetFilters {
  companyId?: string;
  type?: ContentAssetType;
  provider?: ContentProvider;
  category?: string;
  search?: string;
  includeArchived?: boolean;
}

@Injectable()
export class ContentLibraryService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private trainingModules: TrainingModulesService,
  ) {}

  async list(filters: ContentAssetFilters = {}) {
    const where: Record<string, unknown> = {};

    if (filters.companyId) where.companyId = filters.companyId;

    if (!filters.includeArchived) where.isArchived = false;
    if (filters.type) where.type = filters.type;
    if (filters.provider) where.provider = filters.provider;
    if (filters.category) where.category = filters.category;
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { tags: { has: filters.search } },
      ];
    }

    const assets = await this.prisma.contentAsset.findMany({
      where,
      include: {
        createdBy: { select: { fullName: true } },
        _count: { select: { trainingLinks: true, questions: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return assets.map((a) => this.toSummary(a));
  }

  async getById(id: string) {
    const asset = await this.prisma.contentAsset.findUnique({
      where: { id },
      include: {
        createdBy: { select: { fullName: true, email: true } },
        questions: {
          orderBy: { order: 'asc' },
          include: { options: { orderBy: { order: 'asc' } } },
        },
        trainingLinks: {
          include: { training: { select: { id: true, title: true } } },
        },
      },
    });
    if (!asset) throw new NotFoundException('Content asset not found');
    return asset;
  }

  async create(dto: CreateContentAssetDto, user: AuthUser, companyId?: string) {
    if (!dto.title?.trim()) throw new BadRequestException('Title is required');

    if (dto.type === ContentAssetType.EXTERNAL) {
      if (!dto.externalUrl) throw new BadRequestException('External URL is required');
      if (!dto.provider || dto.provider === ContentProvider.INTERNAL) {
        throw new BadRequestException('Select a third-party provider for external courses');
      }
    }
    if (dto.type === ContentAssetType.GAME && !dto.externalUrl) {
      throw new BadRequestException('Game URL or embed link is required');
    }

    return this.prisma.contentAsset.create({
      data: {
        companyId,
        title: dto.title.trim(),
        description: dto.description ?? '',
        type: dto.type,
        provider: dto.provider ?? ContentProvider.INTERNAL,
        category: dto.category?.trim() || null,
        tags: dto.tags ?? [],
        difficulty: dto.difficulty ?? null,
        language: dto.language?.trim() || 'en',
        thumbnailUrl: dto.thumbnailUrl?.trim() || null,
        version: dto.version?.trim() || '1.0',
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        externalUrl: dto.externalUrl,
        externalCourseId: dto.externalCourseId,
        estimatedMinutes: dto.estimatedMinutes ?? 15,
        metadataJson: dto.metadataJson as Prisma.InputJsonValue,
        createdById: user.id,
      },
    });
  }

  async update(id: string, dto: Partial<CreateContentAssetDto>) {
    await this.getById(id);
    return this.prisma.contentAsset.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        description: dto.description,
        category: dto.category === undefined ? undefined : dto.category?.trim() || null,
        tags: dto.tags,
        difficulty: dto.difficulty === undefined ? undefined : dto.difficulty,
        language: dto.language?.trim(),
        thumbnailUrl: dto.thumbnailUrl === undefined ? undefined : dto.thumbnailUrl?.trim() || null,
        version: dto.version?.trim(),
        expiresAt:
          dto.expiresAt === undefined
            ? undefined
            : dto.expiresAt
              ? new Date(dto.expiresAt)
              : null,
        externalUrl: dto.externalUrl,
        externalCourseId: dto.externalCourseId,
        estimatedMinutes: dto.estimatedMinutes,
        metadataJson: dto.metadataJson as Prisma.InputJsonValue,
      },
    });
  }

  async archive(id: string) {
    await this.getById(id);
    return this.prisma.contentAsset.update({
      where: { id },
      data: { isArchived: true },
    });
  }

  async setVideoUrl(id: string, videoUrl: string) {
    const asset = await this.getById(id);
    if (asset.type !== ContentAssetType.VIDEO) {
      throw new BadRequestException('Video upload only for VIDEO assets');
    }
    return this.prisma.contentAsset.update({ where: { id }, data: { videoUrl } });
  }

  async setScormContent(
    id: string,
    data: { scormContentUrl: string; scormEntryPoint: string; scormVersion: string },
  ) {
    const asset = await this.getById(id);
    if (asset.type !== ContentAssetType.SCORM) {
      throw new BadRequestException('SCORM upload only for SCORM assets');
    }
    return this.prisma.contentAsset.update({ where: { id }, data });
  }

  async setFileUrl(id: string, fileUrl: string, mimeType: string) {
    const asset = await this.getById(id);
    if (asset.type !== ContentAssetType.DOCUMENT && asset.type !== ContentAssetType.TEMPLATE) {
      throw new BadRequestException('File upload only for DOCUMENT or TEMPLATE assets');
    }
    return this.prisma.contentAsset.update({ where: { id }, data: { fileUrl, mimeType } });
  }

  async importQuizQuestions(
    assetId: string,
    questions: Array<{
      questionText: string;
      options: { optionText: string; isCorrect: boolean }[];
      points?: number;
    }>,
  ) {
    const asset = await this.getById(assetId);
    if (asset.type !== ContentAssetType.QUIZ) {
      throw new BadRequestException('Quiz import only for QUIZ assets');
    }

    await this.prisma.contentOption.deleteMany({
      where: { question: { assetId } },
    });
    await this.prisma.contentQuestion.deleteMany({ where: { assetId } });

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await this.prisma.contentQuestion.create({
        data: {
          assetId,
          questionText: q.questionText,
          questionType: QuestionType.SINGLE_CHOICE,
          points: q.points ?? 1,
          order: i,
          options: {
            create: q.options.map((o, j) => ({
              optionText: o.optionText,
              isCorrect: o.isCorrect,
              order: j,
            })),
          },
        },
      });
    }

    return { imported: questions.length };
  }

  async applyToTraining(trainingId: string, assetId: string) {
    const [training, asset] = await Promise.all([
      this.prisma.training.findUnique({ where: { id: trainingId } }),
      this.getById(assetId),
    ]);
    if (!training) throw new NotFoundException('Training not found');

    if (training.type === TrainingType.MODULAR) {
      return this.applyToModularTraining(trainingId, asset);
    }

    const linkRole = this.resolveLinkRole(asset.type, training.type);
    if (!linkRole) {
      throw new BadRequestException(
        `Cannot apply ${asset.type} asset to ${training.type} training`,
      );
    }

    await this.prisma.trainingContentLink.upsert({
      where: {
        trainingId_contentAssetId_role: {
          trainingId,
          contentAssetId: assetId,
          role: linkRole,
        },
      },
      create: { trainingId, contentAssetId: assetId, role: linkRole },
      update: {},
    });

    const trainingUpdate: Record<string, unknown> = {};

    if (asset.type === ContentAssetType.VIDEO && training.type === TrainingType.VIDEO_QUIZ) {
      trainingUpdate.videoUrl = asset.videoUrl;
    }
    if (asset.type === ContentAssetType.SCORM && training.type === TrainingType.SCORM) {
      trainingUpdate.scormContentUrl = asset.scormContentUrl;
      trainingUpdate.scormEntryPoint = asset.scormEntryPoint;
      trainingUpdate.scormVersion = asset.scormVersion;
    }
    if (asset.type === ContentAssetType.TEMPLATE) {
      trainingUpdate.certificateTemplateUrl = asset.fileUrl;
    }
    if (asset.estimatedMinutes) {
      trainingUpdate.estimatedMinutes = asset.estimatedMinutes;
    }
    // Copy course catalog metadata onto training when missing
    if (!training.category && asset.category) trainingUpdate.category = asset.category;
    if (!training.difficulty && asset.difficulty) trainingUpdate.difficulty = asset.difficulty;
    if ((!training.tags || training.tags.length === 0) && asset.tags?.length) trainingUpdate.tags = asset.tags;
    if ((!training.thumbnailUrl) && asset.thumbnailUrl) trainingUpdate.thumbnailUrl = asset.thumbnailUrl;
    if (asset.language) trainingUpdate.language = asset.language;
    if (asset.version) trainingUpdate.version = asset.version;
    if (!training.expiresAt && asset.expiresAt) trainingUpdate.expiresAt = asset.expiresAt;

    if (Object.keys(trainingUpdate).length > 0) {
      await this.prisma.training.update({ where: { id: trainingId }, data: trainingUpdate });
    }

    if (asset.type === ContentAssetType.QUIZ && asset.questions.length > 0) {
      await this.prisma.option.deleteMany({ where: { question: { trainingId } } });
      await this.prisma.question.deleteMany({ where: { trainingId } });

      for (let i = 0; i < asset.questions.length; i++) {
        const q = asset.questions[i];
        await this.prisma.question.create({
          data: {
            trainingId,
            questionText: q.questionText,
            questionType: q.questionType,
            points: q.points,
            explanation: q.explanation,
            order: i,
            options: {
              create: q.options.map((o, j) => ({
                optionText: o.optionText,
                isCorrect: o.isCorrect,
                order: j,
              })),
            },
          },
        });
      }
    }

    return { applied: true, role: linkRole, assetTitle: asset.title };
  }

  private async applyToModularTraining(
    trainingId: string,
    asset: Awaited<ReturnType<ContentLibraryService['getById']>>,
  ) {
    const moduleType = this.assetTypeToModuleType(asset.type);
    if (!moduleType) {
      if (asset.type === ContentAssetType.TEMPLATE && asset.fileUrl) {
        await this.prisma.training.update({
          where: { id: trainingId },
          data: { certificateTemplateUrl: asset.fileUrl },
        });
        return { applied: true, assetTitle: asset.title, role: ContentLinkRole.CERTIFICATE_TEMPLATE };
      }
      throw new BadRequestException(`Cannot apply ${asset.type} asset to modular training`);
    }

    const mod = await this.trainingModules.create(trainingId, {
      title: asset.title,
      moduleType,
      contentAssetId: asset.id,
      externalUrl: asset.externalUrl ?? undefined,
    });

    if (asset.type === ContentAssetType.QUIZ && asset.questions.length > 0) {
      await this.prisma.option.deleteMany({ where: { question: { trainingId } } });
      await this.prisma.question.deleteMany({ where: { trainingId } });

      for (let i = 0; i < asset.questions.length; i++) {
        const q = asset.questions[i];
        await this.prisma.question.create({
          data: {
            trainingId,
            questionText: q.questionText,
            questionType: q.questionType,
            points: q.points,
            explanation: q.explanation,
            order: i,
            options: {
              create: q.options.map((o, j) => ({
                optionText: o.optionText,
                isCorrect: o.isCorrect,
                order: j,
              })),
            },
          },
        });
      }
    }

    if (asset.estimatedMinutes) {
      await this.prisma.training.update({
        where: { id: trainingId },
        data: { estimatedMinutes: asset.estimatedMinutes },
      });
    }

    return { applied: true, moduleId: mod.id, assetTitle: asset.title };
  }

  private assetTypeToModuleType(assetType: ContentAssetType): TrainingModuleType | null {
    switch (assetType) {
      case ContentAssetType.VIDEO:
        return TrainingModuleType.VIDEO;
      case ContentAssetType.SCORM:
        return TrainingModuleType.SCORM;
      case ContentAssetType.QUIZ:
        return TrainingModuleType.QUIZ;
      case ContentAssetType.DOCUMENT:
        return TrainingModuleType.PDF;
      case ContentAssetType.EXTERNAL:
      case ContentAssetType.GAME:
        return TrainingModuleType.EXTERNAL;
      default:
        return null;
    }
  }

  async getCategories(companyId?: string) {
    const rows = await this.prisma.contentAsset.findMany({
      where: {
        isArchived: false,
        category: { not: null },
        ...(companyId ? { companyId } : {}),
      },
      select: { category: true },
      distinct: ['category'],
    });
    return rows.map((r) => r.category).filter(Boolean);
  }

  async uploadDocument(id: string, buffer: Buffer, fileName: string, mimeType: string) {
    const asset = await this.getById(id);
    if (asset.type !== ContentAssetType.DOCUMENT && asset.type !== ContentAssetType.TEMPLATE) {
      throw new BadRequestException('File upload only for DOCUMENT or TEMPLATE assets');
    }
    const key = this.storage.buildDocumentKey('content', id, fileName);
    await this.storage.uploadBuffer(key, buffer, mimeType);
    const fileUrl = this.storage.getPublicUrl(key);
    return this.setFileUrl(id, fileUrl, mimeType);
  }

  private resolveLinkRole(
    assetType: ContentAssetType,
    trainingType: TrainingType,
  ): ContentLinkRole | null {
    if (assetType === ContentAssetType.VIDEO && trainingType === TrainingType.VIDEO_QUIZ) {
      return ContentLinkRole.PRIMARY_VIDEO;
    }
    if (assetType === ContentAssetType.SCORM && trainingType === TrainingType.SCORM) {
      return ContentLinkRole.SCORM_PACKAGE;
    }
    if (assetType === ContentAssetType.QUIZ && trainingType === TrainingType.VIDEO_QUIZ) {
      return ContentLinkRole.QUIZ_BANK;
    }
    if (assetType === ContentAssetType.TEMPLATE) {
      return ContentLinkRole.CERTIFICATE_TEMPLATE;
    }
    if (assetType === ContentAssetType.DOCUMENT) {
      return ContentLinkRole.SUPPLEMENTAL;
    }
    if (assetType === ContentAssetType.EXTERNAL) {
      return ContentLinkRole.SUPPLEMENTAL;
    }
    return null;
  }

  private toSummary(a: {
    id: string;
    title: string;
    description: string;
    type: ContentAssetType;
    provider: ContentProvider;
    category: string | null;
    tags: string[];
    difficulty: string | null;
    language: string;
    thumbnailUrl: string | null;
    version: string;
    expiresAt: Date | null;
    videoUrl: string | null;
    scormContentUrl: string | null;
    fileUrl: string | null;
    externalUrl: string | null;
    externalCourseId: string | null;
    estimatedMinutes: number;
    isArchived: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdBy: { fullName: string } | null;
    _count: { trainingLinks: number; questions: number };
  }) {
    return {
      id: a.id,
      title: a.title,
      description: a.description,
      type: a.type,
      provider: a.provider,
      category: a.category,
      tags: a.tags,
      difficulty: a.difficulty,
      language: a.language,
      thumbnailUrl: a.thumbnailUrl,
      version: a.version,
      expiresAt: a.expiresAt,
      estimatedMinutes: a.estimatedMinutes,
      isArchived: a.isArchived,
      hasContent: !!(a.videoUrl || a.scormContentUrl || a.fileUrl || a.externalUrl || a._count.questions > 0),
      questionCount: a._count.questions,
      usageCount: a._count.trainingLinks,
      externalUrl: a.externalUrl,
      createdBy: a.createdBy?.fullName,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    };
  }
}
