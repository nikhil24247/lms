import { Injectable, OnModuleInit } from '@nestjs/common';
import { EnrollmentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class JobsService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private users: UsersService,
  ) {}

  onModuleInit() {
    setInterval(() => void this.processNotifications(), 5 * 60 * 1000);
    setInterval(() => void this.expireCertifications(), 24 * 60 * 60 * 1000);
    // ponytail: poll every 15m; each tenant's syncIntervalHours gates actual Graph sync
    setInterval(() => void this.processAzureSyncs(), 15 * 60 * 1000);
    setTimeout(() => void this.processNotifications(), 30_000);
  }

  async processNotifications() {
    try {
      await this.notifications.processDueNotifications();
    } catch {
      // logged by service
    }
  }

  async processAzureSyncs() {
    try {
      await this.users.runDueAzureSyncs();
    } catch {
      // lastSyncNote updated inside sync
    }
  }

  async expireCertifications() {
    const now = new Date();
    const items = await this.prisma.enrollment.findMany({
      where: {
        status: EnrollmentStatus.COMPLETED,
        expiresAt: { lt: now },
      },
      include: { user: true, training: true },
      take: 100,
    });

    if (items.length === 0) return { expired: 0 };

    await this.prisma.enrollment.updateMany({
      where: { id: { in: items.map((e) => e.id) } },
      data: { status: EnrollmentStatus.EXPIRED },
    });

    for (const e of items) {
      await this.prisma.learnerNotification.create({
        data: {
          userId: e.userId,
          title: 'Recertification required',
          body: `Your certification for "${e.training.title}" has expired. Please complete the training again.`,
          linkUrl: `/app/training/${e.id}`,
        },
      });
    }

    return { expired: items.length };
  }
}
