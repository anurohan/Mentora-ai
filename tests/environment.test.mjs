import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveEnvironment, supportedFestivals } from '../dist/environment.js';
import { getWeather } from '../dist/weather.js';

test('environment resolver is deterministic, offline-safe, and supports focus mode', () => {
  const state = resolveEnvironment({ now: new Date('2026-11-25T18:00:00'), festivalOverride: 'Diwali', mode: 'focus' });
  assert.equal(state.timeOfDay, 'evening'); assert.equal(state.season, 'autumn'); assert.equal(state.festival, 'Diwali'); assert.equal(state.theme, 'focus'); assert.equal(state.reducedMotion, true); assert.equal(state.weather, 'unknown'); assert.ok(supportedFestivals.includes('Pongal'));
});

test('weather adapter caches live data and falls back honestly on provider failure', async () => {
  let calls = 0; const fetchImpl = async () => { calls += 1; return { ok: true, json: async () => ({ current_weather: { weathercode: 0, temperature: 25 } }) }; };
  const live = await getWeather('Delhi', { providerUrl: 'https://weather.test/{location}', fetchImpl, now: 1000, ttlMs: 100 }); assert.equal(live.status, 'live'); assert.equal(live.condition, 'clear');
  const cached = await getWeather('Delhi', { providerUrl: 'https://weather.test/{location}', fetchImpl, now: 1050, ttlMs: 100 }); assert.equal(cached.status, 'cached'); assert.equal(calls, 1);
  const offline = await getWeather('Unknown', { providerUrl: 'https://weather.test/{location}', fetchImpl: async () => { throw new Error('offline'); }, now: 1000 }); assert.equal(offline.status, 'offline'); assert.equal(offline.condition, 'unknown');
});
