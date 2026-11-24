import assert from 'node:assert/strict';
import { test } from 'node:test';
import { enqueue, processQueue, resolveConflict } from '../dist/sync.js';

test('sync queue is idempotent, retryable, and conflict-safe', async () => {
  const queue = []; const first = enqueue(queue, { userId: 'a', key: 'file-1', action: 'upsert', payload: { name: 'one' } }); const second = enqueue(queue, { userId: 'a', key: 'file-1', action: 'upsert', payload: { name: 'two' } }); assert.equal(first.id, second.id); assert.equal(queue.length, 1); assert.equal(queue[0].payload.name, 'two');
  await processQueue(queue, async () => { throw new Error('offline'); }); assert.equal(queue[0].status, 'failed'); assert.equal(queue[0].attempts, 1); await processQueue(queue, async () => {}); assert.equal(queue[0].status, 'synced'); assert.equal(queue[0].attempts, 2);
  assert.equal(resolveConflict({ updatedAt: '2026-01-02T00:00:00Z', value: 'local' }, { updatedAt: '2026-01-01T00:00:00Z', value: 'remote' }).value, 'local');
});
