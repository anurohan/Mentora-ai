import assert from 'node:assert/strict';
import { test } from 'node:test';

await import('../public/animation-engine.js');
const engine = globalThis.MentoraAnimationEngine;

test('animation definitions validate and cover all required simulations', () => {
  assert.equal(engine.definitions.length, 10);
  for (const definition of engine.definitions) { assert.equal(engine.validate(definition), true); assert.ok(definition.frames.length > 1); }
  assert.deepEqual(engine.definitions.map(item => item.id), ['binary', 'bubble', 'merge', 'cpu', 'round-robin', 'fcfs', 'neural', 'tcp', 'circuit', 'math']);
});

test('animation controls produce deterministic forward/back/reset transitions', () => {
  for (const definition of engine.definitions) { const simulation = engine.create(definition.id); const initial = simulation.state; simulation.step(); assert.equal(simulation.state.index, 1); assert.notEqual(simulation.state.description, initial.description); simulation.back(); assert.equal(simulation.state.index, 0); simulation.setSpeed(99); simulation.setZoom(99); assert.equal(simulation.state.speed, 10); assert.equal(simulation.state.zoom, 2); simulation.reset(); assert.equal(simulation.state.index, 0); }
});
