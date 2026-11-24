import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { Buffer } from "node:buffer";
import { fileURLToPath } from "node:url";
import { DocumentExtractionError, extractDocument, type SourceSegment } from "./extraction.js";
import { createVectorIndex, retrieve, type VectorIndexEntry } from "./retrieval.js";
import { resolveEnvironment } from "./environment.js";
import { getWeather } from "./weather.js";

type User = { id: string; name: string; email: string; passwordHash: string; createdAt: string };
type StudySession = { id: string; ownerId?: string; subject: string; startedAt: string; endedAt?: string; durationMinutes?: number };
type Syllabus = { id: string; ownerId?: string; documentId?: string; title: string; topics: string[]; createdAt: string };
type LibraryFolder = { id: string; ownerId: string; name: string; parentId?: string; createdAt: string };
type LibraryFile = { id: string; ownerId?: string; name: string; size: number; addedAt: string; mimeType?: string; storagePath?: string; folderId?: string; subject?: string };
type ActivityEvent = { id: string; ownerId?: string; sessionId: string; type: string; confidence: number; timestamp: string };
type AuthSession = { tokenHash: string; userId: string; createdAt: string; expiresAt: number; revokedAt?: string };
type WarningPreferences = { userId: string; gracePeriodSeconds: number; sound: string; volume: number; muted: boolean; cooldownSeconds: number; sensitivity: number; updatedAt: string };
type ExtractedDocument = { documentId: string; ownerId: string; originalFilename: string; documentType: SourceSegment["documentType"]; segments: SourceSegment[]; vectorIndex?: VectorIndexEntry[]; createdAt: string };
type Store = { users: User[]; sessions: StudySession[]; syllabi: Syllabus[]; library: LibraryFile[]; folders: LibraryFolder[]; activityEvents: ActivityEvent[]; authSessions: AuthSession[]; extractedDocuments: ExtractedDocument[]; warningPreferences: WarningPreferences[] };
type Auth = { user: User; token: string; session: AuthSession };

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const publicDir = join(root, "public");
const dataDir = process.env.MENTORA_DATA_DIR ? resolve(process.env.MENTORA_DATA_DIR) : join(root, "data");
const dataFile = join(dataDir, "mentora.json");
mkdirSync(dataDir, { recursive: true });

const initial: Store = { users: [], sessions: [], syllabi: [], library: [], folders: [], activityEvents: [], authSessions: [], extractedDocuments: [], warningPreferences: [] };
let store: Store = existsSync(dataFile) ? JSON.parse(readFileSync(dataFile, "utf8")) as Store : initial;
store.users ??= []; store.sessions ??= []; store.syllabi ??= []; store.library ??= []; store.folders ??= []; store.activityEvents ??= []; store.authSessions ??= []; store.extractedDocuments ??= []; store.warningPreferences ??= [];
const save = () => writeFileSync(dataFile, JSON.stringify(store, null, 2), "utf8");
const legacyHash = (value: string) => createHash("sha256").update(value).digest("hex");
const passwordHash = (value: string) => {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(value, salt, 64).toString("hex")}`;
};
const verifyPassword = (value: string, stored: string) => {
  if (stored.startsWith("scrypt$")) {
    const [, salt, digest] = stored.split("$");
    if (!salt || !digest) return false;
    const actual = scryptSync(value, salt, 64);
    const expected = Buffer.from(digest, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
  return stored === legacyHash(value);
};
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const issueToken = (userId: string) => { const token = randomBytes(32).toString("base64url"); const session: AuthSession = { tokenHash: tokenHash(token), userId, createdAt: new Date().toISOString(), expiresAt: Date.now() + 8 * 60 * 60 * 1000 }; store.authSessions.push(session); save(); return token; };
const auth = (req: IncomingMessage): Auth | null => {
  const value = String(req.headers.authorization ?? "");
  if (!value.startsWith("Bearer ")) return null;
  const token = value.slice(7); const session = store.authSessions.find((item) => item.tokenHash === tokenHash(token) && !item.revokedAt);
  if (!session || session.expiresAt <= Date.now()) return null;
  const user = store.users.find((item) => item.id === session.userId);
  return user ? { user, token, session } : null;
};
const send = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "no-referrer" });
  res.end(status === 204 ? undefined : JSON.stringify(body));
};
const readBody = async (req: IncomingMessage) => {
  const declared = Number(req.headers["content-length"] ?? 0);
  if (declared > 12 * 1024 * 1024) throw new Error("Request body is too large.");
  let body = "";
  for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > 12 * 1024 * 1024) throw new Error("Request body is too large."); }
  return body ? JSON.parse(body) as Record<string, string> : {};
};
const publicUser = (user: User) => ({ id: user.id, name: user.name, email: user.email });
const publicFile = (file: LibraryFile) => ({ id: file.id, name: file.name, size: file.size, addedAt: file.addedAt, mimeType: file.mimeType, folderId: file.folderId, subject: file.subject });
const publicFolder = (folder: LibraryFolder) => ({ id: folder.id, name: folder.name, parentId: folder.parentId, createdAt: folder.createdAt });
const publicExtractedDocument = (document: ExtractedDocument) => ({ documentId: document.documentId, ownerId: document.ownerId, originalFilename: document.originalFilename, documentType: document.documentType, segments: document.segments, createdAt: document.createdAt });
const textContent = (file: LibraryFile) => file.storagePath && (file.mimeType === "text/plain" || file.mimeType === "text/markdown") && existsSync(file.storagePath) ? readFileSync(file.storagePath, "utf8").slice(0, 100_000) : "";
const defaultWarningPreferences = (userId: string): WarningPreferences => ({ userId, gracePeriodSeconds: 3, sound: "beep", volume: 0.04, muted: false, cooldownSeconds: 15, sensitivity: 0.7, updatedAt: new Date().toISOString() });
const attempts = new Map<string, { count: number; resetAt: number }>();
const rateLimited = (req: IncomingMessage) => {
  const key = req.socket.remoteAddress ?? "unknown"; const now = Date.now(); const current = attempts.get(key);
  if (!current || current.resetAt <= now) { attempts.set(key, { count: 1, resetAt: now + 60_000 }); return false; }
  current.count += 1; return current.count > 10;
};
const ownerFromLegacyId = (id: string) => store.users.find((user) => id.startsWith(user.id.slice(0, 8)))?.id;
for (const session of store.sessions) session.ownerId ??= ownerFromLegacyId(session.id);
for (const event of store.activityEvents) event.ownerId ??= store.sessions.find((session) => session.id === event.sessionId)?.ownerId;

async function api(req: IncomingMessage, res: ServerResponse, pathname: string) {
  if (req.method === "OPTIONS") return send(res, 204, {});
  if ((pathname === "/api/register" || pathname === "/api/login") && rateLimited(req)) return send(res, 429, { error: "Too many attempts. Try again later." });
  if (req.method === "POST" && pathname === "/api/register") {
    const body = await readBody(req); const name = String(body.name ?? "").trim(); const email = String(body.email ?? "").trim().toLowerCase(); const password = String(body.password ?? "");
    if (name.length < 1 || name.length > 100 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || password.length > 200) return send(res, 400, { error: "Name, valid email and an 8-200 character password are required." });
    if (store.users.some((user) => user.email === email)) return send(res, 409, { error: "An account with this email already exists." });
    const user: User = { id: randomUUID(), name, email, passwordHash: passwordHash(password), createdAt: new Date().toISOString() }; store.users.push(user); save();
    return send(res, 201, { user: publicUser(user), token: issueToken(user.id) });
  }
  if (req.method === "POST" && pathname === "/api/login") {
    const body = await readBody(req); const email = String(body.email ?? "").trim().toLowerCase(); const password = String(body.password ?? ""); const user = store.users.find((item) => item.email === email);
    if (!user || !verifyPassword(password, user.passwordHash)) return send(res, 401, { error: "Invalid email or password." });
    if (!user.passwordHash.startsWith("scrypt$")) { user.passwordHash = passwordHash(password); save(); }
    return send(res, 200, { user: publicUser(user), token: issueToken(user.id) });
  }
  const sessionAuth = auth(req);
  if (req.method === "POST" && pathname === "/api/logout") { if (sessionAuth) { sessionAuth.session.revokedAt = new Date().toISOString(); save(); } return send(res, 204, {}); }
  if (!sessionAuth) return send(res, 401, { error: "Please sign in first." });
  const userId = sessionAuth.user.id;
  if (req.method === "GET" && pathname === "/api/environment") { const weather = await getWeather("default"); return send(res, 200, resolveEnvironment({ weather: weather.condition, mode: "explore" })); }
  if (req.method === "POST" && pathname === "/api/environment") { const body = await readBody(req); const weather = await getWeather(String(body.location ?? "default")); return send(res, 200, { ...resolveEnvironment({ weather: weather.condition, festivalOverride: body.festivalOverride, mode: body.mode === "focus" ? "focus" : "explore" }), weatherStatus: weather.status, temperatureC: weather.temperatureC, location: weather.location }); }
  if (req.method === "GET" && pathname === "/api/warnings/preferences") return send(res, 200, store.warningPreferences.find((item) => item.userId === userId) ?? defaultWarningPreferences(userId));
  if (req.method === "POST" && pathname === "/api/warnings/preferences") { const body = await readBody(req); const existing = store.warningPreferences.find((item) => item.userId === userId) ?? defaultWarningPreferences(userId); const sound = String(body.sound ?? existing.sound).slice(0, 50); if (!/^[a-zA-Z0-9 _-]+$/.test(sound)) return send(res, 400, { error: "Warning sound name is invalid." }); const next: WarningPreferences = { userId, gracePeriodSeconds: Math.max(1, Math.min(60, Number(body.gracePeriodSeconds ?? existing.gracePeriodSeconds))), sound, volume: Math.max(0, Math.min(1, Number(body.volume ?? existing.volume))), muted: body.muted === undefined ? existing.muted : String(body.muted) === "true", cooldownSeconds: Math.max(5, Math.min(300, Number(body.cooldownSeconds ?? existing.cooldownSeconds))), sensitivity: Math.max(0, Math.min(1, Number(body.sensitivity ?? existing.sensitivity))), updatedAt: new Date().toISOString() }; const index = store.warningPreferences.findIndex((item) => item.userId === userId); if (index >= 0) store.warningPreferences[index] = next; else store.warningPreferences.push(next); save(); return send(res, 200, next); }
  if (req.method === "GET" && pathname === "/api/state") return send(res, 200, {
    user: publicUser(sessionAuth.user), sessions: store.sessions.filter((item) => item.ownerId === userId), folders: store.folders.filter((item) => item.ownerId === userId).map(publicFolder),
    syllabi: store.syllabi.filter((item) => item.ownerId === userId), library: store.library.filter((item) => item.ownerId === userId).map(publicFile),
    activityEvents: store.activityEvents.filter((item) => item.ownerId === userId), extractedDocuments: store.extractedDocuments.filter((item) => item.ownerId === userId).map(publicExtractedDocument)
  });
  if (req.method === "GET" && pathname === "/api/analytics") {
    const sessions = store.sessions.filter((item) => item.ownerId === userId); const events = store.activityEvents.filter((item) => item.ownerId === userId); const completed = sessions.filter((item) => item.endedAt); const bySubject = Object.fromEntries(completed.reduce((map, item) => map.set(item.subject, (map.get(item.subject) ?? 0) + (item.durationMinutes ?? 0)), new Map<string, number>())); const daily = Object.fromEntries(completed.reduce((map, item) => { const day = item.startedAt.slice(0, 10); map.set(day, (map.get(day) ?? 0) + (item.durationMinutes ?? 0)); return map; }, new Map<string, number>())); const activeDays = Object.keys(daily).sort(); let streak = 0; for (let index = activeDays.length - 1; index >= 0; index -= 1) { if (index === activeDays.length - 1 || Date.parse(activeDays[index + 1]) - Date.parse(activeDays[index]) === 86_400_000) streak += 1; else break; } return send(res, 200, { measuredMinutes: completed.reduce((sum, item) => sum + (item.durationMinutes ?? 0), 0), estimatedFocusMinutes: null, unknownMinutes: null, bySubject, daily, streak, sessions: sessions.length, completedSessions: completed.length, awayEvents: events.filter((item) => item.type === "away_from_window").length, note: "Unknown time is not classified as distraction." });
  }
  if (req.method === "POST" && pathname === "/api/sessions/start") {
    const body = await readBody(req); const subject = String(body.subject ?? "General Study").trim().slice(0, 200) || "General Study";
    const session: StudySession = { id: randomUUID(), ownerId: userId, subject, startedAt: new Date().toISOString() }; store.sessions.push(session); save(); return send(res, 201, session);
  }
  if (req.method === "POST" && pathname === "/api/sessions/stop") {
    const body = await readBody(req); const session = store.sessions.find((item) => item.id === body.id && item.ownerId === userId && !item.endedAt);
    if (!session) return send(res, 404, { error: "Active session not found." }); session.endedAt = new Date().toISOString(); session.durationMinutes = Math.max(1, Math.round((Date.parse(session.endedAt) - Date.parse(session.startedAt)) / 60000)); save(); return send(res, 200, session);
  }
  if (req.method === "POST" && pathname === "/api/syllabus") {
    const body = await readBody(req); const title = String(body.title ?? "My Syllabus").trim().slice(0, 200) || "My Syllabus"; const topics = String(body.topics ?? "").split(",").map((item) => item.trim().slice(0, 200)).filter(Boolean).slice(0, 500);
    if (!topics.length) return send(res, 400, { error: "At least one topic is required." }); const syllabus: Syllabus = { id: randomUUID(), ownerId: userId, title, topics, createdAt: new Date().toISOString() }; store.syllabi.push(syllabus); save(); return send(res, 201, syllabus);
  }
  if (req.method === "POST" && pathname === "/api/syllabus/upload") {
    const body = await readBody(req); const allowed = ["text/plain", "text/markdown", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.presentationml.presentation"];
    if (!body.name || !body.content || !allowed.includes(body.mimeType ?? "")) return send(res, 400, { error: "A supported TXT, Markdown, PDF, DOCX or PPTX syllabus is required." });
    const raw = String(body.content).replace(/^data:[^;]+;base64,/, ""); const bytes = Buffer.from(raw, "base64"); if (!bytes.byteLength || bytes.byteLength > 10 * 1024 * 1024) return send(res, 413, { error: "Syllabus must be between 1 byte and 10 MB." });
    try { const documentId = randomUUID(); const segments = await extractDocument({ documentId, originalFilename: String(body.name).slice(0, 255), mimeType: body.mimeType, buffer: bytes }); const topics = segments.map((item) => item.sourceText).slice(0, 500); if (!topics.length) return send(res, 422, { error: "No readable source content was found." }); const syllabus: Syllabus = { id: randomUUID(), ownerId: userId, documentId, title: String(body.name).slice(0, 200), topics, createdAt: new Date().toISOString() }; store.syllabi.push(syllabus); store.extractedDocuments.push({ documentId, ownerId: userId, originalFilename: String(body.name).slice(0, 255), documentType: segments[0].documentType, segments, vectorIndex: createVectorIndex(segments), createdAt: new Date().toISOString() }); save(); return send(res, 201, syllabus); } catch (error) { if (error instanceof DocumentExtractionError) return send(res, 422, { error: error.message, code: error.code }); throw error; }
  }
  if (req.method === "POST" && pathname === "/api/library") {
    const body = await readBody(req); const name = String(body.name ?? "Untitled note").trim().slice(0, 255) || "Untitled note"; const size = Math.max(0, Math.min(10 * 1024 * 1024, Number(body.size ?? 0))); const folderId = body.folderId ? String(body.folderId) : undefined; if (folderId && !store.folders.some((folder) => folder.id === folderId && folder.ownerId === userId)) return send(res, 404, { error: "Folder not found." }); const file: LibraryFile = { id: randomUUID(), ownerId: userId, name, size, folderId, subject: body.subject?.slice(0, 200), addedAt: new Date().toISOString() }; store.library.push(file); save(); return send(res, 201, publicFile(file));
  }
  if (req.method === "POST" && pathname === "/api/library/folders") { const body = await readBody(req); const name = String(body.name ?? "").trim().slice(0, 100); const parentId = body.parentId ? String(body.parentId) : undefined; if (!name) return send(res, 400, { error: "Folder name is required." }); if (parentId && !store.folders.some((folder) => folder.id === parentId && folder.ownerId === userId)) return send(res, 404, { error: "Parent folder not found." }); const folder: LibraryFolder = { id: randomUUID(), ownerId: userId, name, parentId, createdAt: new Date().toISOString() }; store.folders.push(folder); save(); return send(res, 201, publicFolder(folder)); }
  if (req.method === "POST" && pathname === "/api/library/folders/rename") { const body = await readBody(req); const folder = store.folders.find((item) => item.id === body.id && item.ownerId === userId); const name = String(body.name ?? "").trim().slice(0, 100); if (!folder || !name) return send(res, 404, { error: "Folder not found or name is invalid." }); folder.name = name; save(); return send(res, 200, publicFolder(folder)); }
  if (req.method === "POST" && pathname === "/api/library/folders/delete") { const body = await readBody(req); const folder = store.folders.find((item) => item.id === body.id && item.ownerId === userId); if (!folder) return send(res, 404, { error: "Folder not found." }); if (store.folders.some((item) => item.parentId === folder.id && item.ownerId === userId) || store.library.some((item) => item.folderId === folder.id && item.ownerId === userId)) return send(res, 409, { error: "Folder must be empty before deletion." }); store.folders = store.folders.filter((item) => item.id !== folder.id); save(); return send(res, 204, {}); }
  if (req.method === "POST" && pathname === "/api/library/rename") { const body = await readBody(req); const file = store.library.find((item) => item.id === body.id && item.ownerId === userId); const name = String(body.name ?? "").trim().slice(0, 255); if (!file || !name) return send(res, 404, { error: "Library file not found or name is invalid." }); file.name = name; if (body.subject !== undefined) file.subject = String(body.subject).slice(0, 200); save(); return send(res, 200, publicFile(file)); }
  if (req.method === "POST" && pathname === "/api/library/move") { const body = await readBody(req); const file = store.library.find((item) => item.id === body.id && item.ownerId === userId); const folderId = body.folderId ? String(body.folderId) : undefined; if (!file || (folderId && !store.folders.some((folder) => folder.id === folderId && folder.ownerId === userId))) return send(res, 404, { error: "File or destination folder not found." }); file.folderId = folderId; save(); return send(res, 200, publicFile(file)); }
  if (req.method === "GET" && pathname === "/api/library/quota") { const usedBytes = store.library.filter((file) => file.ownerId === userId).reduce((sum, file) => sum + file.size, 0); return send(res, 200, { usedBytes, limitBytes: 100 * 1024 * 1024, availableBytes: 100 * 1024 * 1024 - usedBytes }); }
  if (req.method === "POST" && pathname === "/api/library/search") {
    const body = await readBody(req); const query = String(body.query ?? "").trim().toLowerCase(); return send(res, 200, store.library.filter((file) => { const content = textContent(file).toLowerCase(); return file.ownerId === userId && (!query || file.name.toLowerCase().includes(query) || content.includes(query)); }).map((file) => ({ ...publicFile(file), snippet: textContent(file).slice(0, 500) })));
  }
  if (req.method === "POST" && pathname === "/api/retrieval/search") {
    const body = await readBody(req); const query = String(body.query ?? "").trim(); if (!query) return send(res, 400, { error: "A retrieval query is required." }); const limit = Number(body.limit ?? 5); const documents = store.extractedDocuments.filter((document) => document.ownerId === userId); const results = documents.flatMap((document) => retrieve(document.segments, document.vectorIndex, query, limit)).sort((a, b) => b.score - a.score).slice(0, Math.max(1, Math.min(limit, 20))); return send(res, 200, results.map((result) => ({ score: Number(result.score.toFixed(4)), citation: result.segment })));
  }
  if (req.method === "GET" && pathname.startsWith("/api/library/sources/")) {
    const documentId = pathname.slice("/api/library/sources/".length); const document = store.extractedDocuments.find((item) => item.documentId === documentId && item.ownerId === userId); if (!document) return send(res, 404, { error: "Extracted document not found." }); return send(res, 200, publicExtractedDocument(document));
  }
  if (req.method === "POST" && pathname === "/api/library/delete") {
    const body = await readBody(req); const index = store.library.findIndex((file) => file.id === body.id && file.ownerId === userId); if (index < 0) return send(res, 404, { error: "Library file not found." }); const [file] = store.library.splice(index, 1); store.extractedDocuments = store.extractedDocuments.filter((document) => document.documentId !== file.id || document.ownerId !== userId); if (file.storagePath && existsSync(file.storagePath)) unlinkSync(file.storagePath); save(); return send(res, 204, {});
  }
  if (req.method === "GET" && pathname.startsWith("/api/library/download/")) {
    const id = pathname.slice("/api/library/download/".length); const file = store.library.find((item) => item.id === id && item.ownerId === userId); if (!file || !file.storagePath || !existsSync(file.storagePath)) return send(res, 404, { error: "Library file not found." });
    res.writeHead(200, { "Content-Type": file.mimeType ?? "application/octet-stream", "Content-Disposition": `attachment; filename="${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}"`, "X-Content-Type-Options": "nosniff" }); return res.end(readFileSync(file.storagePath));
  }
  if (req.method === "POST" && pathname === "/api/library/upload") {
    const body = await readBody(req); const allowed = ["application/pdf", "text/plain", "text/markdown", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.presentationml.presentation"];
    if (!body.name || !body.content || !allowed.includes(body.mimeType ?? "")) return send(res, 400, { error: "Supported file name, type and content are required." });
    const raw = body.content.replace(/^data:[^;]+;base64,/, ""); const bytes = Buffer.from(raw, "base64"); if (!bytes.byteLength || bytes.byteLength > 10 * 1024 * 1024) return send(res, 413, { error: "Document must be between 1 byte and 10 MB." });
    const safeName = String(body.name).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 255); const uploadDir = join(dataDir, "uploads"); mkdirSync(uploadDir, { recursive: true }); const storagePath = join(uploadDir, `${randomUUID()}-${safeName}`); writeFileSync(storagePath, bytes);
    const folderId = body.folderId ? String(body.folderId) : undefined; if (folderId && !store.folders.some((folder) => folder.id === folderId && folder.ownerId === userId)) { unlinkSync(storagePath); return send(res, 404, { error: "Folder not found." }); } const usedBytes = store.library.filter((item) => item.ownerId === userId).reduce((sum, item) => sum + item.size, 0); if (usedBytes + bytes.byteLength > 100 * 1024 * 1024) { unlinkSync(storagePath); return send(res, 413, { error: "Personal library storage quota exceeded." }); }
    const file: LibraryFile = { id: randomUUID(), ownerId: userId, name: String(body.name).slice(0, 255), size: bytes.byteLength, mimeType: body.mimeType, storagePath, folderId, subject: body.subject?.slice(0, 200), addedAt: new Date().toISOString() };
    try { const segments = await extractDocument({ documentId: file.id, originalFilename: file.name, mimeType: file.mimeType ?? "", buffer: bytes }); store.library.push(file); store.extractedDocuments.push({ documentId: file.id, ownerId: userId, originalFilename: file.name, documentType: segments[0].documentType, segments, vectorIndex: createVectorIndex(segments), createdAt: new Date().toISOString() }); save(); return send(res, 201, { ...publicFile(file), extraction: { status: "ready", segmentCount: segments.length } }); } catch (error) { if (existsSync(storagePath)) unlinkSync(storagePath); if (error instanceof DocumentExtractionError) return send(res, 422, { error: error.message, code: error.code }); throw error; }
  }
  if (req.method === "POST" && pathname === "/api/activity") {
    const body = await readBody(req); const target = store.sessions.find((item) => item.id === body.sessionId && item.ownerId === userId); if (!target || !body.type) return send(res, 400, { error: "Owned session and event type are required." });
    const event: ActivityEvent = { id: randomUUID(), ownerId: userId, sessionId: target.id, type: String(body.type).slice(0, 100), confidence: Math.max(0, Math.min(1, Number(body.confidence ?? 0))), timestamp: new Date().toISOString() }; store.activityEvents.push(event); save(); return send(res, 201, event);
  }
  if (req.method === "POST" && pathname === "/api/activity/correct") {
    const body = await readBody(req); const event = store.activityEvents.find((item) => item.id === body.id && item.ownerId === userId); if (!event) return send(res, 404, { error: "Activity event not found." }); event.type = String(body.type ?? event.type).slice(0, 100); if (body.confidence !== undefined) event.confidence = Math.max(0, Math.min(1, Number(body.confidence))); save(); return send(res, 200, event);
  }
  if (req.method === "POST" && pathname === "/api/activity/delete") {
    const body = await readBody(req); const before = store.activityEvents.length; store.activityEvents = store.activityEvents.filter((item) => !(item.ownerId === userId && (!body.sessionId || item.sessionId === body.sessionId))); save(); return send(res, 200, { deleted: before - store.activityEvents.length });
  }
  if (req.method === "POST" && pathname === "/api/tutor") {
    const body = await readBody(req); const topic = String(body.topic ?? "your topic").trim().slice(0, 300) || "your topic"; const style = String(body.style ?? "Simple explanation").slice(0, 100); const retrieved = store.extractedDocuments.filter((document) => document.ownerId === userId).flatMap((document) => retrieve(document.segments, document.vectorIndex, topic, 3)).sort((a, b) => b.score - a.score).slice(0, 3); const citations = retrieved.map((item) => item.segment);
    const ollamaUrl = String(process.env.MENTORA_OLLAMA_URL ?? "").replace(/\/$/, ""); const model = String(process.env.MENTORA_OLLAMA_MODEL ?? "llama3.2:3b");
    if (ollamaUrl) { try { const response = await fetch(`${ollamaUrl}/api/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model, stream: false, prompt: `You are MENTORA, a careful tutor. Answer in ${style}. Use only the supplied source context when it is relevant. If context is insufficient, say so. Topic: ${topic}\nSource context:\n${citations.map((item) => `[${item.chunkId}] ${item.sourceText}`).join("\n")}` }), signal: AbortSignal.timeout(15_000) }); if (response.ok) { const result = await response.json() as { response?: string }; if (result.response) return send(res, 200, { answer: result.response, provider: "ollama", citations }); } } catch { /* Provider outages are surfaced as an honest fallback below. */ } }
    return send(res, 200, { answer: ollamaUrl ? "The configured local AI provider is unavailable right now. Your retrieved source context is available; try again when Ollama is running." : "No local AI provider is configured. Configure MENTORA_OLLAMA_URL to enable grounded tutor responses.", provider: "unavailable", citations });
  }
  return send(res, 404, { error: "Route not found." });
}

const mime: Record<string, string> = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml" };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname.startsWith("/api/")) return await api(req, res, url.pathname);
    if (url.pathname === "/favicon.ico") { res.writeHead(204); return res.end(); }
    if (url.pathname === "/reports/project-audit.json") { const report = join(root, "reports", "project-audit.json"); if (!existsSync(report)) return send(res, 404, { error: "Audit report not found." }); res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" }); return res.end(readFileSync(report)); }
    const requested = url.pathname === "/" ? "/index.html" : url.pathname; const file = normalize(join(publicDir, requested));
    if (!file.startsWith(publicDir) || !existsSync(file)) return send(res, 404, { error: "Page not found." });
    res.writeHead(200, { "Content-Type": mime[extname(file)] ?? "application/octet-stream" }); res.end(readFileSync(file));
  } catch (error) { send(res, error instanceof Error && error.message === "Request body is too large." ? 413 : 400, { error: error instanceof Error ? error.message : "Invalid request." }); }
});
const port = Number(process.env.PORT || 4173);
server.listen(port, () => console.log(`MENTORA is running at http://localhost:${port}`));
