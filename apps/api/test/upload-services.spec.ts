import { Test, TestingModule } from '@nestjs/testing';
import { ExcelQuizImporterService } from '../src/modules/admin-upload/services/excel-quiz-importer.service';
import { ScormUnpackerService } from '../src/modules/admin-upload/services/scorm-unpacker.service';
import * as ExcelJS from 'exceljs';
import { QUIZ_EXCEL_HEADERS } from '../src/common/utils/file-validation.util';

describe('ExcelQuizImporterService', () => {
  let service: ExcelQuizImporterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExcelQuizImporterService,
        { provide: 'PrismaService', useValue: {} },
      ],
    })
      .overrideProvider(ExcelQuizImporterService)
      .useValue(new ExcelQuizImporterService({} as never))
      .compile();

    service = new ExcelQuizImporterService({} as never);
  });

  async function buildWorkbook(rows: (string | number)[][]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Quiz');
    sheet.addRow([...QUIZ_EXCEL_HEADERS]);
    for (const row of rows) {
      sheet.addRow(row);
    }
    const buf = await workbook.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  it('parses valid quiz rows', async () => {
    const buffer = await buildWorkbook([
      ['What is phishing?', 'Email fraud', 'A fish', 'Protocol', 'Query', 'A', 1, 'Explanation'],
    ]);

    const { rows, errors } = await service.parseWorkbook(buffer);
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0].correctOption).toBe('A');
  });

  it('returns error for invalid correct option', async () => {
    const buffer = await buildWorkbook([
      ['Question?', 'A', 'B', 'C', 'D', 'E', 1, ''],
    ]);

    const { errors } = await service.parseWorkbook(buffer);
    expect(errors.some((e) => e.includes("CorrectOption 'E' invalid"))).toBe(true);
  });

  it('returns error for missing question text', async () => {
    const buffer = await buildWorkbook([
      ['', 'A', 'B', 'C', 'D', 'A', 1, ''],
    ]);

    const { errors } = await service.parseWorkbook(buffer);
    expect(errors.some((e) => e.includes('Missing question text'))).toBe(true);
  });
});

describe('ScormUnpackerService', () => {
  let service: ScormUnpackerService;

  beforeEach(() => {
    service = new ScormUnpackerService({} as never, {} as never);
  });

  const scorm12Manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="test" version="1.0">
  <organizations default="org1">
    <organization identifier="org1">
      <title>Test Course</title>
      <item identifier="item1" identifierref="res1">
        <title>Launch</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res1" type="webcontent" adlcp:scormtype="sco" href="index.html"
      xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"/>
  </resources>
</manifest>`;

  it('parses SCORM 1.2 manifest entry point', () => {
    const result = service.parseManifest(scorm12Manifest);
    expect(result.errors).toHaveLength(0);
    expect(result.entryPoint).toBe('index.html');
    expect(result.scormVersion).toBe('SCORM 1.2');
  });

  it('returns error when manifest has no launch file', () => {
    const badManifest = `<?xml version="1.0"?><manifest identifier="x"><resources/></manifest>`;
    const result = service.parseManifest(badManifest);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
