import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CompanyStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlatformService {
  constructor(private prisma: PrismaService) {}

  async getDashboard() {
    const companies = await this.prisma.company.findMany({
      include: {
        _count: { select: { users: true, trainings: true } },
      },
      orderBy: { name: 'asc' },
    });

    const totalUsers = await this.prisma.user.count({
      where: { role: 'LEARNER', isActive: true },
    });
    const totalCourses = await this.prisma.training.count();
    const totalEnrollments = await this.prisma.enrollment.count();
    const completed = await this.prisma.enrollment.count({
      where: { status: 'COMPLETED' },
    });

    return {
      stats: {
        totalCompanies: companies.length,
        activeCompanies: companies.filter((c) => c.status === CompanyStatus.ACTIVE).length,
        totalUsers,
        totalCourses,
        totalEnrollments,
        platformComplianceRate:
          totalEnrollments > 0 ? Math.round((completed / totalEnrollments) * 100) : 0,
      },
      companies: companies.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        status: c.status,
        maxUsers: c.maxUsers,
        maxCourses: c.maxCourses,
        userCount: c._count.users,
        courseCount: c._count.trainings,
        licenseUsage: `${c._count.users}/${c.maxUsers}`,
        createdAt: c.createdAt,
      })),
    };
  }

  async listCompanies() {
    const companies = await this.prisma.company.findMany({
      include: { _count: { select: { users: true, trainings: true } } },
      orderBy: { name: 'asc' },
    });
    return companies.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      status: c.status,
      maxUsers: c.maxUsers,
      maxCourses: c.maxCourses,
      userCount: c._count.users,
      courseCount: c._count.trainings,
      primaryColor: c.primaryColor,
      logoUrl: c.logoUrl,
      createdAt: c.createdAt,
    }));
  }

  async createCompany(dto: {
    name: string;
    slug: string;
    maxUsers?: number;
    maxCourses?: number;
    adminEmail?: string;
    adminName?: string;
  }) {
    const existing = await this.prisma.company.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new BadRequestException('Company slug already in use');

    const company = await this.prisma.company.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        maxUsers: dto.maxUsers ?? 100,
        maxCourses: dto.maxCourses ?? 50,
      },
    });

    let adminUser = null;
    if (dto.adminEmail && dto.adminName) {
      adminUser = await this.prisma.user.create({
        data: {
          email: dto.adminEmail,
          fullName: dto.adminName,
          role: 'LMS_ADMIN',
          companyId: company.id,
        },
      });
    }

    return { company, adminUser };
  }

  async getCompany(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, trainings: true } },
        users: {
          where: { role: 'LMS_ADMIN' },
          select: { id: true, email: true, fullName: true },
          take: 5,
        },
      },
    });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async suspendCompany(id: string) {
    return this.prisma.company.update({
      where: { id },
      data: { status: CompanyStatus.SUSPENDED },
    });
  }

  async activateCompany(id: string) {
    return this.prisma.company.update({
      where: { id },
      data: { status: CompanyStatus.ACTIVE },
    });
  }
}
