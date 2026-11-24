import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import PDFDocument from 'pdfkit';
import AdmZip from 'adm-zip';

const port = 4198; let dataDir; let server; let browser; let context; let page; const consoleErrors = [];
const waitForServer = async () => { for (let i = 0; i < 50; i += 1) { try { await fetch(`http://127.0.0.1:${port}/`); return; } catch { await new Promise(resolve => setTimeout(resolve, 50)); } } throw new Error('E2E server did not start'); };
const waitForText = async (selector, text) => { await page.waitForFunction(([value, expected]) => document.querySelector(value)?.textContent.includes(expected), [selector, text]); };
const pdfFixture = () => new Promise((resolve, reject) => { const doc = new PDFDocument(); const chunks = []; doc.on('data', chunk => chunks.push(chunk)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject); doc.text('Browser PDF source'); doc.end(); });
const docxFixture = () => { const zip = new AdmZip(); zip.addFile('[Content_Types].xml', Buffer.from('<Types/>')); zip.addFile('word/document.xml', Buffer.from('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Browser DOCX source</w:t></w:r></w:p></w:body></w:document>')); return zip.toBuffer(); };
const pptxFixture = () => { const zip = new AdmZip(); zip.addFile('[Content_Types].xml', Buffer.from('<Types/>')); zip.addFile('ppt/slides/slide1.xml', Buffer.from('<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:t>Browser PPTX source</a:t></p:sld>')); return zip.toBuffer(); };

before(async () => {
  dataDir = await mkdtemp(join(tmpdir(), 'mentora-e2e-')); server = spawn(process.execPath, ['dist/server.js'], { env: { ...process.env, PORT: String(port), MENTORA_DATA_DIR: dataDir }, stdio: 'ignore' }); await waitForServer();
  browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' }); context = await browser.newContext(); page = await context.newPage(); page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); }); page.setDefaultTimeout(5000); page.setDefaultNavigationTimeout(5000);
});
after(async () => { await browser?.close(); server?.kill(); await rm(dataDir, { recursive: true, force: true }); });

test('real browser student journey covers core integrated modules', async () => {
  const answers = ['register', 'alice@example.test', 'correct horse battery staple', 'Alice']; page.on('dialog', async dialog => await dialog.accept(answers.shift() ?? ''));
  await page.goto(`http://127.0.0.1:${port}/`); await page.locator('#authBtn').click(); await waitForText('#profileName', 'Alice');

  await page.locator('[data-view="learning"]').click(); await page.locator('#syllabusUpload input[type=file]').setInputFiles({ name: 'networks.txt', mimeType: 'text/plain', buffer: Buffer.from('- OSI Model\n- TCP/IP\n- Routing') }); await page.locator('#syllabusUpload button').click(); await waitForText('#view', 'OSI Model');

  await page.locator('[data-view="tutor"]').click(); await page.locator('#tutorForm input[name=topic]').fill('routing'); await page.locator('#tutorForm button').click(); await waitForText('#answer', 'MENTORA SAYS'); await waitForText('#answer', 'Provider: unavailable');

  await page.locator('[data-view="animations"]').click(); await page.locator('#animationStep').click(); await waitForText('#animationCaption', 'Target is greater'); await page.locator('#animationBack').click(); await waitForText('#animationCaption', 'Inspect the middle'); await page.locator('#animationExplain').click();

  await page.locator('[data-view="focus"]').click(); await waitForText('#monitorCapabilities', 'Live camera diagnostic'); await waitForText('#monitorCapabilities', 'Face model'); await page.locator('#sessionBtn').click(); await waitForText('#view', 'Session active'); await page.locator('#pauseMonitor').click(); await waitForText('#signalText', 'Monitoring paused'); await page.locator('#pauseMonitor').click(); await page.locator('#sessionBtn').click();

  await page.locator('[data-view="settings"]').click(); await page.locator('#warningGrace').fill('8'); await page.locator('#warningSound').selectOption('chime'); await page.locator('#saveWarningPreferences').click(); await waitForText('#warningPreferenceStatus', 'Saved locally'); await page.reload(); await page.locator('[data-view="settings"]').click(); await page.waitForFunction(() => document.querySelector('#warningGrace')?.value === '8');

  await page.locator('[data-view="analytics"]').click(); await waitForText('#view', 'TOTAL LOGGED'); await page.locator('[data-view="library"]').click(); await waitForText('#view', 'My Library');
  for (const file of [{ name: 'browser.pdf', type: 'application/pdf', buffer: await pdfFixture() }, { name: 'browser.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: docxFixture() }, { name: 'browser.pptx', type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', buffer: pptxFixture() }]) { await page.locator('#uploadForm input[type=file]').setInputFiles(file); await page.locator('#uploadForm button').click(); await waitForText('#view', file.name); }
  await page.locator('#authBtn').click(); await waitForText('#profileName', 'Guest learner'); assert.match(await page.locator('#profileEmail').textContent(), /Local mode/); assert.deepEqual(consoleErrors, []);
});

test('browser dashboard has no serious or critical accessibility violations', async () => {
  await page.goto(`http://127.0.0.1:${port}/`); const results = await new AxeBuilder({ page }).analyze(); const serious = results.violations.filter(violation => violation.impact === 'serious' || violation.impact === 'critical'); assert.deepEqual(serious, []);
});
