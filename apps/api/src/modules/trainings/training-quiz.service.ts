import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { QuestionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TrainingsService, CreateQuestionDto } from './trainings.service';

export const QUIZ_TEMPLATE_HEADERS = [
  'Question',
  'Option A',
  'Option B',
  'Option C',
  'Option D',
  'Option E',
  'Option F',
  'Correct Answer',
] as const;

interface ParsedRow {
  rowNumber: number;
  questionText: string;
  options: string[];
  correctAnswers: string[];
}

@Injectable()
export class TrainingQuizService {
  constructor(
    private prisma: PrismaService,
    private trainingsService: TrainingsService,
  ) {}

  async generateTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Quiz');
    sheet.addRow([...QUIZ_TEMPLATE_HEADERS]);
    sheet.addRow([
      'What is phishing?',
      'A fraudulent email attempt',
      'A type of antivirus',
      'A firewall rule',
      'A VPN protocol',
      '',
      '',
      'A',
    ]);
    sheet.addRow([
      'Select security best practices (multi-answer)',
      'Use strong passwords',
      'Share credentials',
      'Enable MFA',
      'Click unknown links',
      'Report suspicious emails',
      '',
      'A,C,E',
    ]);
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async validateBuffer(buffer: Buffer) {
    const { rows, errors } = await this.parseWorkbook(buffer);
    return { valid: errors.length === 0, rowCount: rows.length, errors, preview: rows.slice(0, 3) };
  }

  async importForTraining(trainingId: string, buffer: Buffer) {
    const { rows, errors } = await this.parseWorkbook(buffer);
    if (errors.length > 0) {
      return { imported: 0, errors };
    }

    const questions: CreateQuestionDto[] = rows.map((row) => {
      const correctSet = new Set(row.correctAnswers);
      const options = row.options.map((text, i) => ({
        optionText: text,
        isCorrect: correctSet.has(String.fromCharCode(65 + i)),
      }));
      return {
        questionText: row.questionText,
        options,
        points: 1,
      };
    });

    await this.trainingsService.replaceQuestions(trainingId, questions);
    return { imported: questions.length, errors: [] };
  }

  async importForContentAsset(
    assetId: string,
    buffer: Buffer,
    importFn: (questions: Array<{
      questionText: string;
      options: { optionText: string; isCorrect: boolean }[];
      points?: number;
    }>) => Promise<{ imported: number }>,
  ) {
    const { rows, errors } = await this.parseWorkbook(buffer);
    if (errors.length > 0) return { imported: 0, errors };

    const questions = rows.map((row) => {
      const correctSet = new Set(row.correctAnswers);
      const options = row.options.map((text, i) => ({
        optionText: text,
        isCorrect: correctSet.has(String.fromCharCode(65 + i)),
      }));
      return { questionText: row.questionText, options, points: 1 };
    });

    const result = await importFn(questions);
    return { imported: result.imported, errors: [] };
  }

  async getTemplateBuffer(): Promise<Buffer> {
    return this.generateTemplate();
  }

  private async parseWorkbook(buffer: Buffer): Promise<{ rows: ParsedRow[]; errors: string[] }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) return { rows: [], errors: ['Workbook has no sheets'] };

    const headerRow = sheet.getRow(1);
    const headers = QUIZ_TEMPLATE_HEADERS.map((_, i) =>
      String(headerRow.getCell(i + 1).value ?? '').trim(),
    );

    const errors: string[] = [];
    if (headers[0] !== 'Question') errors.push('Column A must be "Question"');
    if (!headers[7]?.toLowerCase().includes('correct')) {
      errors.push('Column H must be "Correct Answer"');
    }
    if (errors.length > 0) return { rows: [], errors };

    const rows: ParsedRow[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const question = String(row.getCell(1).value ?? '').trim();
      if (!question) return;

      const options: string[] = [];
      for (let col = 2; col <= 7; col++) {
        const val = String(row.getCell(col).value ?? '').trim();
        if (val) options.push(val);
      }

      const correctRaw = String(row.getCell(8).value ?? '').trim().toUpperCase();
      const correctAnswers = correctRaw
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean);

      if (options.length < 2) {
        errors.push(`Row ${rowNumber}: At least 2 options required`);
        return;
      }
      if (correctAnswers.length === 0) {
        errors.push(`Row ${rowNumber}: Correct Answer is required (e.g. A or A,C)`);
        return;
      }
      for (const letter of correctAnswers) {
        const idx = letter.charCodeAt(0) - 65;
        if (idx < 0 || idx >= options.length) {
          errors.push(`Row ${rowNumber}: Correct answer "${letter}" has no matching option`);
        }
      }

      rows.push({ rowNumber, questionText: question, options, correctAnswers });
    });

    if (rows.length === 0 && errors.length === 0) {
      errors.push('No quiz questions found in file');
    }

    return { rows, errors };
  }
}
