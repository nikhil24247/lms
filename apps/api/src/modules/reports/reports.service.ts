import { Injectable } from '@nestjs/common';
import { EnrollmentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsOverview } from '@lms/shared';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getOverview(): Promise<AnalyticsOverview> {
    const enrollments = await this.prisma.enrollment.findMany({
      include: { user: { include: { department: true } } },
    });

    const totalEnrollments = enrollments.length;
    const completedCount = enrollments.filter((e) => e.status === EnrollmentStatus.COMPLETED).length;
    const now = new Date();
    const overdueCount = enrollments.filter(
      (e) => e.dueDate && e.dueDate < now && e.status !== EnrollmentStatus.COMPLETED,
    ).length;

    const complianceRate =
      totalEnrollments > 0 ? Math.round((completedCount / totalEnrollments) * 100) : 0;

    const deptMap = new Map<string, { completed: number; total: number }>();
    for (const e of enrollments) {
      const dept = e.user.department?.name ?? 'Unassigned';
      const entry = deptMap.get(dept) ?? { completed: 0, total: 0 };
      entry.total += 1;
      if (e.status === EnrollmentStatus.COMPLETED) entry.completed += 1;
      deptMap.set(dept, entry);
    }

    return {
      totalEnrollments,
      completedCount,
      overdueCount,
      complianceRate,
      departmentBreakdown: Array.from(deptMap.entries()).map(([department, stats]) => ({
        department,
        completed: stats.completed,
        total: stats.total,
      })),
    };
  }
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async exportAuditCsv(): Promise<string> {
    const logs = await this.prisma.auditLog.findMany({
      include: { user: true },
      orderBy: { timestamp: 'desc' },
    });

    const headers = ['id', 'timestamp', 'userId', 'userEmail', 'action', 'resource', 'ipAddress'];
    const rows = logs.map((log) => [
      log.id,
      log.timestamp.toISOString(),
      log.userId ?? '',
      log.user?.email ?? '',
      log.action,
      log.resource,
      log.ipAddress ?? '',
    ]);

    return [headers.join(','), ...rows.map((r) => r.map(this.escapeCsv).join(','))].join('\n');
  }

  async getAuditLogs(limit = 100) {
    const logs = await this.prisma.auditLog.findMany({
      include: { user: { select: { email: true, fullName: true } } },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      resource: log.resource,
      ipAddress: log.ipAddress,
      timestamp: log.timestamp,
      userEmail: log.user?.email ?? 'System',
      userName: log.user?.fullName ?? 'System',
    }));
  }

  async exportEnrollmentCsv(): Promise<string> {
    const enrollments = await this.prisma.enrollment.findMany({
      include: {
        user: { include: { department: true } },
        training: true,
        assignment: true,
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    });

    const headers = [
      'learnerName',
      'learnerEmail',
      'department',
      'trainingTitle',
      'trainingType',
      'status',
      'progressPercentage',
      'mandatory',
      'dueDate',
      'completedAt',
      'videoCompleted',
      'quizPassed',
      'scormScore',
      'scormStatus',
    ];

    const rows = enrollments.map((e) => [
      e.user.fullName,
      e.user.email,
      e.user.department?.name ?? 'Unassigned',
      e.training.title,
      e.training.type,
      e.status,
      String(e.progressPercentage),
      e.assignment?.isMandatory ? 'Yes' : 'No',
      e.dueDate?.toISOString() ?? '',
      e.completedAt?.toISOString() ?? '',
      e.videoCompleted ? 'Yes' : 'No',
      e.quizPassed ? 'Yes' : 'No',
      e.scormScore != null ? String(e.scormScore) : '',
      e.scormStatus ?? '',
    ]);

    return [headers.join(','), ...rows.map((r) => r.map(this.escapeCsv).join(','))].join('\n');
  }

  private escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
