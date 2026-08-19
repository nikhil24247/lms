import { Controller, Get, Param, Post, Body, Patch, Delete, Res, UploadedFile, UseInterceptors, BadRequestException, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { Response } from 'express';
import { ApiResponse } from '@lms/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { RequireTenantCompanyId } from '../../common/decorators/tenant.decorator';
import { TrainingsService, CreateTrainingDto, CreateQuestionDto } from './trainings.service';
import { TrainingQuizService } from './training-quiz.service';
import { TrainingUploadService } from './training-upload.service';
import { TrainingModulesService, CreateModuleDto } from './training-modules.service';
import { Request } from 'express';

@Controller('api/v1')
export class TrainingsController {
  constructor(
    private trainingsService: TrainingsService,
    private quizService: TrainingQuizService,
    private uploadService: TrainingUploadService,
    private modulesService: TrainingModulesService,
  ) {}

  // --- Admin ---
  @Get('admin/trainings')
  @Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
  async listAdmin(@RequireTenantCompanyId() companyId: string): Promise<ApiResponse> {
    const data = await this.trainingsService.list(false, companyId);
    return { success: true, message: 'Trainings retrieved', data };
  }

  @Post('admin/trainings')
  @Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
  async create(
    @Body() dto: CreateTrainingDto,
    @CurrentUser() user: AuthUser,
    @RequireTenantCompanyId() companyId: string,
  ): Promise<ApiResponse> {
    const data = await this.trainingsService.create(dto, user, companyId);
    return { success: true, message: 'Training created', data };
  }

  @Get('admin/trainings/:id')
  @Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
  async getAdmin(@Param('id') id: string): Promise<ApiResponse> {
    const data = await this.trainingsService.getById(id);
    return { success: true, message: 'Training retrieved', data };
  }

  @Get('admin/trainings/:id/enrollments')
  @Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
  async trainingEnrollments(@Param('id') id: string): Promise<ApiResponse> {
    const data = await this.trainingsService.listEnrollmentsForTraining(id);
    return { success: true, message: 'Training enrollments retrieved', data };
  }

  @Patch('admin/trainings/:id')
  @Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateTrainingDto>,
  ): Promise<ApiResponse> {
    const data = await this.trainingsService.update(id, dto);
    return { success: true, message: 'Training updated', data };
  }

  @Post('admin/trainings/:id/publish')
  @Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
  async publish(@Param('id') id: string): Promise<ApiResponse> {
    const data = await this.trainingsService.publish(id);
    return { success: true, message: 'Training published', data };
  }

  @Get('admin/trainings/:id/quiz-template')
  @Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
  async quizTemplate(@Param('id') _id: string, @Res() res: Response) {
    const buffer = await this.quizService.generateTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=quiz-template.xlsx');
    res.send(buffer);
  }

  @Post('admin/trainings/:id/quiz/validate')
  @Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async validateQuiz(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ApiResponse> {
    if (!file?.buffer) throw new BadRequestException('Quiz file is required');
    const data = await this.quizService.validateBuffer(file.buffer);
    return { success: true, message: 'Validation complete', data };
  }

  @Post('admin/trainings/:id/quiz/import')
  @Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async importQuiz(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ApiResponse> {
    if (!file?.buffer) throw new BadRequestException('Quiz file is required');
    const data = await this.quizService.importForTraining(id, file.buffer);
    return { success: true, message: 'Quiz imported', data };
  }

  @Post('admin/trainings/:id/questions')
  @Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
  async addQuestion(
    @Param('id') id: string,
    @Body() dto: CreateQuestionDto,
  ): Promise<ApiResponse> {
    const data = await this.trainingsService.addQuestion(id, dto);
    return { success: true, message: 'Question added', data };
  }

  @Delete('admin/trainings/:id/questions/:questionId')
  @Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
  async deleteQuestion(
    @Param('id') id: string,
    @Param('questionId') questionId: string,
  ): Promise<ApiResponse> {
    const data = await this.trainingsService.deleteQuestion(id, questionId);
    return { success: true, message: 'Question deleted', data };
  }

  @Delete('admin/trainings/:id')
  @Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
  async deleteTraining(@Param('id') id: string): Promise<ApiResponse> {
    const data = await this.trainingsService.delete(id);
    return { success: true, message: 'Training deleted', data };
  }

  @Post('admin/trainings/:id/upload/video')
  @Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async uploadVideo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ApiResponse> {
    if (!file?.buffer) throw new BadRequestException('Video file is required');
    const data = await this.uploadService.uploadVideo(id, file.buffer, file.originalname);
    return { success: true, message: 'Video uploaded', data };
  }

  @Post('admin/trainings/:id/upload/scorm')
  @Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async uploadScorm(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ApiResponse> {
    if (!file?.buffer) throw new BadRequestException('SCORM package file is required');
    const data = await this.uploadService.uploadScorm(id, file.buffer, file.originalname);
    return { success: true, message: 'SCORM package uploaded', data };
  }

  @Get('admin/trainings/:id/modules')
  @Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
  async listModules(@Param('id') id: string): Promise<ApiResponse> {
    const data = await this.modulesService.list(id);
    return { success: true, message: 'Modules retrieved', data };
  }

  @Post('admin/trainings/:id/modules')
  @Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
  async createModule(@Param('id') id: string, @Body() dto: CreateModuleDto): Promise<ApiResponse> {
    const data = await this.modulesService.create(id, dto);
    return { success: true, message: 'Module created', data };
  }

  @Patch('admin/trainings/:trainingId/modules/:moduleId')
  @Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
  async updateModule(
    @Param('moduleId') moduleId: string,
    @Body() dto: Partial<CreateModuleDto>,
  ): Promise<ApiResponse> {
    const data = await this.modulesService.update(moduleId, dto);
    return { success: true, message: 'Module updated', data };
  }

  @Post('admin/trainings/:id/modules/reorder')
  @Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
  async reorderModules(
    @Param('id') id: string,
    @Body() body: { moduleIds: string[] },
  ): Promise<ApiResponse> {
    const data = await this.modulesService.reorder(id, body.moduleIds);
    return { success: true, message: 'Modules reordered', data };
  }

  @Delete('admin/trainings/:trainingId/modules/:moduleId')
  @Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
  async deleteModule(@Param('moduleId') moduleId: string): Promise<ApiResponse> {
    const data = await this.modulesService.delete(moduleId);
    return { success: true, message: 'Module deleted', data };
  }

  // --- Learner ---
  @Get('trainings/assigned')
  async assigned(@CurrentUser() user: AuthUser): Promise<ApiResponse> {
    const data = await this.trainingsService.listAssigned(user);
    return { success: true, message: 'Assigned trainings retrieved', data };
  }

  @Get('trainings/:trainingId/learn')
  async learn(
    @Param('trainingId') trainingId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ApiResponse> {
    const data = await this.trainingsService.getLearnerTraining(trainingId, user);
    return { success: true, message: 'Training retrieved', data };
  }

  @Post('trainings/progress/training-start')
  async trainingStart(
    @Body() body: { enrollmentId: string },
    @CurrentUser() user: AuthUser,
  ): Promise<ApiResponse> {
    const data = await this.trainingsService.markTrainingStarted(body.enrollmentId, user);
    return { success: true, message: 'Training started', data };
  }

  @Post('trainings/progress/video-complete')
  async videoComplete(
    @Body() body: { enrollmentId: string },
    @CurrentUser() user: AuthUser,
  ): Promise<ApiResponse> {
    const data = await this.trainingsService.markVideoComplete(body.enrollmentId, user);
    return { success: true, message: 'Video marked complete', data };
  }

  @Post('trainings/progress/quiz-submit')
  async quizSubmit(
    @Body()
    body: { enrollmentId: string; answers: Record<string, string | string[]>; moduleId?: string },
    @CurrentUser() user: AuthUser,
  ): Promise<ApiResponse> {
    const data = await this.trainingsService.submitQuiz(
      body.enrollmentId,
      user,
      body.answers,
      body.moduleId,
    );
    return { success: true, message: 'Quiz submitted', data };
  }

  @Post('trainings/progress/scorm')
  async scormProgress(
    @Body()
    body: {
      enrollmentId: string;
      score?: number;
      status?: string;
      cmiData?: Record<string, unknown>;
      timeSpentSec?: number;
      moduleId?: string;
    },
    @CurrentUser() user: AuthUser,
  ): Promise<ApiResponse> {
    const data = await this.trainingsService.saveScormProgress(body.enrollmentId, user, body);
    const lesson = (body.status ?? '').toLowerCase();
    if (body.moduleId && (lesson === 'passed' || lesson === 'completed')) {
      await this.modulesService.completeModule(body.enrollmentId, body.moduleId, user.id);
    }
    return { success: true, message: 'SCORM progress saved', data };
  }

  @Post('trainings/progress/module-complete')
  async moduleComplete(
    @Body()
    body: { enrollmentId: string; moduleId: string; signatureText?: string },
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ): Promise<ApiResponse> {
    const data = await this.modulesService.completeModule(body.enrollmentId, body.moduleId, user.id, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      signatureText: body.signatureText,
    });
    return { success: true, message: 'Module completed', data };
  }

  @Get('notifications/my')
  async myNotifications(@CurrentUser() user: AuthUser): Promise<ApiResponse> {
    const data = await this.trainingsService.getLearnerNotifications(user.id);
    return { success: true, message: 'Notifications retrieved', data };
  }

  @Post('notifications/:id/read')
  async markNotificationRead(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ApiResponse> {
    const data = await this.trainingsService.markNotificationRead(id, user.id);
    return { success: true, message: 'Notification marked read', data };
  }
}
