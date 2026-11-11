import { afterAll, beforeAll, expect, it } from 'vitest';
import { startServer } from '../../src/app.js';
import { createCertifiedBoard } from '../../src/rules.js';

let running: Awaited<ReturnType<typeof startServer>>;
beforeAll(async () => { running = await startServer(0); });
afterAll(async () => { await running?.server.gracefullyShutdown(false); });

const seed = 23;
const attemptId = '0123456789abcdef0123456789abcdef';
const { selection, cellIds } = createCertifiedBoard(seed).solution[0];
const postResult = (moves: unknown[]) => fetch(`${running.url}/solo-results`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ attemptId, seed, moves, score: 170 }),
});

it('derives a casual solo score from a legal replay and returns the same receipt on retry', async () => {
  for (let delivery = 0; delivery < 2; delivery++) {
    const response = await postResult([selection]);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ attemptId, score: cellIds.length });
  }
});

it('rejects a clear that reuses fruit and accepts a complete certificate', async () => {
  const invalid = await postResult([selection, selection]);
  expect(invalid.status).toBe(400);

  const certificate = createCertifiedBoard(seed).solution.map(step => step.selection);
  const complete = await postResult(certificate);
  expect(complete.status).toBe(200);
  expect(await complete.json()).toEqual({ attemptId, score: 170 });
});
