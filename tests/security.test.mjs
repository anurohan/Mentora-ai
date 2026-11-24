import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';

const port = 4197;
let dataDir;
let server;
const request = async (path, options = {}) => {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) } });
  const body = response.status === 204 ? null : (response.headers.get('content-type')?.includes('application/json') ? await response.json() : await response.text());
  return { response, body };
};
const auth = token => ({ Authorization: `Bearer ${token}` });
const startServer = () => spawn(process.execPath, ['dist/server.js'], { env: { ...process.env, PORT: String(port), MENTORA_DATA_DIR: dataDir }, stdio: 'ignore' });
const waitForServer = async () => { for (let i = 0; i < 40; i += 1) { try { await fetch(`http://127.0.0.1:${port}/`); return; } catch { await new Promise(resolve => setTimeout(resolve, 50)); } } throw new Error('Test server did not start'); };

before(async () => {
  dataDir = await mkdtemp(join(tmpdir(), 'mentora-security-'));
  server = startServer(); await waitForServer();
});

after(async () => { server?.kill(); await rm(dataDir, { recursive: true, force: true }); });

test('anonymous state access is denied', async () => {
  const { response } = await request('/api/state');
  assert.equal(response.status, 401);
});

test('registration uses a server token and scrypt password hash', async () => {
  const { response, body } = await request('/api/register', { method: 'POST', body: JSON.stringify({ name: 'Alice', email: 'alice@example.test', password: 'correct horse battery staple' }) });
  assert.equal(response.status, 201); assert.ok(body.token); assert.ok(body.user.id);
  const stored = JSON.parse(await readFile(join(dataDir, 'mentora.json'), 'utf8'));
  assert.match(stored.users[0].passwordHash, /^scrypt\$/);
});

test('records are isolated between users and protected from IDOR', async () => {
  const alice = await request('/api/login', { method: 'POST', body: JSON.stringify({ email: 'alice@example.test', password: 'correct horse battery staple' }) });
  const bob = await request('/api/register', { method: 'POST', body: JSON.stringify({ name: 'Bob', email: 'bob@example.test', password: 'another secure password' }) });
  const created = await request('/api/syllabus', { method: 'POST', headers: auth(alice.body.token), body: JSON.stringify({ title: 'Private', topics: 'Only Alice' }) });
  assert.equal(created.response.status, 201);
  const bobState = await request('/api/state', { headers: auth(bob.body.token) });
  assert.equal(bobState.response.status, 200); assert.equal(bobState.body.syllabi.length, 0); assert.equal(bobState.body.library.length, 0);
  const session = await request('/api/sessions/start', { method: 'POST', headers: auth(alice.body.token), body: JSON.stringify({ subject: 'Private session' }) });
  const forgedStop = await request('/api/sessions/stop', { method: 'POST', headers: auth(bob.body.token), body: JSON.stringify({ id: session.body.id }) });
  assert.equal(forgedStop.response.status, 404);
});

test('library search, download, and delete enforce ownership', async () => {
  const alice = await request('/api/login', { method: 'POST', body: JSON.stringify({ email: 'alice@example.test', password: 'correct horse battery staple' }) });
  const bob = await request('/api/login', { method: 'POST', body: JSON.stringify({ email: 'bob@example.test', password: 'another secure password' }) });
  const created = await request('/api/library/upload', { method: 'POST', headers: auth(alice.body.token), body: JSON.stringify({ name: 'private.txt', mimeType: 'text/plain', content: 'data:text/plain;base64,c2Vuc2l0aXZl' }) });
  assert.equal(created.response.status, 201); assert.equal(created.body.storagePath, undefined);
  const bobSearch = await request('/api/library/search', { method: 'POST', headers: auth(bob.body.token), body: JSON.stringify({ query: 'sensitive' }) });
  assert.deepEqual(bobSearch.body, []);
  const aliceSearch = await request('/api/library/search', { method: 'POST', headers: auth(alice.body.token), body: JSON.stringify({ query: 'sensitive' }) });
  assert.equal(aliceSearch.body.length, 1); assert.match(aliceSearch.body[0].snippet, /sensitive/);
  const bobDownload = await request(`/api/library/download/${created.body.id}`, { headers: auth(bob.body.token) });
  assert.equal(bobDownload.response.status, 404);
  const aliceDownload = await request(`/api/library/download/${created.body.id}`, { headers: auth(alice.body.token) });
  assert.equal(aliceDownload.response.status, 200); assert.equal(aliceDownload.body, 'sensitive');
  assert.equal((await request('/api/library/delete', { method: 'POST', headers: auth(alice.body.token), body: JSON.stringify({ id: created.body.id }) })).response.status, 204);
});

test('logout invalidates the server token', async () => {
  const login = await request('/api/login', { method: 'POST', body: JSON.stringify({ email: 'alice@example.test', password: 'correct horse battery staple' }) });
  assert.equal((await request('/api/state', { headers: auth(login.body.token) })).response.status, 200);
  assert.equal((await request('/api/logout', { method: 'POST', headers: auth(login.body.token) })).response.status, 204);
  assert.equal((await request('/api/state', { headers: auth(login.body.token) })).response.status, 401);
});

test('session remains valid across a server restart', async () => {
  const login = await request('/api/login', { method: 'POST', body: JSON.stringify({ email: 'alice@example.test', password: 'correct horse battery staple' }) });
  assert.equal((await request('/api/state', { headers: auth(login.body.token) })).response.status, 200);
  await new Promise(resolve => { server.once('exit', resolve); server.kill(); });
  server = startServer(); await waitForServer();
  assert.equal((await request('/api/state', { headers: auth(login.body.token) })).response.status, 200);
});

test('TXT syllabus ingestion extracts owned source lines without fabricating content', async () => {
  const alice = await request('/api/login', { method: 'POST', body: JSON.stringify({ email: 'alice@example.test', password: 'correct horse battery staple' }) });
  const syllabus = await request('/api/syllabus/upload', { method: 'POST', headers: auth(alice.body.token), body: JSON.stringify({ name: 'Networks.txt', mimeType: 'text/plain', content: 'data:text/plain;base64,LSBPU0kgTW9kZWwKMi4gVENQL0lQCnJvdXRpbmcgYmFzaWNz' }) });
  assert.equal(syllabus.response.status, 201); assert.deepEqual(syllabus.body.topics, ['OSI Model', 'TCP/IP', 'routing basics']);
  const found = await request('/api/retrieval/search', { method: 'POST', headers: auth(alice.body.token), body: JSON.stringify({ query: 'routing' }) });
  assert.equal(found.response.status, 200); assert.equal(found.body[0].citation.documentId, syllabus.body.documentId); assert.equal(found.body[0].citation.pageNumber, undefined);
  const bob = await request('/api/login', { method: 'POST', body: JSON.stringify({ email: 'bob@example.test', password: 'another secure password' }) });
  const hidden = await request('/api/retrieval/search', { method: 'POST', headers: auth(bob.body.token), body: JSON.stringify({ query: 'routing' }) });
  assert.deepEqual(hidden.body, []);
});

test('tutor reports provider availability honestly and returns owned citations', async () => {
  const alice = await request('/api/login', { method: 'POST', body: JSON.stringify({ email: 'alice@example.test', password: 'correct horse battery staple' }) });
  const tutor = await request('/api/tutor', { method: 'POST', headers: auth(alice.body.token), body: JSON.stringify({ topic: 'routing' }) });
  assert.equal(tutor.response.status, 200); assert.equal(tutor.body.provider, 'unavailable'); assert.ok(Array.isArray(tutor.body.citations));
});

test('activity correction and deletion remain owner-scoped', async () => {
  const alice = await request('/api/login', { method: 'POST', body: JSON.stringify({ email: 'alice@example.test', password: 'correct horse battery staple' }) });
  const session = await request('/api/sessions/start', { method: 'POST', headers: auth(alice.body.token), body: JSON.stringify({ subject: 'Monitor test' }) });
  const event = await request('/api/activity', { method: 'POST', headers: auth(alice.body.token), body: JSON.stringify({ sessionId: session.body.id, type: 'face_presence', confidence: 0.8 }) });
  const corrected = await request('/api/activity/correct', { method: 'POST', headers: auth(alice.body.token), body: JSON.stringify({ id: event.body.id, type: 'manual_correction', confidence: 1 }) });
  assert.equal(corrected.body.type, 'manual_correction'); assert.equal(corrected.body.confidence, 1);
  const bob = await request('/api/login', { method: 'POST', body: JSON.stringify({ email: 'bob@example.test', password: 'another secure password' }) });
  assert.equal((await request('/api/activity/correct', { method: 'POST', headers: auth(bob.body.token), body: JSON.stringify({ id: event.body.id, type: 'forged' }) })).response.status, 404);
  assert.equal((await request('/api/activity/delete', { method: 'POST', headers: auth(alice.body.token), body: JSON.stringify({ sessionId: session.body.id }) })).body.deleted, 1);
});

test('analytics derives measured history without classifying unknown time as distraction', async () => {
  const alice = await request('/api/login', { method: 'POST', body: JSON.stringify({ email: 'alice@example.test', password: 'correct horse battery staple' }) });
  const analytics = await request('/api/analytics', { headers: auth(alice.body.token) });
  assert.equal(analytics.response.status, 200); assert.equal(typeof analytics.body.measuredMinutes, 'number'); assert.equal(analytics.body.estimatedFocusMinutes, null); assert.equal(analytics.body.unknownMinutes, null); assert.match(analytics.body.note, /not classified as distraction/);
});

test('warning preferences persist and remain isolated per student', async () => {
  const alice = await request('/api/login', { method: 'POST', body: JSON.stringify({ email: 'alice@example.test', password: 'correct horse battery staple' }) });
  const saved = await request('/api/warnings/preferences', { method: 'POST', headers: auth(alice.body.token), body: JSON.stringify({ gracePeriodSeconds: 8, sound: 'chime', volume: 0.2, muted: true, cooldownSeconds: 30, sensitivity: 0.9 }) });
  assert.equal(saved.response.status, 200); assert.equal(saved.body.gracePeriodSeconds, 8); assert.equal(saved.body.muted, true);
  const bob = await request('/api/login', { method: 'POST', body: JSON.stringify({ email: 'bob@example.test', password: 'another secure password' }) });
  const bobPrefs = await request('/api/warnings/preferences', { headers: auth(bob.body.token) }); assert.equal(bobPrefs.body.gracePeriodSeconds, 3); assert.notEqual(bobPrefs.body.sound, 'chime');
  const restored = await request('/api/warnings/preferences', { headers: auth(alice.body.token) }); assert.equal(restored.body.cooldownSeconds, 30);
});

test('library folders and metadata remain owner-scoped', async () => {
  const alice = await request('/api/login', { method: 'POST', body: JSON.stringify({ email: 'alice@example.test', password: 'correct horse battery staple' }) });
  const folder = await request('/api/library/folders', { method: 'POST', headers: auth(alice.body.token), body: JSON.stringify({ name: 'Course Notes' }) });
  const nested = await request('/api/library/folders', { method: 'POST', headers: auth(alice.body.token), body: JSON.stringify({ name: 'Networks', parentId: folder.body.id }) });
  const note = await request('/api/library', { method: 'POST', headers: auth(alice.body.token), body: JSON.stringify({ name: 'OSI.md', size: 20, folderId: nested.body.id, subject: 'Networks' }) });
  assert.equal(note.body.folderId, nested.body.id); assert.equal(note.body.subject, 'Networks');
  const bob = await request('/api/login', { method: 'POST', body: JSON.stringify({ email: 'bob@example.test', password: 'another secure password' }) });
  assert.equal((await request('/api/library/move', { method: 'POST', headers: auth(bob.body.token), body: JSON.stringify({ id: note.body.id, folderId: undefined }) })).response.status, 404);
  assert.equal((await request('/api/library/folders/delete', { method: 'POST', headers: auth(alice.body.token), body: JSON.stringify({ id: folder.body.id }) })).response.status, 409);
  assert.equal((await request('/api/library/rename', { method: 'POST', headers: auth(alice.body.token), body: JSON.stringify({ id: note.body.id, name: 'OSI-renamed.md' }) })).body.name, 'OSI-renamed.md');
});
