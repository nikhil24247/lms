import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EnrollmentStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(companyId: string) {
    const userFilter = { companyId, isActive: true, role: 'LEARNER' as const };
    const trainingFilter = { companyId };

    const [trainings, users, enrollments, auditLogs, company] = await Promise.all([
      this.prisma.training.count({ where: trainingFilter }),
      this.prisma.user.count({ where: userFilter }),
      this.prisma.enrollment.findMany({
        where: { training: { companyId } },
        include: {
          user: { include: { department: true } },
          training: true,
        },
        orderBy: { assignedAt: 'desc' },
        take: 10,
      }),
      this.prisma.auditLog.findMany({
        where: { user: { companyId } },
        include: { user: true },
        orderBy: { timestamp: 'desc' },
        take: 8,
      }),
      this.prisma.company.findUnique({
        where: { id: companyId },
        select: {
          name: true,
          logoUrl: true,
          showPartnerLogo: true,
          partnerLogoUrl: true,
          primaryColor: true,
        },
      }),
    ]);

    const allEnrollments = await this.prisma.enrollment.count({
      where: { training: { companyId } },
    });
    const allCompleted = await this.prisma.enrollment.count({
      where: { training: { companyId }, status: EnrollmentStatus.COMPLETED },
    });
    const overdueCount = await this.prisma.enrollment.count({
      where: {
        training: { companyId },
        dueDate: { lt: new Date() },
        status: { not: EnrollmentStatus.COMPLETED },
      },
    });

    return {
      branding: company
        ? {
            companyName: company.name,
            logoUrl: company.logoUrl,
            showPartnerLogo: company.showPartnerLogo,
            partnerLogoUrl: company.partnerLogoUrl,
            primaryColor: company.primaryColor,
          }
        : null,
      stats: {
        totalTrainings: trainings,
        activeLearners: users,
        totalEnrollments: allEnrollments,
        completedCount: allCompleted,
        complianceRate: allEnrollments > 0 ? Math.round((allCompleted / allEnrollments) * 100) : 0,
        overdueCount,
      },
      recentEnrollments: enrollments.map((e) => ({
        id: e.id,
        status: e.status,
        progressPercentage: e.progressPercentage,
        dueDate: e.dueDate,
        completedAt: e.completedAt,
        user: {
          fullName: e.user.fullName,
          email: e.user.email,
          department: e.user.department?.name ?? 'Unassigned',
        },
        training: { title: e.training.title, type: e.training.type },
      })),
      recentActivity: auditLogs.map((l) => ({
        id: l.id,
        action: l.action,
        resource: l.resource,
        timestamp: l.timestamp,
        userEmail: l.user?.email ?? 'System',
      })),
    };
  }

  async getBranding(companyId: string) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Company not found');
    return {
      companyName: company.name,
      logoUrl: company.logoUrl,
      showPartnerLogo: company.showPartnerLogo,
      partnerLogoUrl: company.partnerLogoUrl,
      primaryColor: company.primaryColor,
    };
  }

  async updateBranding(
    companyId: string,
    dto: {
      showPartnerLogo?: boolean;
      partnerLogoUrl?: string | null;
      logoUrl?: string | null;
      primaryColor?: string | null;
    },
  ) {
    const company = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        ...(dto.showPartnerLogo !== undefined ? { showPartnerLogo: dto.showPartnerLogo } : {}),
        ...(dto.partnerLogoUrl !== undefined ? { partnerLogoUrl: dto.partnerLogoUrl || null } : {}),
        ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl || null } : {}),
        ...(dto.primaryColor !== undefined ? { primaryColor: dto.primaryColor || null } : {}),
      },
    });
    return {
      companyName: company.name,
      logoUrl: company.logoUrl,
      showPartnerLogo: company.showPartnerLogo,
      partnerLogoUrl: company.partnerLogoUrl,
      primaryColor: company.primaryColor,
    };
  }

  async listUsers(companyId: string) {
    const users = await this.prisma.user.findMany({
      where: { companyId, archivedAt: null },
      include: { department: true, _count: { select: { enrollments: true } } },
      orderBy: { fullName: 'asc' },
    });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      department: u.department?.name ?? 'Unassigned',
      departmentId: u.departmentId,
      hrisEmployeeId: u.hrisEmployeeId,
      isActive: u.isActive,
      enrollmentCount: u._count.enrollments,
    }));
  }

  async listDepartments(companyId: string) {
    return this.prisma.department.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  }

  async listGroups(companyId?: string) {
    return this.prisma.userGroup.findMany({
      where: companyId ? { companyId } : undefined,
      include: { _count: { select: { members: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createUser(
    companyId: string,
    dto: {
      email: string;
      fullName: string;
      role?: UserRole;
      departmentId?: string;
      hrisEmployeeId?: string;
      location?: string;
    },
  ) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Company not found');

    const userCount = await this.prisma.user.count({
      where: { companyId, isActive: true },
    });
    if (userCount >= company.maxUsers) {
      throw new BadRequestException(
        `License limit reached (${company.maxUsers} users max). Deactivate a user or upgrade the license.`,
      );
    }

    const email = dto.email.trim().toLowerCase();
    if (!email) throw new BadRequestException('Email is required');

    const existing = await this.prisma.user.findFirst({
      where: { companyId, email },
    });
    if (existing) throw new BadRequestException('A user with this email already exists in this company');

    const role = dto.role ?? UserRole.LEARNER;
    if (role === UserRole.SYSTEM_ADMIN) {
      throw new BadRequestException('Cannot assign SYSTEM_ADMIN role from company admin');
    }

    if (dto.departmentId) {
      const dept = await this.prisma.department.findFirst({
        where: { id: dto.departmentId, companyId },
      });
      if (!dept) throw new BadRequestException('Department not found in this company');
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        fullName: dto.fullName.trim(),
        role,
        companyId,
        departmentId: dto.departmentId || null,
        hrisEmployeeId: dto.hrisEmployeeId?.trim() || null,
        location: dto.location?.trim() || null,
      },
      include: { department: true, _count: { select: { enrollments: true } } },
    });

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      department: user.department?.name ?? 'Unassigned',
      departmentId: user.departmentId,
      hrisEmployeeId: user.hrisEmployeeId,
      isActive: user.isActive,
      enrollmentCount: user._count.enrollments,
    };
  }

  async deleteUser(id: string, companyId: string) {
    const user = await this.prisma.user.findFirst({ where: { id, companyId } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.user.update({ where: { id }, data: { isActive: false } });
    return { deleted: true };
  }

  async deleteEnrollment(id: string, companyId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id, training: { companyId } },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    await this.prisma.enrollment.delete({ where: { id } });
    return { deleted: true };
  }
}
