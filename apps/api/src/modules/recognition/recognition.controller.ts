import { Controller, Get } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ApiResponse } from '@lms/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { RecognitionService } from './recognition.service';

@Controller('api/v1')
export class RecognitionController {
  constructor(private recognition: RecognitionService) {}

  @Get('recognition/my')
  async myProfile(@CurrentUser() user: AuthUser): Promise<ApiResponse> {
    const data = await this.recognition.getMyProfile(user.id);
    return { success: true, message: 'Recognition profile retrieved', data };
  }

  @Get('admin/recognition/badges')
  @Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
  async listBadges(): Promise<ApiResponse> {
    const data = await this.recognition.listBadges();
    return { success: true, message: 'Badges retrieved', data };
  }

  @Get('admin/recognition/stats')
  @Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
  async stats(): Promise<ApiResponse> {
    const data = await this.recognition.getRecognitionStats();
    return { success: true, message: 'Recognition stats retrieved', data };
  }
}
