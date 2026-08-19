import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { UserRole } from '@prisma/client';
import { ApiResponse } from '@lms/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { RequireTenantCompanyId } from '../../common/decorators/tenant.decorator';
import {
  ContentLibraryService,
  CreateContentAssetDto,
  ContentAssetFilters,
} from './content-library.service';
import { TrainingQuizService } from '../trainings/training-quiz.service';
import { TrainingUploadService } from '../trainings/training-upload.service';

@Controller('api/v1/admin/content-library')
@Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
export class ContentLibraryController {
  constructor(
    private contentLibrary: ContentLibraryService,
    private quizService: TrainingQuizService,
    private uploadService: TrainingUploadService,
  ) {}

  @Get()
  async list(
    @Query() query: ContentAssetFilters,
    @RequireTenantCompanyId() companyId: string,
  ): Promise<ApiResponse> {
    const data = await this.contentLibrary.list({ ...query, companyId });
    return { success: true, message: 'Content assets retrieved', data };
  }

  @Get('categories')
  async categories(@RequireTenantCompanyId() companyId: string): Promise<ApiResponse> {
    const data = await this.contentLibrary.getCategories(companyId);
    return { success: true, message: 'Categories retrieved', data };
  }

  @Get('quiz-template')
  async quizTemplate(@Res() res: Response) {
    const buffer = await this.quizService.getTemplateBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="quiz-template.xlsx"');
    res.send(buffer);
  }

  @Post()
  async create(
    @Body() dto: CreateContentAssetDto,
    @CurrentUser() user: AuthUser,
    @RequireTenantCompanyId() companyId: string,
  ): Promise<ApiResponse> {
    const data = await this.contentLibrary.create(dto, user, companyId);
    return { success: true, message: 'Content asset created', data };
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<ApiResponse> {
    const data = await this.contentLibrary.getById(id);
    return { success: true, message: 'Content asset retrieved', data };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateContentAssetDto>): Promise<ApiResponse> {
    const data = await this.contentLibrary.update(id, dto);
    return { success: true, message: 'Content asset updated', data };
  }

  @Delete(':id')
  async archive(@Param('id') id: string): Promise<ApiResponse> {
    const data = await this.contentLibrary.archive(id);
    return { success: true, message: 'Content asset archived', data };
  }

  @Post(':id/apply/:trainingId')
  async apply(
    @Param('id') id: string,
    @Param('trainingId') trainingId: string,
  ): Promise<ApiResponse> {
    const data = await this.contentLibrary.applyToTraining(trainingId, id);
    return { success: true, message: 'Asset applied to training', data };
  }

  @Post(':id/document')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ApiResponse> {
    if (!file?.buffer) throw new BadRequestException('File is required');
    const data = await this.contentLibrary.uploadDocument(id, file.buffer, file.originalname, file.mimetype);
    return { success: true, message: 'Document uploaded', data };
  }

  @Post(':id/scorm')
  @UseInterceptors(FileInterceptor('file'))
  async uploadScorm(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ApiResponse> {
    if (!file?.buffer) throw new BadRequestException('SCORM ZIP file is required');
    const scorm = await this.uploadService.uploadScormForContentAsset(id, file.buffer);
    const data = await this.contentLibrary.setScormContent(id, scorm);
    return { success: true, message: 'SCORM package uploaded', data };
  }

  @Post(':id/quiz')
  @UseInterceptors(FileInterceptor('file'))
  async uploadQuiz(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ApiResponse> {
    if (!file?.buffer) throw new BadRequestException('Quiz file is required');
    const data = await this.quizService.importForContentAsset(id, file.buffer, (questions) =>
      this.contentLibrary.importQuizQuestions(id, questions),
    );
    return { success: true, message: 'Quiz imported', data };
  }
}
