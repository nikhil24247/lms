import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole, SubmissionStatus } from '@prisma/client';
import { ApiResponse } from '@lms/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { AssessmentsService, GradeSubmissionDto } from './assessments.service';

@Controller('api/v1')
export class AssessmentsController {
  constructor(private assessmentsService: AssessmentsService) {}

  @Post('trainings/progress/assignment-submit')
  @UseInterceptors(FileInterceptor('file'))
  async submitAssignment(
    @Body() body: { enrollmentId: string; questionId: string; textAnswer?: string },
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ): Promise<ApiResponse> {
    const data = await this.assessmentsService.submitAssignment(
      body.enrollmentId,
      body.questionId,
      user,
      { textAnswer: body.textAnswer, file },
    );
    return { success: true, message: 'Assignment submitted', data };
  }

  @Get('admin/assessments/submissions')
  @Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
  async listSubmissions(@Query('status') status?: SubmissionStatus): Promise<ApiResponse> {
    const data = await this.assessmentsService.listSubmissions(status);
    return { success: true, message: 'Submissions retrieved', data };
  }

  @Get('admin/assessments/stats')
  @Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
  async stats(): Promise<ApiResponse> {
    const data = await this.assessmentsService.getSubmissionStats();
    return { success: true, message: 'Stats retrieved', data };
  }

  @Post('admin/assessments/submissions/:id/grade')
  @Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
  async grade(
    @Param('id') id: string,
    @Body() dto: GradeSubmissionDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ApiResponse> {
    if (dto.score == null || dto.passed == null) {
      throw new BadRequestException('score and passed are required');
    }
    const data = await this.assessmentsService.gradeSubmission(id, dto, user);
    return { success: true, message: 'Submission graded', data };
  }
}
