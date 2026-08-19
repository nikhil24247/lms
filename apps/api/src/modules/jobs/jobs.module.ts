import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [NotificationsModule, UsersModule],
  providers: [JobsService],
})
export class JobsModule {}
