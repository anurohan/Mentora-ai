import assert from 'node:assert/strict';
import { test } from 'node:test';
import PDFDocument from 'pdfkit';
import AdmZip from 'adm-zip';
import { DocumentExtractionError, extractDocument } from '../dist/extraction.js';

const pdfFixture = () => new Promise((resolve, reject) => {
  const doc = new PDFDocument(); const chunks = [];
  doc.on('data', chunk => chunks.push(chunk)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject);
  doc.fontSize(14).text('PDF page one source'); doc.addPage().fontSize(14).text('PDF page two source'); doc.end();
});
const docxFixture = () => {
  const zip = new AdmZip(); zip.addFile('[Content_Types].xml', Buffer.from('<Types/>')); zip.addFile('word/document.xml', Buffer.from(`<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Course heading</w:t></w:r></w:p><w:p><w:r><w:t>Paragraph source</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Cell A</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Cell B</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>`)); return zip.toBuffer();
};
const pptxFixture = () => {
  const zip = new AdmZip(); zip.addFile('[Content_Types].xml', Buffer.from('<Types/>')); zip.addFile('ppt/slides/slide1.xml', Buffer.from('<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:t>Slide one</a:t></p:sld>')); zip.addFile('ppt/slides/slide2.xml', Buffer.from('<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:t>Slide two</a:t></p:sld>')); return zip.toBuffer();
};

test('PDF extraction preserves page provenance and progress', async () => {
  const progress = []; const segments = await extractDocument({ documentId: 'pdf-1', originalFilename: 'lesson.pdf', mimeType: 'application/pdf', buffer: await pdfFixture(), onProgress: value => progress.push(value.phase) });
  assert.equal(segments.length, 2); assert.deepEqual(segments.map(item => item.pageNumber), [1, 2]); assert.match(segments[0].sourceText, /page one/); assert.ok(progress.includes('validated') && progress.includes('complete')); assert.equal(segments[0].documentId, 'pdf-1');
});

test('DOCX extraction preserves headings, paragraphs, and table rows', async () => {
  const segments = await extractDocument({ documentId: 'docx-1', originalFilename: 'lesson.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: docxFixture() });
  assert.equal(segments.length, 3); assert.equal(segments[0].section, 'Course heading'); assert.equal(segments[1].sourceText, 'Paragraph source'); assert.equal(segments[2].section, 'table'); assert.match(segments[2].sourceText, /Cell A \| Cell B/);
});

test('PPTX extraction preserves slide numbers and source text', async () => {
  const segments = await extractDocument({ documentId: 'pptx-1', originalFilename: 'lesson.pptx', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', buffer: pptxFixture() });
  assert.deepEqual(segments.map(item => item.slideNumber), [1, 2]); assert.deepEqual(segments.map(item => item.sourceText), ['Slide one', 'Slide two']);
});

test('empty, malformed, unsupported, and oversized documents fail honestly', async () => {
  await assert.rejects(() => extractDocument({ documentId: 'empty', originalFilename: 'empty.txt', mimeType: 'text/plain', buffer: Buffer.from('\n') }), error => error instanceof DocumentExtractionError && error.code === 'EMPTY');
  await assert.rejects(() => extractDocument({ documentId: 'bad', originalFilename: 'bad.pdf', mimeType: 'application/pdf', buffer: Buffer.from('not pdf') }), error => error instanceof DocumentExtractionError && error.code === 'MALFORMED');
  await assert.rejects(() => extractDocument({ documentId: 'bad-type', originalFilename: 'bad.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('x') }), error => error instanceof DocumentExtractionError && error.code === 'UNSUPPORTED_TYPE');
  await assert.rejects(() => extractDocument({ documentId: 'large', originalFilename: 'large.txt', mimeType: 'text/plain', buffer: Buffer.alloc(10 * 1024 * 1024 + 1) }), error => error instanceof DocumentExtractionError && error.code === 'TOO_LARGE');
});
