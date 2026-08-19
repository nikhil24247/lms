import { Controller, Get, Res, Query, Param } from '@nestjs/common';
import { Response } from 'express';
import { UserRole } from '@prisma/client';
import { ApiResponse } from '@lms/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireTenantCompanyId } from '../../common/decorators/tenant.decorator';
import { AnalyticsService, ReportsService } from './reports.service';
import { TrainingReportsService, TrainingReportFilters } from './training-reports.service';

@Controller('api/v1/admin')
@Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
export class ReportsController {
  constructor(
    private analytics: AnalyticsService,
    private reports: ReportsService,
    private trainingReports: TrainingReportsService,
  ) {}

  @Get('analytics/overview')
  async getOverview(): Promise<ApiResponse> {
    const data = await this.analytics.getOverview();
    return { success: true, message: 'Analytics overview retrieved', data };
  }

  @Get('reports/audit-export')
  async exportAudit(@Res() res: Response) {
    const csv = await this.reports.exportAuditCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit-export.csv');
    res.send(csv);
  }

  @Get('reports/enrollment-export')
  async exportEnrollments(@Res() res: Response) {
    const csv = await this.reports.exportEnrollmentCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=enrollment-report.csv');
    res.send(csv);
  }

  @Get('reports/audit-logs')
  async auditLogs(): Promise<ApiResponse> {
    const data = await this.reports.getAuditLogs();
    return { success: true, message: 'Audit logs retrieved', data };
  }

  @Get('reports/training')
  async getTrainingReports(
    @Query() query: TrainingReportFilters,
    @RequireTenantCompanyId() companyId: string,
  ): Promise<ApiResponse> {
    const data = await this.trainingReports.getTrainingReports({ ...query, companyId });
    return { success: true, message: 'Training reports retrieved', data };
  }

  @Get('reports/training/export/csv')
  async exportTrainingCsv(
    @Query() query: TrainingReportFilters,
    @RequireTenantCompanyId() companyId: string,
    @Res() res: Response,
  ) {
    const { csv, filename } = await this.trainingReports.exportCsv({ ...query, companyId });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  @Get('reports/training/export/excel')
  async exportTrainingExcel(
    @Query() query: TrainingReportFilters,
    @RequireTenantCompanyId() companyId: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.trainingReports.exportExcel({ ...query, companyId });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get('reports/training/export/pdf')
  async exportTrainingPdf(
    @Query() query: TrainingReportFilters,
    @RequireTenantCompanyId() companyId: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.trainingReports.exportPdf({ ...query, companyId });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get('reports/training/:trainingId/export/csv')
  async exportSingleTrainingCsv(
    @Param('trainingId') trainingId: string,
    @Query() query: TrainingReportFilters,
    @RequireTenantCompanyId() companyId: string,
    @Res() res: Response,
  ) {
    const { csv, filename } = await this.trainingReports.exportCsv({ ...query, companyId, trainingId });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  @Get('reports/training/:trainingId/export/excel')
  async exportSingleTrainingExcel(
    @Param('trainingId') trainingId: string,
    @Query() query: TrainingReportFilters,
    @RequireTenantCompanyId() companyId: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.trainingReports.exportExcel({ ...query, companyId, trainingId });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get('reports/training/:trainingId/export/pdf')
  async exportSingleTrainingPdf(
    @Param('trainingId') trainingId: string,
    @Query() query: TrainingReportFilters,
    @RequireTenantCompanyId() companyId: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.trainingReports.exportPdf({ ...query, companyId, trainingId });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get('reports/training/:trainingId')
  async getTrainingReport(
    @Param('trainingId') trainingId: string,
    @Query() query: TrainingReportFilters,
    @RequireTenantCompanyId() companyId: string,
  ): Promise<ApiResponse> {
    const data = await this.trainingReports.getTrainingReport(trainingId, { ...query, companyId });
    return { success: true, message: 'Training report retrieved', data };
  }
}
