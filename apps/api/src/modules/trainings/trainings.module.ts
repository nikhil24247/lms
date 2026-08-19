import { Module, forwardRef } from '@nestjs/common';
import { TrainingsController } from './trainings.controller';
import { TrainingsService } from './trainings.service';
import { TrainingQuizService } from './training-quiz.service';
import { TrainingUploadService } from './training-upload.service';
import { TrainingModulesService } from './training-modules.service';
import { StorageModule } from '../storage/storage.module';
import { CertificatesModule } from '../certificates/certificates.module';
import { RecognitionModule } from '../recognition/recognition.module';

@Module({
  imports: [StorageModule, forwardRef(() => CertificatesModule), RecognitionModule],
  controllers: [TrainingsController],
  providers: [TrainingsService, TrainingQuizService, TrainingUploadService, TrainingModulesService],
  exports: [TrainingsService, TrainingModulesService, TrainingQuizService, TrainingUploadService],
})
export class TrainingsModule {}
