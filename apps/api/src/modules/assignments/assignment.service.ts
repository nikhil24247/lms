import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { AssignmentTargetType, EnrollmentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from '../notifications/notifications.service';

export interface CreateAssignmentDto {
  trainingId: string;
  targetType: AssignmentTargetType;
  targetId?: string;
  targetGroupId?: string;
  dueDate?: string;
  relativeDueDays?: number;
  isMandatory?: boolean;
  passingScorePercentage?: number;
  maxRetries?: number;
  autoRemindDaysBefore?: number;
}

@Injectable()
export class AssignmentService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async create(dto: CreateAssignmentDto, user: AuthUser) {
    const training = await this.prisma.training.findUnique({ where: { id: dto.trainingId } });
    if (!training) throw new NotFoundException('Training not found');
    if (!training.publishedAt) {
      throw new BadRequestException('Publish the training before assigning');
    }

    if (!training.companyId) {
      throw new BadRequestException('Training is not assigned to a company');
    }
    const companyId = training.companyId;

    if (dto.targetType === 'ALL' && (dto.targetId || dto.targetGroupId)) {
      throw new BadRequestException('ALL target must not have targetId or targetGroupId');
    }
    if (dto.targetType === 'GROUP' && !dto.targetGroupId) {
      throw new BadRequestException('GROUP target requires targetGroupId');
    }
    if ((dto.targetType === 'USER' || dto.targetType === 'DEPARTMENT') && !dto.targetId) {
      throw new BadRequestException(`${dto.targetType} target requires targetId`);
    }

    const assignment = await this.prisma.trainingAssignment.create({
      data: {
        trainingId: dto.trainingId,
        targetType: dto.targetType,
        targetId: dto.targetType === 'GROUP' ? null : dto.targetId,
        targetGroupId: dto.targetType === 'GROUP' ? dto.targetGroupId : null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        relativeDueDays: dto.relativeDueDays,
        isMandatory: dto.isMandatory ?? true,
        passingScorePercentage: dto.passingScorePercentage ?? training.passingScorePercentage,
        maxRetries: dto.maxRetries ?? training.maxRetries,
        autoRemindDaysBefore: dto.autoRemindDaysBefore,
        createdById: user.id,
      },
    });

    const userIds = await this.resolveTargetUserIds(dto, companyId);
    const now = new Date();

    for (const userId of userIds) {
      const dueDate = dto.dueDate
        ? new Date(dto.dueDate)
        : dto.relativeDueDays
          ? new Date(now.getTime() + dto.relativeDueDays * 86400000)
          : null;

      await this.prisma.enrollment.upsert({
        where: { userId_trainingId: { userId, trainingId: dto.trainingId } },
        create: {
          userId,
          trainingId: dto.trainingId,
          assignmentId: assignment.id,
          dueDate,
          status: EnrollmentStatus.NOT_STARTED,
        },
        update: { dueDate, assignmentId: assignment.id },
      });
    }

    await this.notifications.scheduleForAssignment(assignment.id);
    return this.getById(assignment.id);
  }

  async list() {
    const assignments = await this.prisma.trainingAssignment.findMany({
      include: {
        training: { select: { id: true, title: true, type: true } },
        createdBy: { select: { fullName: true } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return assignments.map((a) => {
      const total = a._count.enrollments;
      return {
        id: a.id,
        trainingId: a.trainingId,
        trainingTitle: a.training.title,
        trainingType: a.training.type,
        targetType: a.targetType,
        targetId: a.targetId,
        targetGroupId: a.targetGroupId,
        dueDate: a.dueDate,
        relativeDueDays: a.relativeDueDays,
        isMandatory: a.isMandatory,
        passingScorePercentage: a.passingScorePercentage,
        maxRetries: a.maxRetries,
        autoRemindDaysBefore: a.autoRemindDaysBefore,
        enrollmentCount: total,
        createdBy: a.createdBy?.fullName,
        createdAt: a.createdAt,
      };
    });
  }

  async getById(id: string) {
    const a = await this.prisma.trainingAssignment.findUnique({
      where: { id },
      include: {
        training: true,
        enrollments: {
          include: { user: { select: { id: true, fullName: true, email: true, department: true } } },
        },
      },
    });
    if (!a) throw new NotFoundException('Assignment not found');
    return a;
  }

  async delete(id: string) {
    const assignment = await this.prisma.trainingAssignment.findUnique({ where: { id } });
    if (!assignment) throw new NotFoundException('Assignment not found');

    await this.prisma.$transaction([
      this.prisma.notification.deleteMany({ where: { assignmentId: id } }),
      this.prisma.enrollment.deleteMany({ where: { assignmentId: id } }),
      this.prisma.trainingAssignment.delete({ where: { id } }),
    ]);

    return { deleted: true };
  }

  async getStats(companyId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { training: { companyId } },
      include: {
        user: { include: { department: true } },
        training: true,
        assignment: true,
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    });

    const assignments = await this.prisma.trainingAssignment.findMany({
      where: { training: { companyId } },
      include: {
        training: true,
        enrollments: true,
      },
    });

    const assignmentStats = assignments.map((a) => {
      const total = a.enrollments.length;
      const completed = a.enrollments.filter((e) => e.status === EnrollmentStatus.COMPLETED).length;
      const inProgress = a.enrollments.filter((e) => e.status === EnrollmentStatus.IN_PROGRESS).length;
      const overdue = a.enrollments.filter(
        (e) => e.dueDate && e.dueDate < new Date() && e.status !== EnrollmentStatus.COMPLETED,
      ).length;

      return {
        id: a.id,
        trainingId: a.trainingId,
        trainingTitle: a.training.title,
        trainingType: a.training.type,
        targetType: a.targetType,
        isMandatory: a.isMandatory,
        dueDate: a.dueDate,
        totalEnrolled: total,
        completed,
        inProgress,
        notStarted: total - completed - inProgress,
        overdue,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });

    return {
      assignments: assignmentStats,
      enrollments: enrollments.map((e) => ({
        id: e.id,
        status: e.status,
        progressPercentage: e.progressPercentage,
        videoCompleted: e.videoCompleted,
        quizPassed: e.quizPassed,
        scormScore: e.scormScore,
        scormStatus: e.scormStatus,
        timeSpentSec: e.timeSpentSec,
        assignedAt: e.assignedAt,
        dueDate: e.dueDate,
        completedAt: e.completedAt,
        user: {
          fullName: e.user.fullName,
          email: e.user.email,
          department: e.user.department?.name ?? 'Unassigned',
        },
        training: {
          id: e.training.id,
          title: e.training.title,
          type: e.training.type,
        },
        assignment: e.assignment
          ? { isMandatory: e.assignment.isMandatory, passingScorePercentage: e.assignment.passingScorePercentage }
          : null,
      })),
    };
  }

  private async resolveTargetUserIds(dto: CreateAssignmentDto, companyId: string): Promise<string[]> {
    switch (dto.targetType) {
      case 'ALL': {
        const users = await this.prisma.user.findMany({
          where: { isActive: true, role: 'LEARNER', companyId },
          select: { id: true },
        });
        return users.map((u) => u.id);
      }
      case 'USER':
        return dto.targetId ? [dto.targetId] : [];
      case 'DEPARTMENT': {
        const users = await this.prisma.user.findMany({
          where: { departmentId: dto.targetId, isActive: true },
          select: { id: true },
        });
        return users.map((u) => u.id);
      }
      case 'GROUP': {
        const members = await this.prisma.userGroupMember.findMany({
          where: { groupId: dto.targetGroupId },
          select: { userId: true },
        });
        return members.map((m) => m.userId);
      }
      default:
        return [];
    }
  }
}
