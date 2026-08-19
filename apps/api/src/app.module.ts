import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { StorageModule } from './modules/storage/storage.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AdminModule } from './modules/admin/admin.module';
import { AssignmentModule } from './modules/assignments/assignment.module';
import { TrainingsModule } from './modules/trainings/trainings.module';
import { CertificatesModule } from './modules/certificates/certificates.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AssessmentsModule } from './modules/assessments/assessments.module';
import { RecognitionModule } from './modules/recognition/recognition.module';
import { CommunityModule } from './modules/community/community.module';
import { PlatformModule } from './modules/platform/platform.module';
import { ContentLibraryModule } from './modules/content-library/content-library.module';
import { UploadModule } from './modules/upload/upload.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { UsersModule } from './modules/users/users.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    StorageModule,
    TrainingsModule,
    ReportsModule,
    AdminModule,
    AssignmentModule,
    CertificatesModule,
    LeaderboardModule,
    NotificationsModule,
    AssessmentsModule,
    RecognitionModule,
    CommunityModule,
    PlatformModule,
    ContentLibraryModule,
    UploadModule,
    JobsModule,
    UsersModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({ whitelist: true, transform: true }),
    },
  ],
})
export class AppModule {}
