import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MAX_VIDEO_SIZE_BYTES, MULTIPART_CHUNK_SIZE, ALLOWED_VIDEO_EXTENSIONS } from '@lms/shared';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ContentLibraryService } from '../content-library/content-library.service';

@Injectable()
export class UploadService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private contentLibrary: ContentLibraryService,
  ) {}

  async initiateMultipart(dto: {
    fileName: string;
    fileSize: number;
    contentType?: string;
    trainingId?: string;
    contentAssetId?: string;
  }) {
    if (dto.fileSize > MAX_VIDEO_SIZE_BYTES) {
      throw new BadRequestException(`File exceeds max size of ${MAX_VIDEO_SIZE_BYTES} bytes`);
    }
    const ext = path.extname(dto.fileName).toLowerCase();
    if (!ALLOWED_VIDEO_EXTENSIONS.includes(ext as (typeof ALLOWED_VIDEO_EXTENSIONS)[number])) {
      throw new BadRequestException(`Allowed formats: ${ALLOWED_VIDEO_EXTENSIONS.join(', ')}`);
    }
    if (!dto.trainingId && !dto.contentAssetId) {
      throw new BadRequestException('trainingId or contentAssetId is required');
    }

    const ownerId = dto.trainingId ?? dto.contentAssetId!;
    const key = this.storage.buildVideoKey('uploads', ownerId, dto.fileName);
    const uploadId = await this.storage.initiateMultipartUpload(key, dto.contentType ?? 'video/mp4');
    const totalParts = Math.ceil(dto.fileSize / MULTIPART_CHUNK_SIZE);

    const session = await this.prisma.multipartUpload.create({
      data: {
        trainingId: dto.trainingId,
        contentAssetId: dto.contentAssetId,
        uploadKey: key,
        s3UploadId: uploadId,
        fileName: dto.fileName,
        fileSize: BigInt(dto.fileSize),
        contentType: dto.contentType ?? 'video/mp4',
      },
    });

    return { uploadSessionId: session.id, totalParts, partSize: MULTIPART_CHUNK_SIZE };
  }

  async getPartUrl(uploadSessionId: string, partNumber: number) {
    const session = await this.getSession(uploadSessionId);
    const presignedUrl = await this.storage.getPresignedPartUrl(
      session.uploadKey,
      session.s3UploadId,
      partNumber,
    );
    return { presignedUrl, partNumber };
  }

  async completeMultipart(
    uploadSessionId: string,
    parts: { partNumber: number; etag: string }[],
  ) {
    const session = await this.getSession(uploadSessionId);
    await this.storage.completeMultipartUpload(
      session.uploadKey,
      session.s3UploadId,
      parts.map((p) => ({ PartNumber: p.partNumber, ETag: p.etag })),
    );

    const videoUrl = this.storage.getPublicUrl(session.uploadKey);
    await this.prisma.multipartUpload.update({
      where: { id: uploadSessionId },
      data: { status: 'COMPLETED' },
    });

    if (session.contentAssetId) {
      await this.contentLibrary.setVideoUrl(session.contentAssetId, videoUrl);
    }
    if (session.trainingId) {
      await this.prisma.training.update({
        where: { id: session.trainingId },
        data: { videoUrl },
      });
    }

    return { videoUrl, uploadSessionId };
  }

  async abortMultipart(uploadSessionId: string) {
    const session = await this.getSession(uploadSessionId);
    await this.storage.abortMultipartUpload(session.uploadKey, session.s3UploadId);
    await this.prisma.multipartUpload.update({
      where: { id: uploadSessionId },
      data: { status: 'ABORTED' },
    });
    return { aborted: true };
  }

  private async getSession(id: string) {
    const session = await this.prisma.multipartUpload.findUnique({ where: { id } });
    if (!session || session.status !== 'IN_PROGRESS') {
      throw new NotFoundException('Upload session not found or already completed');
    }
    return session;
  }
}
