import { Module, forwardRef } from '@nestjs/common';
import { ContentLibraryController } from './content-library.controller';
import { ContentLibraryService } from './content-library.service';
import { StorageModule } from '../storage/storage.module';
import { TrainingsModule } from '../trainings/trainings.module';

@Module({
  imports: [StorageModule, forwardRef(() => TrainingsModule)],
  controllers: [ContentLibraryController],
  providers: [ContentLibraryService],
  exports: [ContentLibraryService],
})
export class ContentLibraryModule {}
