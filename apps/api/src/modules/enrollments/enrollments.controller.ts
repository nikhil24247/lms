import { Controller, Get } from '@nestjs/common';
import { ApiResponse } from '@lms/shared';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { TrainingsService } from '../trainings/trainings.service';

@Controller('api/v1/enrollments')
export class EnrollmentsController {
  constructor(private trainingsService: TrainingsService) {}

  @Get('assigned')
  async assigned(@CurrentUser() user: AuthUser): Promise<ApiResponse> {
    const data = await this.trainingsService.listAssigned(user);
    return { success: true, message: 'Assigned trainings retrieved', data };
  }
}
