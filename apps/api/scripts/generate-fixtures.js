const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const fixturesDir = path.join(__dirname, '..', 'test-fixtures');
fs.mkdirSync(fixturesDir, { recursive: true });

// Generate sample quiz via API template logic - use exceljs
async function generateQuiz() {
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Quiz');
  const headers = [
    'QuestionText', 'OptionA', 'OptionB', 'OptionC', 'OptionD',
    'CorrectOption', 'Points', 'Explanation',
  ];
  sheet.addRow(headers);
  sheet.addRow([
    'What is phishing?',
    'A fraudulent email attempt',
    'A type of fish',
    'A network protocol',
    'A database query',
    'A', 1,
    'Phishing uses deceptive emails to steal credentials.',
  ]);
  sheet.addRow([
    'Which is a strong password practice?',
    'Use the same password everywhere',
    'Share passwords with colleagues',
    'Use unique passwords per account',
    'Write passwords on sticky notes',
    'C', 1,
    'Unique passwords limit breach impact.',
  ]);
  const buf = await workbook.xlsx.writeBuffer();
  fs.writeFileSync(path.join(fixturesDir, 'sample-quiz.xlsx'), Buffer.from(buf));
  console.log('Created sample-quiz.xlsx');
}

function generateScorm() {
  const tempDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'scorm-fix-'));
  const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="sample-scorm" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2">
  <organizations default="org1">
    <organization identifier="org1">
      <title>Sample SCORM Course</title>
      <item identifier="item1" identifierref="res1">
        <title>Launch</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res1" type="webcontent" adlcp:scormtype="sco" href="index.html"/>
  </resources>
</manifest>`;

  fs.writeFileSync(path.join(tempDir, 'imsmanifest.xml'), manifest);
  fs.writeFileSync(
    path.join(tempDir, 'index.html'),
    '<!DOCTYPE html><html><head><title>SCORM Sample</title></head><body><h1>Sample SCORM Content</h1><script>if(window.API)API.LMSInitialize("");</script></body></html>',
  );

  const zip = new AdmZip();
  zip.addLocalFolder(tempDir);
  zip.writeZip(path.join(fixturesDir, 'sample-scorm.zip'));
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log('Created sample-scorm.zip');
}

generateQuiz().then(() => {
  generateScorm();
}).catch(console.error);
