import { Body, Controller, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ApiResponse } from '@lms/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { UploadService } from './upload.service';

@Controller('api/v1/admin/upload')
@Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
export class UploadController {
  constructor(private upload: UploadService) {}

  @Post('presigned-url')
  async initiate(
    @Body()
    body: {
      fileName: string;
      fileSize: number;
      contentType?: string;
      trainingId?: string;
      contentAssetId?: string;
      moduleId?: string;
    },
  ): Promise<ApiResponse> {
    const data = await this.upload.initiateMultipart({
      fileName: body.fileName,
      fileSize: body.fileSize,
      contentType: body.contentType,
      trainingId: body.trainingId ?? body.moduleId,
      contentAssetId: body.contentAssetId,
    });
    return { success: true, message: 'Upload initiated', data };
  }

  @Post('presigned-url/part')
  async partUrl(
    @Body() body: { uploadSessionId: string; partNumber: number },
  ): Promise<ApiResponse> {
    const data = await this.upload.getPartUrl(body.uploadSessionId, body.partNumber);
    return { success: true, message: 'Part URL generated', data };
  }

  @Post('presigned-url/complete')
  async complete(
    @Body()
    body: { uploadSessionId: string; parts: { partNumber: number; etag: string }[] },
  ): Promise<ApiResponse> {
    const data = await this.upload.completeMultipart(body.uploadSessionId, body.parts);
    return { success: true, message: 'Upload completed', data };
  }

  @Post('presigned-url/abort')
  async abort(@Body() body: { uploadSessionId: string }): Promise<ApiResponse> {
    const data = await this.upload.abortMultipart(body.uploadSessionId);
    return { success: true, message: 'Upload aborted', data };
  }
}
