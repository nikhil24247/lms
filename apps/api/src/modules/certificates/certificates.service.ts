import { Injectable, NotFoundException } from '@nestjs/common';
import { CertificateType, EnrollmentStatus } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class CertificatesService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async issueForEnrollment(enrollmentId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        training: true,
        user: { include: { department: true } },
        assessmentAttempts: { orderBy: { score: 'desc' }, take: 1 },
      },
    });
    if (!enrollment || enrollment.status !== EnrollmentStatus.COMPLETED) return null;

    const existing = await this.prisma.certificate.findUnique({ where: { enrollmentId } });
    if (existing) return existing;

    const training = enrollment.training;
    if (!training.certificateEnabled) return null;
    const bestScore = enrollment.assessmentAttempts[0]?.score ?? enrollment.scormScore ?? null;
    const passing = training.certificateMinScore ?? training.passingScorePercentage;
    const isPassed = bestScore == null || bestScore >= passing;

    let certType = training.certificateType;
    if (certType === CertificateType.COMPLETION_PASS && !isPassed) {
      if (!training.participationCertEnabled) return null;
      certType = CertificateType.PARTICIPATION;
    }

    const pdfBuffer = await this.generatePdf({
      learnerName: enrollment.user.fullName,
      trainingTitle: training.title,
      type: certType,
      score: bestScore,
      issuedAt: enrollment.completedAt ?? new Date(),
      department: enrollment.user.department?.name ?? '',
      templateUrl: training.certificateTemplateUrl,
    });

    const certNumber = `CERT-${Date.now().toString(36).toUpperCase()}-${uuidv4().slice(0, 6).toUpperCase()}`;
    const key = `certificates/${enrollment.userId}/${certNumber}.pdf`;
    await this.storage.uploadBuffer(key, pdfBuffer, 'application/pdf');
    const pdfUrl = this.storage.getPublicUrl(key);

    return this.prisma.certificate.create({
      data: {
        enrollmentId,
        userId: enrollment.userId,
        trainingId: enrollment.trainingId,
        type: certType,
        certificateNumber: certNumber,
        score: bestScore,
        isPassed,
        pdfUrl,
      },
    });
  }

  async preview(trainingId: string, learnerName = 'Sample Learner') {
    const training = await this.prisma.training.findUnique({ where: { id: trainingId } });
    if (!training) throw new NotFoundException('Training not found');

    return this.generatePdf({
      learnerName,
      trainingTitle: training.title,
      type: training.certificateType,
      score: 92,
      issuedAt: new Date(),
      department: 'Sample Department',
      templateUrl: training.certificateTemplateUrl,
    });
  }

  async listForUser(userId: string) {
    // Backfill missing certs for completed enrollments (admins included)
    await this.ensureIssuedForUser(userId);
    return this.prisma.certificate.findMany({
      where: { userId },
      include: { training: { select: { title: true, type: true } } },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async listAll(companyId?: string | null) {
    return this.prisma.certificate.findMany({
      where: companyId
        ? { user: { companyId } }
        : undefined,
      include: {
        user: { select: { id: true, fullName: true, email: true, role: true } },
        training: { select: { title: true } },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  /** Issue certificates for any completed enrollments that are missing one. */
  async ensureIssuedForUser(userId: string) {
    const pending = await this.prisma.enrollment.findMany({
      where: {
        userId,
        status: EnrollmentStatus.COMPLETED,
        certificates: { none: {} },
        training: { certificateEnabled: true },
      },
      select: { id: true },
    });
    for (const e of pending) {
      try {
        await this.issueForEnrollment(e.id);
      } catch {
        // ponytail: skip failed PDF gen so listing still works
      }
    }
  }

  async delete(id: string) {
    const cert = await this.prisma.certificate.findUnique({ where: { id } });
    if (!cert) throw new NotFoundException('Certificate not found');
    await this.prisma.certificate.delete({ where: { id } });
    return { deleted: true };
  }

  private async generatePdf(data: {
    learnerName: string;
    trainingTitle: string;
    type: CertificateType;
    score: number | null;
    issuedAt: Date;
    department: string;
    templateUrl: string | null;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ layout: 'landscape', size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60).stroke('#4f46e5');

      doc.fontSize(28).fillColor('#1e1b4b').text('Certificate of Achievement', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).fillColor('#64748b').text('This certifies that', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(22).fillColor('#0f172a').text(data.learnerName, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).fillColor('#64748b').text('has successfully completed', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(18).fillColor('#4f46e5').text(data.trainingTitle, { align: 'center' });
      doc.moveDown();

      const typeLabel =
        data.type === CertificateType.COMPLETION_PASS
          ? 'Completion / Passing Certificate'
          : 'Participation Certificate';
      doc.fontSize(11).fillColor('#64748b').text(typeLabel, { align: 'center' });

      if (data.score != null) {
        doc.moveDown(0.5);
        doc.text(`Score: ${data.score.toFixed(0)}%`, { align: 'center' });
      }

      doc.moveDown();
      doc.fontSize(10).text(`Department: ${data.department}`, { align: 'center' });
      doc.text(`Issued: ${data.issuedAt.toLocaleDateString()}`, { align: 'center' });

      if (data.templateUrl) {
        doc.moveDown();
        doc.fontSize(8).fillColor('#94a3b8').text(`Branded template: ${data.templateUrl}`, { align: 'center' });
      }

      doc.end();
    });
  }
}
