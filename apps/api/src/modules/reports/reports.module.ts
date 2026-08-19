import { Module } from '@nestjs/common';
import { EnrollmentsController } from '../enrollments/enrollments.controller';
import { ReportsController } from './reports.controller';
import { AnalyticsService, ReportsService } from './reports.service';
import { TrainingReportsService } from './training-reports.service';
import { TrainingsModule } from '../trainings/trainings.module';

@Module({
  imports: [TrainingsModule],
  controllers: [EnrollmentsController, ReportsController],
  providers: [AnalyticsService, ReportsService, TrainingReportsService],
  exports: [AnalyticsService, ReportsService, TrainingReportsService],
})
export class ReportsModule {}
