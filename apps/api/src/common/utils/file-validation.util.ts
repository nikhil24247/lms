export function isMp4Buffer(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  const ftyp = buffer.subarray(4, 8).toString('ascii');
  return ftyp === 'ftyp';
}

export function isZipBuffer(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  return buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
}

export function isXlsxBuffer(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  return isZipBuffer(buffer);
}

export const QUIZ_EXCEL_HEADERS = [
  'QuestionText',
  'OptionA',
  'OptionB',
  'OptionC',
  'OptionD',
  'CorrectOption',
  'Points',
  'Explanation',
] as const;

export type QuizExcelHeader = (typeof QUIZ_EXCEL_HEADERS)[number];

export interface ParsedQuizRow {
  rowNumber: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  points: number;
  explanation: string;
}
