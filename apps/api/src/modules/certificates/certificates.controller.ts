import { Controller, Get, Post, Delete, Param, Res, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { UserRole } from '@prisma/client';
import { ApiResponse } from '@lms/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { CertificatesService } from './certificates.service';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('api/v1')
export class CertificatesController {
  constructor(
    private certificates: CertificatesService,
    private storage: StorageService,
    private prisma: PrismaService,
  ) {}

  @Get('admin/certificates')
  @Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
  async listAll(@CurrentUser() user: AuthUser): Promise<ApiResponse> {
    const data = await this.certificates.listAll(user.companyId);
    return { success: true, message: 'Certificates retrieved', data };
  }

  /** Admin's own certificates when they are also enrolled in training. */
  @Get('admin/certificates/my')
  @Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.LINE_MANAGER)
  async myAdminCertificates(@CurrentUser() user: AuthUser): Promise<ApiResponse> {
    const data = await this.certificates.listForUser(user.id);
    return { success: true, message: 'Certificates retrieved', data };
  }

  @Delete('admin/certificates/:id')
  @Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
  async delete(@Param('id') id: string): Promise<ApiResponse> {
    const data = await this.certificates.delete(id);
    return { success: true, message: 'Certificate deleted', data };
  }

  @Get('admin/trainings/:id/certificate-preview')
  @Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
  async preview(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.certificates.preview(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename=certificate-preview.pdf');
    res.send(buffer);
  }

  @Get('certificates/my')
  async myCertificates(@CurrentUser() user: AuthUser): Promise<ApiResponse> {
    const data = await this.certificates.listForUser(user.id);
    return { success: true, message: 'Certificates retrieved', data };
  }

  @Post('admin/trainings/:id/certificate-template')
  @Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async uploadTemplate(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ApiResponse> {
    if (!file?.buffer) throw new BadRequestException('Template file is required');
    const key = `trainings/${id}/certificate-template/${file.originalname}`;
    await this.storage.uploadBuffer(key, file.buffer, file.mimetype);
    const url = this.storage.getPublicUrl(key);
    await this.prisma.training.update({ where: { id }, data: { certificateTemplateUrl: url } });
    return { success: true, message: 'Template uploaded', data: { certificateTemplateUrl: url } };
  }
}
