import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { renderTemplate, TemplateContext } from '../../common/utils/template-render.util';

export interface CreateReminderTemplateDto {
  name: string;
  subject: string;
  bodyHtml: string;
  channel?: NotificationChannel;
  daysBeforeDue?: number;
  isOverdue?: boolean;
  isDefault?: boolean;
  companyId?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async scheduleForAssignment(assignmentId: string) {
    const assignment = await this.prisma.trainingAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        training: { include: { company: true } },
        enrollments: { include: { user: { include: { company: true } } } },
      },
    });
    if (!assignment) return;

    const settings = await this.getSettings();
    const channels = this.resolveChannels(assignment.training.notificationChannels, settings);
    if (channels.length === 0) return;

    const schedule = (assignment.training.reminderSchedule ?? '3,0,-1')
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));

    const dueDate = assignment.dueDate;
    if (!dueDate) return;

    const companyId = assignment.training.companyId ?? undefined;

    for (const enrollment of assignment.enrollments) {
      for (const days of schedule) {
        const isOverdue = days < 0;
        if (isOverdue && !assignment.training.notifyOverdue && !settings.notifyOverdue) continue;
        if (
          !isOverdue &&
          days > 0 &&
          enrollment.status === 'NOT_STARTED' &&
          !assignment.training.notifyPending &&
          !settings.notifyPending
        ) {
          continue;
        }

        const scheduledAt = new Date(dueDate);
        scheduledAt.setDate(scheduledAt.getDate() - days);

        for (const channel of channels) {
          const template = await this.resolveTemplate(companyId, days, isOverdue, channel);
          const ctx = this.buildContext(
            enrollment.user.fullName,
            enrollment.user.email,
            assignment.training.title,
            dueDate,
            days,
            enrollment.progressPercentage,
            assignment.training.company?.name,
            enrollment.id,
          );
          const subject = renderTemplate(template.subject, ctx);
          const body = renderTemplate(template.bodyHtml, ctx);

          await this.prisma.notification.create({
            data: {
              userId: enrollment.userId,
              trainingId: assignment.trainingId,
              assignmentId: assignment.id,
              channel,
              subject,
              body,
              status: NotificationStatus.SCHEDULED,
              scheduledAt,
              metadataJson: {
                daysBeforeDue: days,
                enrollmentId: enrollment.id,
                channel,
                templateId: template.id,
              },
            },
          });
        }
      }
    }
  }

  private async resolveTemplate(
    companyId: string | undefined,
    daysBeforeDue: number,
    isOverdue: boolean,
    channel: NotificationChannel,
  ) {
    const match = await this.prisma.reminderTemplate.findFirst({
      where: {
        isActive: true,
        channel,
        isOverdue,
        ...(isOverdue ? {} : { daysBeforeDue }),
        OR: companyId ? [{ companyId }, { companyId: null }] : [{ companyId: null }],
      },
      orderBy: [{ companyId: 'desc' }, { isDefault: 'desc' }],
    });

    if (match) return match;

    const label = isOverdue ? 'Overdue Reminder' : daysBeforeDue === 0 ? 'Due Today' : `${daysBeforeDue} Days Before Due`;
    return {
      id: 'fallback',
      subject: `${label}: {{training}}`,
      bodyHtml:
        'Hi {{learner}},\n\nReminder about "{{training}}" (due {{dueDate}}). Progress: {{progress}}%.\n\n{{trainingUrl}}\n\n— {{company}}',
    };
  }

  private buildContext(
    fullName: string,
    email: string,
    trainingTitle: string,
    dueDate: Date,
    days: number,
    progress: number,
    companyName?: string,
    enrollmentId?: string,
  ): TemplateContext {
    return {
      learner: fullName,
      learnerEmail: email,
      training: trainingTitle,
      dueDate: dueDate.toLocaleDateString(),
      daysRemaining: String(Math.max(days, 0)),
      progress: String(Math.round(progress)),
      company: companyName ?? 'ProPhish LMS',
      trainingUrl: enrollmentId ? `/app/training/${enrollmentId}` : '',
    };
  }

  async getSettings() {
    const existing = await this.prisma.notificationSettings.findUnique({ where: { id: 'default' } });
    if (existing) return existing;
    return this.prisma.notificationSettings.create({ data: { id: 'default' } });
  }

  async updateSettings(dto: {
    emailEnabled?: boolean;
    pushEnabled?: boolean;
    slackEnabled?: boolean;
    teamsEnabled?: boolean;
    slackWebhookUrl?: string;
    teamsWebhookUrl?: string;
    notifyPending?: boolean;
    notifyOverdue?: boolean;
  }) {
    await this.getSettings();
    return this.prisma.notificationSettings.update({
      where: { id: 'default' },
      data: {
        emailEnabled: dto.emailEnabled,
        pushEnabled: dto.pushEnabled,
        slackEnabled: dto.slackEnabled,
        teamsEnabled: dto.teamsEnabled,
        slackWebhookUrl: dto.slackWebhookUrl,
        teamsWebhookUrl: dto.teamsWebhookUrl,
        notifyPending: dto.notifyPending,
        notifyOverdue: dto.notifyOverdue,
      },
    });
  }

  private resolveChannels(
    trainingChannels: string,
    settings: {
      emailEnabled: boolean;
      pushEnabled: boolean;
      slackEnabled: boolean;
      teamsEnabled: boolean;
    },
  ): NotificationChannel[] {
    const channelMap: Record<string, { channel: NotificationChannel; enabled: boolean }> = {
      EMAIL: { channel: NotificationChannel.EMAIL, enabled: settings.emailEnabled },
      PUSH: { channel: NotificationChannel.PUSH, enabled: settings.pushEnabled },
      SLACK: { channel: NotificationChannel.SLACK, enabled: settings.slackEnabled },
      TEAMS: { channel: NotificationChannel.TEAMS, enabled: settings.teamsEnabled },
      IN_APP: { channel: NotificationChannel.IN_APP, enabled: true },
    };

    return (trainingChannels ?? 'EMAIL')
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter((c) => channelMap[c]?.enabled)
      .map((c) => channelMap[c].channel);
  }

  async processDueNotifications() {
    const now = new Date();
    const pending = await this.prisma.notification.findMany({
      where: {
        status: NotificationStatus.SCHEDULED,
        scheduledAt: { lte: now },
      },
      take: 100,
      include: { user: true },
    });

    let sent = 0;
    let failed = 0;

    for (const n of pending) {
      try {
        await this.deliverNotification(n.id, n);
        sent++;
      } catch {
        failed++;
      }
    }

    return { processed: pending.length, sent, failed };
  }

  private async deliverNotification(
    notificationId: string,
    n: { channel: NotificationChannel; userId: string; subject: string; body: string },
  ) {
    if (n.channel === NotificationChannel.IN_APP) {
      await this.prisma.learnerNotification.create({
        data: {
          userId: n.userId,
          title: n.subject,
          body: n.body,
        },
      });
    }

    const settings = await this.getSettings();
    let delivered = true;
    let failureReason: string | null = null;

    if (n.channel === NotificationChannel.SLACK && settings.slackWebhookUrl) {
      try {
        await fetch(settings.slackWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: `${n.subject}\n${n.body}` }),
        });
      } catch {
        delivered = false;
        failureReason = 'Slack webhook failed';
      }
    } else if (n.channel === NotificationChannel.TEAMS && settings.teamsWebhookUrl) {
      try {
        await fetch(settings.teamsWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: `${n.subject}\n${n.body}` }),
        });
      } catch {
        delivered = false;
        failureReason = 'Teams webhook failed';
      }
    } else if (n.channel === NotificationChannel.EMAIL) {
      // Email provider hook — mark delivered when SMTP/SES configured
      delivered = settings.emailEnabled;
      if (!delivered) failureReason = 'Email delivery not configured';
    }

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: delivered ? NotificationStatus.DELIVERED : NotificationStatus.FAILED,
        sentAt: new Date(),
        deliveredAt: delivered ? new Date() : null,
        failureReason,
      },
    });
  }

  async resend(notificationId: string) {
    const n = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      include: { user: true },
    });
    if (!n) throw new NotFoundException('Notification not found');

    await this.deliverNotification(notificationId, n);
    return { resent: true };
  }

  async delete(notificationId: string) {
    const n = await this.prisma.notification.findUnique({ where: { id: notificationId } });
    if (!n) throw new NotFoundException('Notification not found');
    await this.prisma.notification.delete({ where: { id: notificationId } });
    return { deleted: true };
  }

  async list(filters?: {
    status?: NotificationStatus;
    trainingId?: string;
    channel?: NotificationChannel;
  }) {
    return this.prisma.notification.findMany({
      where: {
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.trainingId ? { trainingId: filters.trainingId } : {}),
        ...(filters?.channel ? { channel: filters.channel } : {}),
      },
      include: {
        user: { select: { fullName: true, email: true } },
        training: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async getStats() {
    const [scheduled, sent, pending, failed, opened] = await Promise.all([
      this.prisma.notification.count({ where: { status: NotificationStatus.SCHEDULED } }),
      this.prisma.notification.count({ where: { status: NotificationStatus.SENT } }),
      this.prisma.notification.count({ where: { status: NotificationStatus.PENDING } }),
      this.prisma.notification.count({ where: { status: NotificationStatus.FAILED } }),
      this.prisma.notification.count({ where: { status: NotificationStatus.OPENED } }),
    ]);

    const total = await this.prisma.notification.count();
    const delivered = await this.prisma.notification.count({
      where: { status: { in: [NotificationStatus.DELIVERED, NotificationStatus.OPENED] } },
    });

    return {
      scheduled,
      sent,
      pending,
      failed,
      opened,
      total,
      deliveryRate: total > 0 ? Math.round((delivered / total) * 100) : 0,
      openRate: delivered > 0 ? Math.round((opened / delivered) * 100) : 0,
    };
  }

  async listTemplates(companyId?: string) {
    return this.prisma.reminderTemplate.findMany({
      where: companyId ? { OR: [{ companyId }, { companyId: null }] } : {},
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  async createTemplate(dto: CreateReminderTemplateDto) {
    if (dto.isDefault && dto.companyId) {
      await this.prisma.reminderTemplate.updateMany({
        where: {
          companyId: dto.companyId,
          daysBeforeDue: dto.daysBeforeDue ?? null,
          isOverdue: dto.isOverdue ?? false,
          channel: dto.channel ?? NotificationChannel.EMAIL,
        },
        data: { isDefault: false },
      });
    }
    return this.prisma.reminderTemplate.create({
      data: {
        companyId: dto.companyId,
        name: dto.name,
        subject: dto.subject,
        bodyHtml: dto.bodyHtml,
        channel: dto.channel ?? NotificationChannel.EMAIL,
        daysBeforeDue: dto.daysBeforeDue,
        isOverdue: dto.isOverdue ?? false,
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async updateTemplate(id: string, dto: Partial<CreateReminderTemplateDto>) {
    const t = await this.prisma.reminderTemplate.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Template not found');
    return this.prisma.reminderTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        subject: dto.subject,
        bodyHtml: dto.bodyHtml,
        channel: dto.channel,
        daysBeforeDue: dto.daysBeforeDue,
        isOverdue: dto.isOverdue,
        isActive: dto.isDefault !== undefined ? true : undefined,
        isDefault: dto.isDefault,
      },
    });
  }

  async deleteTemplate(id: string) {
    const t = await this.prisma.reminderTemplate.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Template not found');
    await this.prisma.reminderTemplate.delete({ where: { id } });
    return { deleted: true };
  }

  async previewTemplate(templateId: string, learnerName = 'Alex Learner', trainingTitle = 'Cybersecurity Awareness') {
    const t = await this.prisma.reminderTemplate.findUnique({ where: { id: templateId } });
    if (!t) throw new NotFoundException('Template not found');
    const ctx: TemplateContext = {
      learner: learnerName,
      learnerEmail: 'alex@example.com',
      training: trainingTitle,
      dueDate: new Date().toLocaleDateString(),
      daysRemaining: '3',
      progress: '45',
      company: 'Acme Corp',
      trainingUrl: '/app/training/demo',
    };
    return {
      subject: renderTemplate(t.subject, ctx),
      body: renderTemplate(t.bodyHtml, ctx),
    };
  }

  getTemplateParameters() {
    return [
      { key: '{{learner}}', label: 'Learner name' },
      { key: '{{learnerEmail}}', label: 'Learner email' },
      { key: '{{training}}', label: 'Training title' },
      { key: '{{dueDate}}', label: 'Due date' },
      { key: '{{daysRemaining}}', label: 'Days remaining' },
      { key: '{{progress}}', label: 'Progress %' },
      { key: '{{company}}', label: 'Company name' },
      { key: '{{trainingUrl}}', label: 'Training link' },
    ];
  }
}
