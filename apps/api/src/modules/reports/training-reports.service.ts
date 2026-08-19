import { Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentStatus } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../prisma/prisma.service';

export interface TrainingReportFilters {
  companyId?: string;
  trainingId?: string;
  departmentId?: string;
  groupId?: string;
  location?: string;
  status?: EnrollmentStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface TrainingReportRow {
  trainingId: string;
  trainingTitle: string;
  trainingType: string;
  totalAssigned: number;
  completed: number;
  pending: number;
  completionPercentage: number;
  averageScore: number | null;
  passCount: number;
  failCount: number;
  averageTimeSpentSec: number;
  learners: LearnerReportRow[];
}

export interface LearnerReportRow {
  enrollmentId: string;
  userId: string;
  fullName: string;
  email: string;
  department: string;
  location: string;
  groups: string;
  status: string;
  progressPercentage: number;
  passFail: string;
  quizScore: number | null;
  scormScore: number | null;
  averageScore: number | null;
  timeSpentSec: number;
  startedAt: string | null;
  completionScore: number | null;
  completionPoints: number | null;
  assignedAt: string;
  completedAt: string | null;
  dueDate: string | null;
}

@Injectable()
export class TrainingReportsService {
  constructor(private prisma: PrismaService) {}

  async getTrainingReports(filters: TrainingReportFilters) {
    const enrollments = await this.fetchEnrollments(filters);
    return await this.buildReportsFromEnrollments(enrollments);
  }

  async getTrainingReport(trainingId: string, filters: TrainingReportFilters = {}) {
    const reports = await this.getTrainingReports({ ...filters, trainingId });
    if (reports.length > 0) return reports[0];

    const training = await this.prisma.training.findFirst({
      where: {
        id: trainingId,
        ...(filters.companyId ? { companyId: filters.companyId } : {}),
      },
    });
    if (!training) {
      throw new NotFoundException('Training not found');
    }

    return {
      trainingId: training.id,
      trainingTitle: training.title,
      trainingType: training.type,
      totalAssigned: 0,
      completed: 0,
      pending: 0,
      completionPercentage: 0,
      averageScore: null,
      passCount: 0,
      failCount: 0,
      averageTimeSpentSec: 0,
      learners: [],
    };
  }

  exportFilename(reports: TrainingReportRow[], format: 'csv' | 'excel' | 'pdf'): string {
    const ext = format === 'excel' ? 'xlsx' : format;
    if (reports.length === 1) {
      const slug = reports[0].trainingTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60);
      return `${slug}-report.${ext}`;
    }
    return `training-report.${ext}`;
  }

  private async buildReportsFromEnrollments(
    enrollments: Awaited<ReturnType<typeof this.fetchEnrollments>>,
  ): Promise<TrainingReportRow[]> {
    const byTraining = new Map<string, typeof enrollments>();

    for (const e of enrollments) {
      const list = byTraining.get(e.trainingId) ?? [];
      list.push(e);
      byTraining.set(e.trainingId, list);
    }

    const reports: TrainingReportRow[] = [];

    for (const [trainingId, items] of byTraining) {
      const training = items[0].training;
      const learners = await Promise.all(items.map((e) => this.toLearnerRow(e)));
      const completed = items.filter((e) => e.status === EnrollmentStatus.COMPLETED).length;
      const scores = learners.map((l) => l.averageScore).filter((s): s is number => s != null);
      const passCount = learners.filter((l) => l.passFail === 'PASS').length;
      const failCount = learners.filter((l) => l.passFail === 'FAIL').length;
      const totalTime = items.reduce((sum, e) => sum + e.timeSpentSec, 0);

      reports.push({
        trainingId,
        trainingTitle: training.title,
        trainingType: training.type,
        totalAssigned: items.length,
        completed,
        pending: items.length - completed,
        completionPercentage: items.length > 0 ? Math.round((completed / items.length) * 100) : 0,
        averageScore: scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null,
        passCount,
        failCount,
        averageTimeSpentSec: items.length > 0 ? Math.round(totalTime / items.length) : 0,
        learners,
      });
    }

    return reports.sort((a, b) => a.trainingTitle.localeCompare(b.trainingTitle));
  }

  private async resolveReports(filters: TrainingReportFilters): Promise<TrainingReportRow[]> {
    const reports = await this.getTrainingReports(filters);
    if (reports.length === 0 && filters.trainingId) {
      return [await this.getTrainingReport(filters.trainingId, filters)];
    }
    return reports;
  }

  async exportCsv(filters: TrainingReportFilters): Promise<{ csv: string; filename: string }> {
    const reports = await this.resolveReports(filters);
    const headers = [
      'Training',
      'Type',
      'Learner',
      'Email',
      'Department',
      'Location',
      'Groups',
      'Status',
      'Progress %',
      'Pass/Fail',
      'Quiz Score',
      'SCORM Score',
      'Avg Score',
      'Time Spent (sec)',
      'Assigned At',
      'Completed At',
      'Due Date',
    ];

    const rows: string[][] = [];
    for (const r of reports) {
      for (const l of r.learners) {
        rows.push([
          r.trainingTitle,
          r.trainingType,
          l.fullName,
          l.email,
          l.department,
          l.location,
          l.groups,
          l.status,
          String(l.progressPercentage),
          l.passFail,
          l.quizScore != null ? String(l.quizScore) : '',
          l.scormScore != null ? String(l.scormScore) : '',
          l.averageScore != null ? String(l.averageScore) : '',
          String(l.timeSpentSec),
          l.assignedAt,
          l.completedAt ?? '',
          l.dueDate ?? '',
        ]);
      }
    }

    const csv = [headers.join(','), ...rows.map((r) => r.map(this.escapeCsv).join(','))].join('\n');
    return { csv, filename: this.exportFilename(reports, 'csv') };
  }

  async exportExcel(filters: TrainingReportFilters): Promise<{ buffer: Buffer; filename: string }> {
    const reports = await this.resolveReports(filters);
    const workbook = new ExcelJS.Workbook();

    const summary = workbook.addWorksheet('Summary');
    summary.addRow([
      'Training',
      'Type',
      'Total Assigned',
      'Completed',
      'Pending',
      'Completion %',
      'Avg Score',
      'Pass',
      'Fail',
      'Avg Time (sec)',
    ]);
    for (const r of reports) {
      summary.addRow([
        r.trainingTitle,
        r.trainingType,
        r.totalAssigned,
        r.completed,
        r.pending,
        r.completionPercentage,
        r.averageScore ?? '',
        r.passCount,
        r.failCount,
        r.averageTimeSpentSec,
      ]);
    }

    const detail = workbook.addWorksheet('Learner Detail');
    detail.addRow([
      'Training',
      'Learner',
      'Email',
      'Department',
      'Location',
      'Groups',
      'Status',
      'Progress %',
      'Pass/Fail',
      'Quiz Score',
      'SCORM Score',
      'Avg Score',
      'Time Spent (sec)',
      'Assigned At',
      'Due Date',
      'Completed At',
    ]);
    for (const r of reports) {
      for (const l of r.learners) {
        detail.addRow([
          r.trainingTitle,
          l.fullName,
          l.email,
          l.department,
          l.location,
          l.groups,
          l.status,
          l.progressPercentage,
          l.passFail,
          l.quizScore ?? '',
          l.scormScore ?? '',
          l.averageScore ?? '',
          l.timeSpentSec,
          l.assignedAt,
          l.dueDate ?? '',
          l.completedAt ?? '',
        ]);
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return { buffer: Buffer.from(buffer), filename: this.exportFilename(reports, 'excel') };
  }

  async exportPdf(filters: TrainingReportFilters): Promise<{ buffer: Buffer; filename: string }> {
    const reports = await this.resolveReports(filters);
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text('Training Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`);
      doc.moveDown();

      for (const r of reports) {
        doc.fontSize(14).text(r.trainingTitle, { underline: true });
        doc.fontSize(10).text(
          `Type: ${r.trainingType} | Assigned: ${r.totalAssigned} | Completed: ${r.completed} | Pending: ${r.pending} | Completion: ${r.completionPercentage}%`,
        );
        if (r.averageScore != null) doc.text(`Average Score: ${r.averageScore}% | Pass: ${r.passCount} | Fail: ${r.failCount}`);
        doc.text(`Avg Time Spent: ${r.averageTimeSpentSec}s`);
        doc.moveDown(0.5);

        for (const l of r.learners) {
          doc.fontSize(9).text(
            `${l.fullName} (${l.department}) — ${l.status} — ${l.progressPercentage}% — ${l.passFail}` +
              (l.averageScore != null ? ` — Score: ${l.averageScore}%` : '') +
              (l.dueDate ? ` — Due: ${new Date(l.dueDate).toLocaleDateString()}` : '') +
              (l.completedAt ? ` — Done: ${new Date(l.completedAt).toLocaleDateString()}` : ''),
          );
        }
        doc.moveDown();
      }

      doc.end();
    });
    return { buffer, filename: this.exportFilename(reports, 'pdf') };
  }

  private async fetchEnrollments(filters: TrainingReportFilters) {
    const where: Record<string, unknown> = {};

    if (filters.trainingId) where.trainingId = filters.trainingId;
    if (filters.status) where.status = filters.status;
    if (filters.companyId) {
      where.training = { companyId: filters.companyId };
    }
    if (filters.dateFrom || filters.dateTo) {
      where.assignedAt = {};
      if (filters.dateFrom) (where.assignedAt as Record<string, Date>).gte = new Date(filters.dateFrom);
      if (filters.dateTo) (where.assignedAt as Record<string, Date>).lte = new Date(filters.dateTo);
    }

    const userFilter: Record<string, unknown> = {};
    if (filters.departmentId) userFilter.departmentId = filters.departmentId;
    if (filters.location) userFilter.location = filters.location;
    if (filters.groupId) {
      userFilter.groupMemberships = { some: { groupId: filters.groupId } };
    }
    if (Object.keys(userFilter).length > 0) where.user = userFilter;

    return this.prisma.enrollment.findMany({
      where,
      include: {
        training: true,
        assignment: true,
        user: {
          include: {
            department: true,
            groupMemberships: { include: { group: true } },
          },
        },
        assessmentAttempts: { orderBy: { attemptedAt: 'desc' }, take: 1 },
      },
      orderBy: [{ trainingId: 'asc' }, { assignedAt: 'desc' }],
    });
  }

  private async toLearnerRow(
    e: Awaited<ReturnType<typeof this.fetchEnrollments>>[number],
  ): Promise<LearnerReportRow> {
    const quizScore = e.assessmentAttempts[0]?.score ?? null;
    const scormScore = e.scormScore;
    const avgScore = quizScore ?? scormScore ?? null;
    const passing = e.assignment?.passingScorePercentage ?? e.training.passingScorePercentage;

    let passFail = 'PENDING';
    if (e.status === EnrollmentStatus.COMPLETED) {
      passFail = avgScore != null && avgScore < passing ? 'FAIL' : 'PASS';
    } else if (e.status === EnrollmentStatus.FAILED) {
      passFail = 'FAIL';
    }

    return {
      enrollmentId: e.id,
      userId: e.userId,
      fullName: e.user.fullName,
      email: e.user.email,
      department: e.user.department?.name ?? 'Unassigned',
      location: e.user.location ?? '—',
      groups: e.user.groupMemberships.map((m) => m.group.name).join(', ') || '—',
      status: e.status,
      progressPercentage: e.progressPercentage,
      passFail,
      quizScore,
      scormScore,
      averageScore: avgScore,
      timeSpentSec: e.timeSpentSec,
      startedAt: e.startedAt?.toISOString() ?? null,
      completionScore: e.completionScore,
      completionPoints: e.completionPoints,
      assignedAt: e.assignedAt.toISOString(),
      completedAt: e.completedAt?.toISOString() ?? null,
      dueDate: e.dueDate?.toISOString() ?? null,
    };
  }

  private escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
