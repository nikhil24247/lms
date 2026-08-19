import { Injectable, BadRequestException } from '@nestjs/common';
import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { isZipBuffer } from '../../common/utils/file-validation.util';
import { TrainingsService } from './trainings.service';

@Injectable()
export class TrainingUploadService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private trainingsService: TrainingsService,
  ) {}

  async uploadVideo(trainingId: string, buffer: Buffer, fileName: string) {
    if (!fileName.toLowerCase().endsWith('.mp4')) {
      throw new BadRequestException('Only MP4 videos are supported');
    }
    const key = `trainings/${trainingId}/video/${fileName}`;
    await this.storage.uploadBuffer(key, buffer, 'video/mp4');
    const videoUrl = this.storage.getPublicUrl(key);
    await this.trainingsService.setVideoUrl(trainingId, videoUrl);
    return { videoUrl };
  }

  async uploadScorm(trainingId: string, buffer: Buffer, fileName: string) {
    if (!isZipBuffer(buffer)) {
      throw new BadRequestException('SCORM package must be a ZIP file');
    }

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scorm-'));
    try {
      const zip = new AdmZip(buffer);
      zip.extractAllTo(tmpDir, true);

      const manifestPath = this.findManifest(tmpDir);
      if (!manifestPath) {
        throw new BadRequestException('Invalid SCORM: imsmanifest.xml not found');
      }

      const xml = fs.readFileSync(manifestPath, 'utf-8');
      const parsed = this.parseManifest(xml);
      if (parsed.errors.length > 0) {
        throw new BadRequestException(parsed.errors.join('; '));
      }

      const prefix = `trainings/${trainingId}/scorm/`;
      await this.uploadDir(tmpDir, prefix);

      const contentUrl = this.storage.getPublicUrl(prefix);
      await this.trainingsService.setScormContent(trainingId, {
        scormContentUrl: contentUrl,
        scormEntryPoint: parsed.entryPoint,
        scormVersion: parsed.scormVersion,
      });

      return {
        scormContentUrl: contentUrl,
        scormEntryPoint: parsed.entryPoint,
        scormVersion: parsed.scormVersion,
      };
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  async uploadScormForContentAsset(assetId: string, buffer: Buffer) {
    if (!isZipBuffer(buffer)) {
      throw new BadRequestException('SCORM package must be a ZIP file');
    }

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scorm-'));
    try {
      const zip = new AdmZip(buffer);
      zip.extractAllTo(tmpDir, true);

      const manifestPath = this.findManifest(tmpDir);
      if (!manifestPath) {
        throw new BadRequestException('Invalid SCORM: imsmanifest.xml not found');
      }

      const xml = fs.readFileSync(manifestPath, 'utf-8');
      const parsed = this.parseManifest(xml);
      if (parsed.errors.length > 0) {
        throw new BadRequestException(parsed.errors.join('; '));
      }

      const prefix = `content/${assetId}/scorm/`;
      await this.uploadDir(tmpDir, prefix);

      return {
        scormContentUrl: this.storage.getPublicUrl(prefix),
        scormEntryPoint: parsed.entryPoint,
        scormVersion: parsed.scormVersion,
      };
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  private findManifest(dir: string): string | null {
    const root = path.join(dir, 'imsmanifest.xml');
    if (fs.existsSync(root)) return root;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const found = this.findManifest(path.join(dir, entry.name));
        if (found) return found;
      }
    }
    return null;
  }

  private parseManifest(xmlContent: string) {
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const parsed = parser.parse(xmlContent) as Record<string, unknown>;
    const manifest = parsed['manifest'] as Record<string, unknown> | undefined;
    if (!manifest) {
      return { entryPoint: '', scormVersion: 'unknown', errors: ['Invalid imsmanifest.xml'] };
    }

    const versionStr = JSON.stringify(manifest).toLowerCase();
    const scormVersion = versionStr.includes('2004') || versionStr.includes('cam 1.3')
      ? 'SCORM 2004'
      : 'SCORM 1.2';

    const organizations = manifest['organizations'] as Record<string, unknown> | undefined;
    const org = organizations?.['organization'] as Record<string, unknown> | Record<string, unknown>[] | undefined;
    const firstOrg = Array.isArray(org) ? org[0] : org;
    const item = firstOrg?.['item'] as Record<string, unknown> | Record<string, unknown>[] | undefined;
    const firstItem = Array.isArray(item) ? item[0] : item;
    const identifierref = String(firstItem?.['@_identifierref'] ?? '');

    const resources = manifest['resources'] as Record<string, unknown> | undefined;
    const resource = resources?.['resource'] as Record<string, unknown> | Record<string, unknown>[] | undefined;
    const resourceList = Array.isArray(resource) ? resource : resource ? [resource] : [];

    let entryPoint = '';
    if (identifierref) {
      const matched = resourceList.find((r) => String(r['@_identifier']) === identifierref);
      entryPoint = String(matched?.['@_href'] ?? '');
    }
    if (!entryPoint && resourceList.length > 0) {
      entryPoint = String(resourceList[0]['@_href'] ?? '');
    }

    if (!entryPoint) {
      return { entryPoint: '', scormVersion, errors: ['Could not find launch file in manifest'] };
    }

    return { entryPoint, scormVersion, errors: [] as string[] };
  }

  private async uploadDir(localDir: string, s3Prefix: string) {
    const entries = fs.readdirSync(localDir, { withFileTypes: true });
    for (const entry of entries) {
      const localPath = path.join(localDir, entry.name);
      const key = s3Prefix + entry.name;
      if (entry.isDirectory()) {
        await this.uploadDir(localPath, key + '/');
      } else {
        const buffer = fs.readFileSync(localPath);
        await this.storage.uploadBuffer(key, buffer, this.guessMime(entry.name));
      }
    }
  }

  private guessMime(name: string): string {
    const ext = path.extname(name).toLowerCase();
    const map: Record<string, string> = {
      '.html': 'text/html',
      '.htm': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.xml': 'application/xml',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
    };
    return map[ext] ?? 'application/octet-stream';
  }
}
