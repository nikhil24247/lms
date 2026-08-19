import { Controller, Get, Post, Delete, Body, Param, Query, Patch } from '@nestjs/common';
import { NotificationChannel, NotificationStatus, UserRole } from '@prisma/client';
import { ApiResponse } from '@lms/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireTenantCompanyId } from '../../common/decorators/tenant.decorator';
import { NotificationsService, CreateReminderTemplateDto } from './notifications.service';

@Controller('api/v1/admin/notifications')
@Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Get('settings')
  async getSettings(): Promise<ApiResponse> {
    const data = await this.notifications.getSettings();
    return { success: true, message: 'Notification settings retrieved', data };
  }

  @Post('settings')
  async updateSettings(
    @Body()
    dto: {
      emailEnabled?: boolean;
      pushEnabled?: boolean;
      slackEnabled?: boolean;
      teamsEnabled?: boolean;
      slackWebhookUrl?: string;
      teamsWebhookUrl?: string;
      notifyPending?: boolean;
      notifyOverdue?: boolean;
    },
  ): Promise<ApiResponse> {
    const data = await this.notifications.updateSettings(dto);
    return { success: true, message: 'Notification settings updated', data };
  }

  @Get()
  async list(
    @Query('status') status?: NotificationStatus,
    @Query('trainingId') trainingId?: string,
    @Query('channel') channel?: NotificationChannel,
  ): Promise<ApiResponse> {
    const data = await this.notifications.list({ status, trainingId, channel });
    return { success: true, message: 'Notifications retrieved', data };
  }

  @Get('stats')
  async stats(): Promise<ApiResponse> {
    const data = await this.notifications.getStats();
    return { success: true, message: 'Notification stats retrieved', data };
  }

  @Post('process')
  async processDue(): Promise<ApiResponse> {
    const data = await this.notifications.processDueNotifications();
    return { success: true, message: 'Notifications processed', data };
  }

  @Post(':id/resend')
  async resend(@Param('id') id: string): Promise<ApiResponse> {
    const data = await this.notifications.resend(id);
    return { success: true, message: 'Notification resent', data };
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<ApiResponse> {
    const data = await this.notifications.delete(id);
    return { success: true, message: 'Notification deleted', data };
  }

  @Get('templates')
  async templates(@RequireTenantCompanyId() companyId: string): Promise<ApiResponse> {
    const data = await this.notifications.listTemplates(companyId);
    return { success: true, message: 'Templates retrieved', data };
  }

  @Get('templates/parameters')
  async templateParameters(): Promise<ApiResponse> {
    const data = this.notifications.getTemplateParameters();
    return { success: true, message: 'Template parameters', data };
  }

  @Post('templates')
  async createTemplate(
    @Body() dto: CreateReminderTemplateDto,
    @RequireTenantCompanyId() companyId: string,
  ): Promise<ApiResponse> {
    const data = await this.notifications.createTemplate({ ...dto, companyId });
    return { success: true, message: 'Template created', data };
  }

  @Patch('templates/:id')
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: Partial<CreateReminderTemplateDto>,
  ): Promise<ApiResponse> {
    const data = await this.notifications.updateTemplate(id, dto);
    return { success: true, message: 'Template updated', data };
  }

  @Delete('templates/:id')
  async deleteTemplate(@Param('id') id: string): Promise<ApiResponse> {
    const data = await this.notifications.deleteTemplate(id);
    return { success: true, message: 'Template deleted', data };
  }

  @Get('templates/:id/preview')
  async previewTemplate(@Param('id') id: string): Promise<ApiResponse> {
    const data = await this.notifications.previewTemplate(id);
    return { success: true, message: 'Template preview', data };
  }
}
