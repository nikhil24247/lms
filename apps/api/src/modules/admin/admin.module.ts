import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AssignmentModule } from '../assignments/assignment.module';

@Module({
  imports: [AssignmentModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
