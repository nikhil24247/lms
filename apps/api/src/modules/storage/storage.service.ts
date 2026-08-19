import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
  private client: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor(private config: ConfigService) {
    const endpoint = this.config.get<string>('S3_ENDPOINT', 'http://localhost:9000');
    this.bucket = this.config.get<string>('S3_BUCKET', 'lms-uploads');
    this.publicUrl = this.config.get<string>('S3_PUBLIC_URL', `${endpoint}/${this.bucket}`);

    this.client = new S3Client({
      region: this.config.get<string>('S3_REGION', 'us-east-1'),
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.config.get<string>('S3_ACCESS_KEY', 'minioadmin'),
        secretAccessKey: this.config.get<string>('S3_SECRET_KEY', 'minioadmin'),
      },
    });
  }

  buildVideoKey(courseId: string, moduleId: string, fileName: string): string {
    const ext = path.extname(fileName) || '.mp4';
    return `videos/${courseId}/${moduleId}/${uuidv4()}${ext}`;
  }

  buildDocumentKey(courseId: string, moduleId: string, fileName: string): string {
    const ext = path.extname(fileName) || '.pdf';
    return `documents/${courseId}/${moduleId}/${uuidv4()}${ext}`;
  }

  buildScormPrefix(courseId: string, moduleId: string): string {
    return `scorm/${courseId}/${moduleId}`;
  }

  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }

  async getPresignedUploadUrl(key: string, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.client, command, { expiresIn: 3600 });
  }

  async uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
  }

  async initiateMultipartUpload(key: string, contentType: string): Promise<string> {
    const result = await this.client.send(
      new CreateMultipartUploadCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      }),
    );
    if (!result.UploadId) throw new Error('Failed to initiate multipart upload');
    return result.UploadId;
  }

  async getPresignedPartUrl(key: string, uploadId: string, partNumber: number): Promise<string> {
    const command = new UploadPartCommand({
      Bucket: this.bucket,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });
    return getSignedUrl(this.client, command, { expiresIn: 3600 });
  }

  async completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: { PartNumber: number; ETag: string }[],
  ): Promise<void> {
    await this.client.send(
      new CompleteMultipartUploadCommand({
        Bucket: this.bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts.sort((a, b) => a.PartNumber - b.PartNumber) },
      }),
    );
  }

  async abortMultipartUpload(key: string, uploadId: string): Promise<void> {
    await this.client.send(
      new AbortMultipartUploadCommand({
        Bucket: this.bucket,
        Key: key,
        UploadId: uploadId,
      }),
    );
  }

  async uploadDirectory(localDir: string, s3Prefix: string): Promise<void> {
    const files = this.walkDir(localDir);
    for (const filePath of files) {
      const relative = path.relative(localDir, filePath).replace(/\\/g, '/');
      const key = `${s3Prefix}/${relative}`;
      const buffer = fs.readFileSync(filePath);
      const contentType = this.guessContentType(filePath);
      await this.uploadBuffer(key, buffer, contentType);
    }
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  private walkDir(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...this.walkDir(fullPath));
      } else {
        files.push(fullPath);
      }
    }
    return files;
  }

  private guessContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const map: Record<string, string> = {
      '.html': 'text/html',
      '.htm': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.pdf': 'application/pdf',
    };
    return map[ext] ?? 'application/octet-stream';
  }

  getContentTypeForExtension(fileName: string): string {
    return this.guessContentType(fileName);
  }
}
